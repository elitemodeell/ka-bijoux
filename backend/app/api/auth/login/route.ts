export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signCustomerToken } from "@/lib/auth";
import {
  createSupabasePasswordUser,
  isSupabaseAuthTransitionEnabled,
  sessionResponse,
  signInWithSupabasePassword,
  updateSupabasePassword,
} from "@/lib/supabase-auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

function publicCustomer(customer: { id: string; name: string; email: string; phone: string | null }) {
  return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone };
}

function isLegacyTestAccount(name: string, email: string) {
  return /(^|[+._-])(test|teste)([+._@-]|$)|@(example|test)\./i.test(email)
    || /\bteste?\b/i.test(name);
}

async function findCustomerByEmail(email: string) {
  return prisma.customer.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, active: true },
  });
}

async function finishSupabaseLogin(email: string, password: string) {
  const result = await signInWithSupabasePassword(email, password);
  if (result.error || !result.data.session || !result.data.user) return null;

  const customer = await prisma.customer.findFirst({
    where: {
      active: true,
      OR: [
        { authUserId: result.data.user.id },
        { email: { equals: email, mode: "insensitive" } },
      ],
    },
  });
  if (!customer) return null;
  if (customer.authUserId && customer.authUserId !== result.data.user.id) return null;
  if (!customer.authUserId && result.data.user.app_metadata?.customer_id !== customer.id) return null;

  if (!customer.authUserId) {
    const linked = await prisma.customer.updateMany({
      where: { id: customer.id, authUserId: null },
      data: { authUserId: result.data.user.id, authMigratedAt: new Date() },
    });
    if (linked.count !== 1) return null;
  }

  return {
    ...sessionResponse(result.data.session, result.data.user),
    customer: publicCustomer(customer),
    migratedFromLegacy: false,
  };
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMITS.auth);
  if (limited) return limited;

  try {
    const { email, password } = schema.parse(await req.json());

    if (isSupabaseAuthTransitionEnabled()) {
      const direct = await finishSupabaseLogin(email, password);
      if (direct) return apiSuccess(direct);
    }

    const customer = await findCustomerByEmail(email);
    if (!customer) return apiError("Credenciais inválidas.", 401);
    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) return apiError("Credenciais inválidas.", 401);

    if (isSupabaseAuthTransitionEnabled()) {
      let authUserId = customer.authUserId;
      if (authUserId) {
        await updateSupabasePassword(authUserId, password);
      } else {
        const created = await createSupabasePasswordUser({
          customerId: customer.id,
          email: customer.email,
          name: customer.name,
          password,
          // A senha bcrypt acabou de ser comprovada no sistema legado.
          emailConfirmed: true,
          legacyEmailVerificationInherited: true,
          isTestAccount: isLegacyTestAccount(customer.name, customer.email),
        });
        if (!created.error && created.data.user) {
          authUserId = created.data.user.id;
          await prisma.customer.updateMany({
            where: { id: customer.id, authUserId: null },
            data: { authUserId, authMigratedAt: new Date() },
          });
        }
      }

      if (authUserId) {
        const migrated = await finishSupabaseLogin(email, password);
        if (migrated) return apiSuccess({ ...migrated, migratedFromLegacy: true });
      }
    }

    // Fallback temporário: mantém a produção utilizável até o corte registrado.
    const token = signCustomerToken({ id: customer.id, email: customer.email, name: customer.name });
    return apiSuccess({ token, accessToken: token, customer: publicCustomer(customer), legacySession: true });
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    return apiError("Erro interno.", 500);
  }
}
