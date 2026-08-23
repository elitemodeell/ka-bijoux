export const dynamic = "force-dynamic";
import { createHash } from "crypto";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { verifyPasswordResetCode } from "@/lib/password-reset";
import { isSupabaseAuthTransitionEnabled, updateSupabasePassword } from "@/lib/supabase-auth";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});
const INVALID_CODE_MESSAGE = "Código inválido ou expirado.";

function hashRateLimitIdentifier(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, newPassword } = schema.parse(body);

    const limitedByIp = await rateLimit(
      req,
      RATE_LIMITS.passwordResetIp
    );
    if (limitedByIp) return limitedByIp;

    const limitedByAccount = await rateLimit(
      req,
      RATE_LIMITS.passwordResetAccount,
      hashRateLimitIdentifier(email)
    );
    if (limitedByAccount) return limitedByAccount;

    const customer = await prisma.customer.findUnique({
      where: { email, active: true },
    });

    if (
      !customer ||
      !customer.passwordResetCode ||
      !customer.passwordResetExpires
    ) {
      return apiError(INVALID_CODE_MESSAGE, 400);
    }

    if (new Date() > customer.passwordResetExpires) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { passwordResetCode: null, passwordResetExpires: null },
      });
      return apiError(INVALID_CODE_MESSAGE, 400);
    }

    if (
      !verifyPasswordResetCode(
        email,
        code,
        customer.passwordResetCode
      )
    ) {
      return apiError(INVALID_CODE_MESSAGE, 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    if (isSupabaseAuthTransitionEnabled() && customer.authUserId) {
      const synchronized = await updateSupabasePassword(customer.authUserId, newPassword);
      if (synchronized.error) return apiError("Serviço de autenticação temporariamente indisponível.", 503);
    }
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash,
        passwordResetCode: null,
        passwordResetExpires: null,
      },
    });

    return apiSuccess({ message: "Senha redefinida com sucesso." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.errors[0].message, 422);
    }
    console.error("reset-password request failed");
    return apiError("Erro interno.", 500);
  }
}
