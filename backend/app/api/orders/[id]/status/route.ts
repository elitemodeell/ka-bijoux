import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { OrderStatus, ShippingType } from "@prisma/client";

const schema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().optional(),
  trackingCode: z.string().optional(),
});

// PATCH /api/orders/:id/status — Admin atualiza status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { status, note, trackingCode } = schema.parse(body);

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true, payment: true, customer: true },
    });
    if (!order) return apiError("Pedido não encontrado.", 404);

    const updateData: Record<string, unknown> = { status };
    if (trackingCode) updateData.shippingTrackingCode = trackingCode;

    // Se pagamento aprovado → baixar estoque (para Pix que foi confirmado)
    if (
      status === OrderStatus.PAGAMENTO_APROVADO &&
      order.status !== OrderStatus.PAGAMENTO_APROVADO
    ) {
      for (const item of order.items) {
        if (item.variationId) {
          await prisma.productVariation.update({
            where: { id: item.variationId },
            data: { stock: { decrement: item.quantity } },
          });
        } else {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
              soldCount: { increment: item.quantity },
            },
          });
        }
      }

      // Atualizar pagamento para PAGO
      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { status: "PAGO", paidAt: new Date() },
        });
      }
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...updateData,
        statusHistory: {
          create: {
            status,
            note: note ?? statusNote(status, order.shippingType),
          },
        },
      },
      include: {
        items: true,
        payment: true,
        statusHistory: { orderBy: { createdAt: "desc" } },
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    return apiSuccess(updated);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro ao atualizar status.", 500);
  }
}

function statusNote(status: OrderStatus, shippingType: ShippingType): string {
  const notes: Partial<Record<OrderStatus, string>> = {
    [OrderStatus.PAGAMENTO_APROVADO]: "Pagamento aprovado pelo gateway",
    [OrderStatus.EM_SEPARACAO]: "Pedido em separação no estoque",
    [OrderStatus.PRONTO_PARA_RETIRADA]: "Pedido pronto para retirada na loja",
    [OrderStatus.SAIU_PARA_ENTREGA]:
      shippingType === ShippingType.MOTOTAXI
        ? "Pedido saiu para entrega por mototáxi em Itaúna"
        : "Pedido saiu para entrega",
    [OrderStatus.ENVIADO_CORREIOS]: "Pedido enviado pelos Correios",
    [OrderStatus.ENTREGUE]: "Pedido entregue ao cliente",
    [OrderStatus.CANCELADO]: "Pedido cancelado",
  };
  return notes[status] ?? "";
}
