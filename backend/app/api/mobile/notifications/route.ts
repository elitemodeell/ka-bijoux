import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { googlePlayNotificationWhere, toGooglePlayPublicData } from "@/lib/google-play-distribution";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const notifications = await prisma.notification.findMany({
      where: googlePlayNotificationWhere({ customerId: customer.id }),
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return apiSuccess(toGooglePlayPublicData(notifications));
  } catch (error) {
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    return apiError("Erro ao buscar notificações.", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    await prisma.notification.updateMany({
      where: googlePlayNotificationWhere({
        customerId: customer.id,
        read: false,
      }),
      data: { read: true },
    });
    return apiSuccess({ updated: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    return apiError("Erro ao atualizar notificações.", 500);
  }
}
