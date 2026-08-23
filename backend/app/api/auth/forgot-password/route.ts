export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import {
  isResendConfigured,
  sendTransactionalEmail,
} from "@/lib/email/resend";
import { buildPasswordResetEmail } from "@/lib/email/templates";
import {
  generatePasswordResetCode,
  hashPasswordResetCode,
} from "@/lib/password-reset";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });
const RESET_CODE_TTL_MINUTES = 15;
const GENERIC_MESSAGE =
  "Se o e-mail estiver cadastrado, você receberá um código.";

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMITS.forgotPassword);
  if (limited) return limited;

  if (process.env.NODE_ENV === "production" && !isResendConfigured()) {
    return apiError("Serviço temporariamente indisponível.", 503);
  }

  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const customer = await prisma.customer.findUnique({
      where: { email, active: true },
    });

    if (!customer) return apiSuccess({ message: GENERIC_MESSAGE });

    const code = generatePasswordResetCode();
    const expires = new Date(
      Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000
    );

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordResetCode: hashPasswordResetCode(email, code),
        passwordResetExpires: expires,
      },
    });

    const template = buildPasswordResetEmail({
      name: customer.name,
      code,
      expiresInMinutes: RESET_CODE_TTL_MINUTES,
    });
    const delivery = await sendTransactionalEmail({
      to: email,
      ...template,
      tags: [{ name: "flow", value: "password-reset" }],
      idempotencyKey: `password-reset-${customer.id}-${expires.getTime()}`,
    });

    if (!delivery.ok) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { passwordResetCode: null, passwordResetExpires: null },
      });
      console.error("forgot-password email delivery failed", {
        reason: delivery.reason,
        status: delivery.status,
      });
    }

    return apiSuccess({ message: GENERIC_MESSAGE });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.errors[0].message, 422);
    }
    console.error("forgot-password request failed");
    return apiError("Erro interno.", 500);
  }
}
