export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signCustomerToken } from "@/lib/auth";
import {
  createSupabasePasswordUser,
  deleteSupabaseUser,
  isSupabaseAuthTransitionEnabled,
  sessionResponse,
  signInWithSupabasePassword,
} from "@/lib/supabase-auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";

const CONSENT_VERSION = "2026-07";

const schema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 10 || digits.length === 11;
  }, "Telefone inválido.").optional(),
  password: z.string().min(6),
  acceptedTerms: z.boolean().refine((value) => value === true, {
    message: "É necessário aceitar os Termos de Uso e a Política de Privacidade.",
  }),
});

function publicCustomer(customer: { id: string; name: string; email: string; phone: string | null }) {
  return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone };
}

async function rollbackNewCustomer(customerId: string) {
  await prisma.$transaction([
    prisma.consentLog.deleteMany({ where: { customerId } }),
    prisma.customer.deleteMany({ where: { id: customerId } }),
  ]);
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMITS.auth);
  if (limited) return limited;

  try {
    const data = schema.parse(await req.json());
    const exists = await prisma.customer.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" } },
      select: { id: true },
    });
    if (exists) return apiError("Não foi possível concluir o cadastro com esses dados.", 409);

    const passwordHash = await bcrypt.hash(data.password, 12);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? undefined;
    const userAgent = req.headers.get("user-agent") ?? undefined;

    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: { name: data.name, email: data.email, phone: data.phone, passwordHash },
      });
      await tx.consentLog.create({
        data: { customerId: created.id, version: CONSENT_VERSION, ip, userAgent },
      });
      return created;
    });

    if (!isSupabaseAuthTransitionEnabled()) {
      const token = signCustomerToken({ id: customer.id, email: customer.email, name: customer.name });
      return apiSuccess({ customer: publicCustomer(customer), token, accessToken: token, legacySession: true }, 201);
    }

    const createdAuth = await createSupabasePasswordUser({
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      password: data.password,
      // O contrato do app exige cadastro -> sessão ativa. A confirmação é feita
      // no próprio fluxo de criação autenticada do backend, sem deixar uma conta
      // órfã aguardando e-mail antes de emitir a sessão.
      emailConfirmed: true,
    });
    if (createdAuth.error || !createdAuth.data.user) {
      await rollbackNewCustomer(customer.id);
      return apiError("Não foi possível concluir o cadastro com esses dados.", 409);
    }

    try {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { authUserId: createdAuth.data.user.id, authMigratedAt: new Date() },
      });
      const login = await signInWithSupabasePassword(data.email, data.password);
      if (login.error || !login.data.session) throw new Error("Supabase Auth não iniciou a sessão");
      return apiSuccess({
        customer: publicCustomer(customer),
        ...sessionResponse(login.data.session, login.data.user),
      }, 201);
    } catch {
      await deleteSupabaseUser(createdAuth.data.user.id);
      await rollbackNewCustomer(customer.id);
      return apiError("Serviço de autenticação temporariamente indisponível.", 503);
    }
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    return apiError("Erro interno.", 500);
  }
}
