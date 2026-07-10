export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, newPassword } = schema.parse(body);

    const customer = await prisma.customer.findUnique({
      where: { email, active: true },
    });

    if (
      !customer ||
      !customer.passwordResetCode ||
      !customer.passwordResetExpires
    ) {
      return apiError("Código inválido ou expirado.", 400);
    }

    if (new Date() > customer.passwordResetExpires) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { passwordResetCode: null, passwordResetExpires: null },
      });
      return apiError("Código expirado. Solicite um novo código.", 400);
    }

    if (customer.passwordResetCode !== code) {
      return apiError("Código incorreto.", 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash, passwordResetCode: null, passwordResetExpires: null },
    });

    return apiSuccess({ message: "Senha redefinida com sucesso." });
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    console.error("reset-password error:", e);
    return apiError("Erro interno.", 500);
  }
}
