export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// POST /api/admin/orders/[id]/refund — emite reembolso via Mercado Pago
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

    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!token) {
      // Mock em dev
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: "REEMBOLSADO", refundedAt: new Date() },
      });
      await prisma.order.update({
        where: { id: params.id },
        data: { status: "CANCELADO" },
      });
      return apiSuccess({ message: "Reembolso simulado (dev) realizado com sucesso." });
    }

    // Chama a API de reembolso do Mercado Pago
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${order.payment.gatewayId}/refunds`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `refund-${order.id}`,
        },
        body: JSON.stringify({}), // sem body = reembolso total
      }
    );

    if (!mpRes.ok) {
      const err = await mpRes.json().catch(() => ({})) as Record<string, unknown>;
      console.error("MP refund error:", err);
      return apiError(
        `Erro ao processar reembolso: ${(err as { message?: string }).message ?? mpRes.statusText}`,
        502
      );
    }

    // Atualiza banco e devolve estoque
    const items = await prisma.orderItem.findMany({ where: { orderId: params.id } });

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: "REEMBOLSADO", refundedAt: new Date() },
      }),
      prisma.order.update({
        where: { id: params.id },
        data: { status: "CANCELADO" },
      }),
      prisma.orderStatusHistory.create({
        data: { orderId: params.id, status: "CANCELADO", note: "Reembolso emitido pelo admin." },
      }),
      ...items.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      ),
    ]);

    return apiSuccess({ message: "Reembolso realizado com sucesso." });
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    console.error("refund error:", e);
    return apiError("Erro ao processar reembolso.", 500);
  }
}
