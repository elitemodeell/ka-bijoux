export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
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

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}

function genericResponse(email: string) {
  return apiSuccess({
    pending: true,
    email,
    message: REGISTRATION_PENDING_MESSAGE,
    resendAfterSeconds: EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email } = schema.parse(await req.json());
    if (!isResendConfigured()) return apiError("Serviço de confirmação temporariamente indisponível.", 503);

    const [ipLimit, emailLimit] = await Promise.all([
      consumeEmailOtpRateLimit({ scope: "registration-resend-ip", identifier: clientIp(req), limit: 5, windowMs: 15 * 60_000 }),
      consumeEmailOtpRateLimit({ scope: "registration-resend-email", identifier: email, limit: 3, windowMs: 15 * 60_000 }),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      return apiError("Muitas tentativas. Aguarde e tente novamente.", 429);
    }

    const pending = await prisma.pendingEmailRegistration.findUnique({ where: { email } });
    if (!pending || pending.consumedAt || pending.resendAvailableAt.getTime() > Date.now()) {
      return genericResponse(email);
    }

    const now = new Date();
    const code = generateEmailOtp();
    const expiresAt = otpExpiresAt(now);
    const otpDigest = digestEmailOtp(pending.id, email, code);
    await prisma.pendingEmailRegistration.update({
      where: { id: pending.id },
      data: {
        otpDigest,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
        resendAvailableAt: otpResendAvailableAt(now),
      },
    });

    const template = buildEmailRegistrationOtpEmail({ name: pending.name, code, expiresInMinutes: EMAIL_OTP_TTL_MINUTES });
    const delivery = await sendTransactionalEmail({
      to: email,
      ...template,
      tags: [{ name: "category", value: "email_registration_otp" }],
      idempotencyKey: `registration-otp-resend:${pending.id}:${expiresAt.getTime()}`,
    });
    if (!delivery.ok) {
      await prisma.pendingEmailRegistration.deleteMany({ where: { id: pending.id } });
      return apiError("Serviço de confirmação temporariamente indisponível.", 503);
    }

    return genericResponse(email);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    return apiError("Erro interno.", 500);
  }
}
