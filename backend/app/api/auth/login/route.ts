export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { signCustomerToken } from "@/lib/auth";
import {
  createSupabasePasswordUser,
  isSupabaseAuthTransitionEnabled,
  sessionResponse,
  signInWithSupabasePassword,
  updateSupabasePasswordUser,
} from "@/lib/supabase-auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

class SupabaseIdentityMismatchError extends Error {}
type LoginStage =
  | "rate_limit"
  | "request_parse"
  | "supabase_direct_sign_in"
  | "supabase_direct_customer_lookup"
  | "customer_lookup"
  | "password_verify"
  | "supabase_identity_sync"
  | "supabase_post_sync_sign_in"
  | "supabase_post_sync_customer_lookup"
  | "legacy_jwt";

function logLoginFailure(stage: LoginStage, error: unknown) {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  console.error("[auth-login] failure", {
    stage,
    name: error instanceof Error ? error.name : "UnknownError",
    code: typeof record.code === "string" ? record.code : undefined,
    status: typeof record.status === "number" ? record.status : undefined,
  });
}

function isTransientSupabaseError(error: unknown) {
  if (!isAuthRetryableFetchError(error)) return false;
  return [0, 408, 429, 500, 502, 503, 504].includes(error.status ?? 0);
}

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

async function finishSupabaseLogin(
  email: string,
  password: string,
  setStage: (stage: LoginStage) => void,
  stagePrefix: "supabase_direct" | "supabase_post_sync",
) {
  setStage(`${stagePrefix}_sign_in`);
  const result = await signInWithSupabasePassword(email, password);
  if (result.error || !result.data.session || !result.data.user) return null;

  setStage(`${stagePrefix}_customer_lookup`);
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
  if (result.data.user.app_metadata?.customer_id !== customer.id) {
    throw new SupabaseIdentityMismatchError();
  }

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

async function trySupabaseLogin(
  email: string,
  password: string,
  setStage: (stage: LoginStage) => void,
  stagePrefix: "supabase_direct" | "supabase_post_sync",
) {
  try {
    return await finishSupabaseLogin(email, password, setStage, stagePrefix);
  } catch (error) {
    if (error instanceof SupabaseIdentityMismatchError) throw error;
    if (!isTransientSupabaseError(error)) throw error;
    // A transicao nao pode derrubar o login legado quando o Auth estiver indisponivel.
    console.warn("[auth-login] Supabase Auth indisponivel; usando fallback legado.");
    return null;
  }
}

export async function POST(req: NextRequest) {
  let stage: LoginStage = "rate_limit";
  const limited = await rateLimit(req, RATE_LIMITS.auth);
  if (limited) return limited;

  try {
    stage = "request_parse";
    const { email, password } = schema.parse(await req.json());

    if (isSupabaseAuthTransitionEnabled()) {
      const direct = await trySupabaseLogin(email, password, (value) => { stage = value; }, "supabase_direct");
      if (direct) return apiSuccess(direct);
    }

    stage = "customer_lookup";
    const customer = await findCustomerByEmail(email);
    if (!customer) return apiError("Credenciais inválidas.", 401);
    stage = "password_verify";
    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) return apiError("Credenciais inválidas.", 401);

    if (isSupabaseAuthTransitionEnabled()) {
      let authUserId = customer.authUserId;
      if (authUserId) {
        try {
          stage = "supabase_identity_sync";
          const synced = await updateSupabasePasswordUser({
            authUserId,
            customerId: customer.id,
            password,
            isTestAccount: isLegacyTestAccount(customer.name, customer.email),
          });
          if (synced.error) {
            if (!isTransientSupabaseError(synced.error)) throw synced.error;
            authUserId = null;
          }
        } catch (error) {
          if (!isTransientSupabaseError(error)) throw error;
          console.warn("[auth-login] Atualizacao no Supabase Auth indisponivel; usando fallback legado.");
          authUserId = null;
        }
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
        const migrated = await trySupabaseLogin(email, password, (value) => { stage = value; }, "supabase_post_sync");
        if (migrated) return apiSuccess({ ...migrated, migratedFromLegacy: true });
      }
    }

    // Fallback temporário: mantém a produção utilizável até o corte registrado.
    stage = "legacy_jwt";
    const token = signCustomerToken({ id: customer.id, email: customer.email, name: customer.name });
    return apiSuccess({ token, accessToken: token, customer: publicCustomer(customer), legacySession: true });
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    if (error instanceof SyntaxError) return apiError("Requisição inválida.", 400);
    if (error instanceof SupabaseIdentityMismatchError) return apiError("Não autorizado.", 401);
    logLoginFailure(stage, error);
    return apiError("Erro interno.", 500);
  }
}
