export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildEmailRegistrationOtpEmail } from "@/lib/email/templates";
import { isResendConfigured, sendTransactionalEmail } from "@/lib/email/resend";
import {
  consumeEmailOtpRateLimit,
  digestEmailOtp,
  EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
  EMAIL_OTP_TTL_MINUTES,
  generateEmailOtp,
  otpExpiresAt,
  otpResendAvailableAt,
  REGISTRATION_PENDING_MESSAGE,
} from "@/lib/email-registration-otp";
import { apiError, apiSuccess } from "@/lib/utils";

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

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}

function pendingResponse(email: string) {
  return apiSuccess({
    pending: true,
    email,
    message: REGISTRATION_PENDING_MESSAGE,
    expiresInSeconds: EMAIL_OTP_TTL_MINUTES * 60,
    resendAfterSeconds: EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
  }, 202);
}

export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(await req.json());
    if (!isResendConfigured()) {
      return apiError("Serviço de confirmação temporariamente indisponível.", 503);
    }

    const ip = clientIp(req);
    const [ipLimit, emailLimit] = await Promise.all([
      consumeEmailOtpRateLimit({ scope: "registration-start-ip", identifier: ip, limit: 5, windowMs: 15 * 60_000 }),
      consumeEmailOtpRateLimit({ scope: "registration-start-email", identifier: data.email, limit: 3, windowMs: 15 * 60_000 }),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      return apiError("Muitas tentativas. Aguarde e tente novamente.", 429);
    }

    const exists = await prisma.customer.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" } },
      select: { id: true },
    });
    if (exists) return pendingResponse(data.email);

    const now = new Date();
    const registrationId = randomUUID();
    const code = generateEmailOtp();
    const passwordHash = await bcrypt.hash(data.password, 12);
    const expiresAt = otpExpiresAt(now);
    const resendAt = otpResendAvailableAt(now);
    const otpDigest = digestEmailOtp(registrationId, data.email, code);
    const userAgent = req.headers.get("user-agent") ?? undefined;

    const pending = await prisma.pendingEmailRegistration.upsert({
      where: { email: data.email },
      create: {
        id: registrationId,
        email: data.email,
        name: data.name,
        phone: data.phone,
        passwordHash,
        consentVersion: CONSENT_VERSION,
        consentIp: ip === "unknown" ? undefined : ip,
        consentUserAgent: userAgent,
        otpDigest,
        otpExpiresAt: expiresAt,
        resendAvailableAt: resendAt,
      },
      update: {
        id: registrationId,
        name: data.name,
        phone: data.phone,
        passwordHash,
        consentVersion: CONSENT_VERSION,
        consentIp: ip === "unknown" ? null : ip,
        consentUserAgent: userAgent,
        otpDigest,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
        resendAvailableAt: resendAt,
        consumedAt: null,
      },
    });

    const template = buildEmailRegistrationOtpEmail({ name: data.name, code, expiresInMinutes: EMAIL_OTP_TTL_MINUTES });
    const delivery = await sendTransactionalEmail({
      to: data.email,
      ...template,
      tags: [{ name: "category", value: "email_registration_otp" }],
      idempotencyKey: `registration-otp:${pending.id}:${expiresAt.getTime()}`,
    });
    if (!delivery.ok) {
      await prisma.pendingEmailRegistration.deleteMany({ where: { id: pending.id, email: data.email } });
      return apiError("Serviço de confirmação temporariamente indisponível.", 503);
    }

    return pendingResponse(data.email);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    return apiError("Erro interno.", 500);
  }
}
