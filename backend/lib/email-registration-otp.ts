import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const EMAIL_OTP_LENGTH = 6;
export const EMAIL_OTP_TTL_MINUTES = 15;
export const EMAIL_OTP_MAX_ATTEMPTS = 5;
export const EMAIL_OTP_RESEND_COOLDOWN_SECONDS = 60;
export const REGISTRATION_PENDING_MESSAGE =
  "Se os dados puderem ser usados para cadastro, enviaremos um código de confirmação.";

function otpSecret(): string {
  const value = process.env.EMAIL_OTP_HMAC_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error("EMAIL_OTP_HMAC_SECRET não configurado com pelo menos 32 caracteres");
  }
  return value;
}

export function generateEmailOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(EMAIL_OTP_LENGTH, "0");
}

export function digestEmailOtp(registrationId: string, email: string, code: string): string {
  return createHmac("sha256", otpSecret())
    .update(`${registrationId}:${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
}

export function matchesEmailOtp(expectedDigest: string, registrationId: string, email: string, code: string): boolean {
  const received = digestEmailOtp(registrationId, email, code);
  const expectedBuffer = Buffer.from(expectedDigest, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function digestRateLimitKey(value: string): string {
  return createHmac("sha256", otpSecret()).update(value.trim().toLowerCase()).digest("hex");
}

export function otpExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + EMAIL_OTP_TTL_MINUTES * 60_000);
}

export function otpResendAvailableAt(now = new Date()): Date {
  return new Date(now.getTime() + EMAIL_OTP_RESEND_COOLDOWN_SECONDS * 1_000);
}

export async function consumeEmailOtpRateLimit(input: {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
  now?: Date;
}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = input.now ?? new Date();
  const keyDigest = digestRateLimitKey(input.identifier);
  const existing = await prisma.emailOtpRateLimit.findUnique({
    where: { scope_keyDigest: { scope: input.scope, keyDigest } },
  });
  const elapsed = existing ? now.getTime() - existing.windowStarted.getTime() : input.windowMs;

  if (!existing || elapsed >= input.windowMs) {
    await prisma.emailOtpRateLimit.upsert({
      where: { scope_keyDigest: { scope: input.scope, keyDigest } },
      create: { scope: input.scope, keyDigest, windowStarted: now, count: 1 },
      update: { windowStarted: now, count: 1 },
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= input.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((input.windowMs - elapsed) / 1_000)),
    };
  }

  await prisma.emailOtpRateLimit.update({
    where: { scope_keyDigest: { scope: input.scope, keyDigest } },
    data: { count: { increment: 1 } },
  });
  return { allowed: true, retryAfterSeconds: 0 };
}
