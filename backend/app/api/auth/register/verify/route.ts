export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";
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
import { consumeEmailOtpRateLimit, EMAIL_OTP_MAX_ATTEMPTS, matchesEmailOtp } from "@/lib/email-registration-otp";
import { apiError, apiSuccess } from "@/lib/utils";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(6),
});
const INVALID_CODE_MESSAGE = "Código incorreto. Confira os 6 dígitos e tente novamente.";

function publicCustomer(customer: { id: string; name: string; email: string; phone: string | null }) {
  return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone };
}

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}

async function unlockPending(id: string) {
  await prisma.pendingEmailRegistration.updateMany({ where: { id }, data: { consumedAt: null } });
}

async function rollbackCustomer(customerId: string) {
  await prisma.$transaction([
    prisma.consentLog.deleteMany({ where: { customerId } }),
    prisma.customer.deleteMany({ where: { id: customerId } }),
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(await req.json());
    const [ipLimit, emailLimit] = await Promise.all([
      consumeEmailOtpRateLimit({ scope: "registration-verify-ip", identifier: clientIp(req), limit: 20, windowMs: 15 * 60_000 }),
      consumeEmailOtpRateLimit({ scope: "registration-verify-email", identifier: data.email, limit: 10, windowMs: 15 * 60_000 }),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      return apiError("Muitas tentativas. Aguarde e tente novamente.", 429);
    }

    const pending = await prisma.pendingEmailRegistration.findUnique({ where: { email: data.email } });
    if (!pending || pending.consumedAt) return apiError(INVALID_CODE_MESSAGE, 400);
    if (pending.otpExpiresAt.getTime() <= Date.now()) {
      return apiError("Código expirado. Solicite um novo código.", 410);
    }
    if (pending.otpAttempts >= EMAIL_OTP_MAX_ATTEMPTS) {
      return apiError("Limite de tentativas atingido. Solicite um novo código.", 429);
    }

    const codeMatches = matchesEmailOtp(pending.otpDigest, pending.id, data.email, data.code);
    const passwordMatches = await bcrypt.compare(data.password, pending.passwordHash);
    if (!codeMatches || !passwordMatches) {
      const updated = await prisma.pendingEmailRegistration.update({
        where: { id: pending.id },
        data: { otpAttempts: { increment: 1 } },
        select: { otpAttempts: true },
      });
      const attemptsRemaining = Math.max(0, EMAIL_OTP_MAX_ATTEMPTS - updated.otpAttempts);
      if (attemptsRemaining === 0) {
        return apiError("Limite de tentativas atingido. Solicite um novo código.", 429);
      }
      return apiError(`${INVALID_CODE_MESSAGE} ${attemptsRemaining} tentativa(s) restante(s).`, 400);
    }

    const locked = await prisma.pendingEmailRegistration.updateMany({
      where: {
        id: pending.id,
        consumedAt: null,
        otpAttempts: { lt: EMAIL_OTP_MAX_ATTEMPTS },
        otpExpiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });
    if (locked.count !== 1) return apiError(INVALID_CODE_MESSAGE, 400);

    const exists = await prisma.customer.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" } },
      select: { id: true },
    });
    if (exists) {
      await prisma.pendingEmailRegistration.deleteMany({ where: { id: pending.id } });
      return apiError("Não foi possível concluir o cadastro com esses dados.", 409);
    }

    const customerId = randomUUID();
    let authUserId: string | null = null;
    if (isSupabaseAuthTransitionEnabled()) {
      const createdAuth = await createSupabasePasswordUser({
        customerId,
        email: pending.email,
        name: pending.name,
        password: data.password,
        emailConfirmed: true,
      });
      if (createdAuth.error || !createdAuth.data.user) {
        await unlockPending(pending.id);
        return apiError("Serviço de autenticação temporariamente indisponível.", 503);
      }
      authUserId = createdAuth.data.user.id;
    }

    let customer: { id: string; name: string; email: string; phone: string | null };
    try {
      customer = await prisma.$transaction(async (tx) => {
        const created = await tx.customer.create({
          data: {
            id: customerId,
            name: pending.name,
            email: pending.email,
            phone: pending.phone,
            passwordHash: pending.passwordHash,
            authUserId,
            authMigratedAt: authUserId ? new Date() : null,
          },
        });
        await tx.consentLog.create({
          data: {
            customerId: created.id,
            version: pending.consentVersion,
            ip: pending.consentIp,
            userAgent: pending.consentUserAgent,
          },
        });
        return created;
      });
    } catch {
      if (authUserId) await deleteSupabaseUser(authUserId);
      await unlockPending(pending.id);
      return apiError("Serviço de autenticação temporariamente indisponível.", 503);
    }

    if (!authUserId) {
      const token = signCustomerToken({ id: customer.id, email: customer.email, name: customer.name });
      await prisma.pendingEmailRegistration.deleteMany({ where: { id: pending.id } });
      return apiSuccess({ customer: publicCustomer(customer), token, accessToken: token, legacySession: true }, 201);
    }

    const login = await signInWithSupabasePassword(data.email, data.password);
    if (login.error || !login.data.session) {
      await deleteSupabaseUser(authUserId);
      await rollbackCustomer(customer.id);
      await unlockPending(pending.id);
      return apiError("Serviço de autenticação temporariamente indisponível.", 503);
    }

    await prisma.pendingEmailRegistration.deleteMany({ where: { id: pending.id } });
    return apiSuccess({ customer: publicCustomer(customer), ...sessionResponse(login.data.session, login.data.user) }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError("Código inválido.", 422);
    return apiError("Erro interno.", 500);
  }
}
