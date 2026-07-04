import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// GET /api/customers/me
export async function GET(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const data = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: {
        id: true, name: true, email: true,
        phone: true, cpf: true, createdAt: true,
      },
    });
    return apiSuccess(data);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao buscar dados.", 500);
  }
}

// PATCH /api/customers/me
export async function PATCH(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const body = await req.json();
    const { name, phone } = body;

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(phone !== undefined ? { phone: phone ? String(phone).trim() : null } : {}),
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    return apiSuccess(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao atualizar dados.", 500);
  }
}

// DELETE /api/customers/me — Exclusão de conta (obrigatório Play Store / App Store)
export async function DELETE(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const body = await req.json().catch(() => ({}));
    const { password } = body as { password?: string };

    if (!password) return apiError("Senha obrigatória para excluir a conta.", 400);

    const user = await prisma.customer.findUnique({ where: { id: customer.id } });
    if (!user) return apiError("Usuário não encontrado.", 404);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return apiError("Senha incorreta.", 401);

    // Cascade via Prisma schema (onDelete: Cascade em Address, Order, Cart, Favorite, Notification)
    await prisma.customer.delete({ where: { id: customer.id } });

    return apiSuccess({ message: "Conta excluída com sucesso." });
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao excluir conta.", 500);
  }
}
