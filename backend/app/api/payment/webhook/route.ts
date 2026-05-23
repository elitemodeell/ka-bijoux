import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateWebhookSignature } from "@/lib/payment";
import { OrderStatus } from "@prisma/client";

// POST /api/payment/webhook — Receber confirmação do gateway
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") ?? "";
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "";

    if (secret && !validateWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const { type, data } = event;

    // Mercado Pago envia: type = "payment", data.id = payment_id
    if (type === "payment" && data?.id) {
      const gatewayPayment = await fetchMercadoPagoPayment(data.id);
      if (!gatewayPayment) return NextResponse.json({ ok: true });

      const payment = await prisma.payment.findFirst({
        where: { gatewayId: { contains: data.id.toString() } },
        include: { order: true },
      });

      if (!payment) return NextResponse.json({ ok: true });

      if (gatewayPayment.status === "approved") {
        // Confirmar pagamento e atualizar pedido
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "PAGO", paidAt: new Date() },
        });

        await prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.PAGAMENTO_APROVADO,
            statusHistory: {
              create: {
                status: OrderStatus.PAGAMENTO_APROVADO,
                note: "Pagamento confirmado via webhook",
              },
            },
          },
        });

        // Baixar estoque
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId: payment.orderId },
        });

        for (const item of orderItems) {
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
      } else if (gatewayPayment.status === "rejected") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "RECUSADO" },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

async function fetchMercadoPagoPayment(id: string) {
  // TODO: buscar do Mercado Pago real
  // const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
  //   headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` }
  // });
  // return response.json();
  return { id, status: "approved" }; // simulação
}
