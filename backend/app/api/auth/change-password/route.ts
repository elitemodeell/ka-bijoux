import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return apiError("Campos obrigatórios ausentes.");
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return apiError("A nova senha deve ter pelo menos 6 caracteres.");
    }

    const user = await prisma.customer.findUnique({ where: { id: customer.id } });
    if (!user) return apiError("Usuário não encontrado.", 404);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return apiError("Senha atual incorreta.");

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash: hash },
    });

    return apiSuccess({ message: "Senha alterada com sucesso." });
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado")
      return apiError("Não autorizado.", 401);
    return apiError("Erro ao alterar senha.", 500);
  }
}
