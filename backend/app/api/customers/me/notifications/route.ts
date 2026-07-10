export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// GET /api/customers/me/notifications
export async function GET(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const notifications = await prisma.notification.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return apiSuccess(notifications);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao buscar notificações.", 500);
  }
}

// PATCH /api/customers/me/notifications — marca todas como lidas
export async function PATCH(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    await prisma.notification.updateMany({
      where: { customerId: customer.id, read: false },
      data: { read: true },
    });
    return apiSuccess({ message: "Todas as notificações foram marcadas como lidas." });
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao atualizar notificações.", 500);
  }
}
