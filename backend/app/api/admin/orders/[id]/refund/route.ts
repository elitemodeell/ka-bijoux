export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { PaymentUnavailableError, refundAsaasPayment } from "@/lib/payment";

// POST /api/admin/orders/[id]/refund — emite reembolso via Asaas
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { payment: true },
    });

    if (!order) return apiError("Pedido não encontrado.", 404);
    if (!order.payment) return apiError("Pedido sem pagamento associado.", 400);
    if (order.payment.status !== "PAGO") {
      return apiError("Só é possível reembolsar pagamentos aprovados.", 400);
    }
    if (!order.payment.gatewayId) {
      return apiError("ID de pagamento externo não encontrado.", 400);
    }
    if (order.payment.provider !== "ASAAS") return apiError("Gateway do pagamento incompatível.", 409);
    await refundAsaasPayment(order.payment.gatewayId);

    // O estoque só é devolvido quando o Asaas confirmar o reembolso via webhook.
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: "ESTORNO_PENDENTE" },
      }),
      prisma.order.update({
        where: { id: params.id },
        data: { status: "REEMBOLSO_PENDENTE" },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: params.id,
          status: "REEMBOLSO_PENDENTE",
          note: "Reembolso solicitado ao Asaas; aguardando confirmação por webhook.",
        },
      }),
    ]);

    return apiSuccess({ message: "Reembolso solicitado; aguardando confirmação do Asaas." });
  } catch (e) {
    if (e instanceof PaymentUnavailableError) return apiError("Pagamento temporariamente indisponível", 503);
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    console.error("refund error:", e);
    return apiError("Erro ao processar reembolso.", 500);
  }
}
