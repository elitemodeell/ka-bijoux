import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import {
  isSupabaseAuthTransitionEnabled,
  signOutSupabaseSession,
  updateSupabasePassword,
} from "@/lib/supabase-auth";

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
    if (isSupabaseAuthTransitionEnabled() && user.authUserId) {
      const synchronized = await updateSupabasePassword(user.authUserId, newPassword);
      if (synchronized.error) return apiError("Serviço de autenticação temporariamente indisponível.", 503);
    }
    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash: hash },
    });

    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (isSupabaseAuthTransitionEnabled() && token) {
      await signOutSupabaseSession(token, "global");
    }

    return apiSuccess({ message: "Senha alterada com sucesso. Entre novamente nos seus dispositivos." });
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado")
      return apiError("Não autorizado.", 401);
    return apiError("Erro ao alterar senha.", 500);
  }
}
