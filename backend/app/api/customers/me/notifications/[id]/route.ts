export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// PATCH /api/customers/me/notifications/[id] — marca como lida
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await requireCustomer(req);
    const notification = await prisma.notification.findFirst({
      where: { id: params.id, customerId: customer.id },
    });
    if (!notification) return apiError("Notificação não encontrada.", 404);

    const updated = await prisma.notification.update({
      where: { id: params.id },
      data: { read: true },
    });
    return apiSuccess(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao atualizar notificação.", 500);
  }
}
