import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { googlePlayNotificationWhere } from "@/lib/google-play-distribution";
import { apiError, apiSuccess } from "@/lib/utils";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const customer = await requireCustomer(req);
    const updated = await prisma.notification.updateMany({
      where: googlePlayNotificationWhere({
        id: params.id,
        customerId: customer.id,
      }),
      data: { read: true },
    });
    if (!updated.count) return apiError("Notificação não encontrada.", 404);
    return apiSuccess({ updated: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    return apiError("Erro ao atualizar notificação.", 500);
  }
}
