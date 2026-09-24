import { NextRequest } from "next/server";
import { z } from "zod";
import { OrderStatus, PaymentStatus, ShippingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { sendPushNotification, orderStatusMessage } from "@/lib/notifications";

const logisticsStatuses = [
  OrderStatus.EM_SEPARACAO,
  OrderStatus.PRONTO_PARA_RETIRADA,
  OrderStatus.SAIU_PARA_ENTREGA,
  OrderStatus.ENVIADO_CORREIOS,
  OrderStatus.ENTREGUE,
] as const;

const schema = z
  .object({
    status: z.enum(logisticsStatuses),
    note: z.string().trim().max(500).optional(),
    trackingCode: z.string().trim().max(100).optional(),
  })
  .strict();

const allowedTransitions: Readonly<Partial<Record<OrderStatus, ReadonlySet<OrderStatus>>>> = {
  [OrderStatus.PAGAMENTO_APROVADO]: new Set([OrderStatus.EM_SEPARACAO]),
  [OrderStatus.EM_SEPARACAO]: new Set([
    OrderStatus.PRONTO_PARA_RETIRADA,
    OrderStatus.SAIU_PARA_ENTREGA,
    OrderStatus.ENVIADO_CORREIOS,
  ]),
  [OrderStatus.PRONTO_PARA_RETIRADA]: new Set([OrderStatus.ENTREGUE]),
  [OrderStatus.SAIU_PARA_ENTREGA]: new Set([OrderStatus.ENTREGUE]),
  [OrderStatus.ENVIADO_CORREIOS]: new Set([OrderStatus.ENTREGUE]),
};

function isAllowedManualOrderTransition(
  current: OrderStatus,
  attempted: OrderStatus
): boolean {
  return current === attempted || allowedTransitions[current]?.has(attempted) === true;
}

// PATCH /api/orders/:id/status — somente etapas logísticas.
// Estados financeiros são controlados exclusivamente pelo Asaas/webhook.
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireAdmin(req);
    const { status, note, trackingCode } = schema.parse(await req.json());

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { payment: true, customer: { select: { pushToken: true } } },
    });
    if (!order) return apiError("Pedido não encontrado.", 404);
    if (order.payment?.status !== PaymentStatus.PAGO) {
      return apiError(
        "O pedido só pode avançar na logística após confirmação financeira pelo Asaas.",
        409
      );
    }
    if (!isAllowedManualOrderTransition(order.status, status)) {
      return apiError("Transição de status não permitida.", 409);
    }
    if (
      status === OrderStatus.ENVIADO_CORREIOS &&
      (!trackingCode || trackingCode.length < 3)
    ) {
      return apiError("Informe o código de rastreio dos Correios.", 422);
    }

    if (order.status === status) {
      const unchanged = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          items: true,
          payment: true,
          statusHistory: { orderBy: { createdAt: "desc" } },
          customer: { select: { id: true, name: true, email: true } },
        },
      });
      return apiSuccess(unchanged);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: {
          status,
          ...(status === OrderStatus.ENVIADO_CORREIOS
            ? { shippingTrackingCode: trackingCode }
            : {}),
        },
      });
      if (changed.count !== 1) return null;

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status,
          note: note || statusNote(status, order.shippingType),
        },
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: true,
          payment: true,
          statusHistory: { orderBy: { createdAt: "desc" } },
          customer: { select: { id: true, name: true, email: true } },
        },
      });
    });

    if (!updated) {
      return apiError("O pedido foi atualizado simultaneamente. Recarregue e tente novamente.", 409);
    }

    if (order.customer.pushToken) {
      const message = orderStatusMessage(
        status,
        order.orderNumber,
        order.shippingType,
        trackingCode
      );
      void sendPushNotification({
        to: order.customer.pushToken,
        title: message.title,
        body: message.body,
        data: { orderId: order.id, orderNumber: order.orderNumber },
      });
    }

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    console.error("Erro ao atualizar etapa logística:", error);
    return apiError("Erro ao atualizar status.", 500);
  }
}

function statusNote(status: OrderStatus, shippingType: ShippingType): string {
  const notes: Partial<Record<OrderStatus, string>> = {
    [OrderStatus.EM_SEPARACAO]: "Pedido em separação no estoque",
    [OrderStatus.PRONTO_PARA_RETIRADA]: "Pedido pronto para retirada na loja",
    [OrderStatus.SAIU_PARA_ENTREGA]:
      shippingType === ShippingType.MOTOTAXI
        ? "Pedido saiu para entrega por mototáxi em Itaúna"
        : "Pedido saiu para entrega",
    [OrderStatus.ENVIADO_CORREIOS]: "Pedido enviado pelos Correios",
    [OrderStatus.ENTREGUE]: "Pedido entregue ao cliente",
  };
  return notes[status] ?? "";
}