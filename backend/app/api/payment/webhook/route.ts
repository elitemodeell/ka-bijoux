import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { sendPushNotification } from "@/lib/notifications";

// POST /api/payment/webhook — Receber confirmação do Mercado Pago
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const xSignature = req.headers.get("x-signature") ?? "";
    const xRequestId = req.headers.get("x-request-id") ?? "";
    const { searchParams } = new URL(req.url);
    const dataId = searchParams.get("data.id") ?? "";

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "";
    if (secret && xSignature && !validateSignature(xSignature, xRequestId, dataId, secret)) {
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const { type, data } = event;

    if (type === "payment" && data?.id) {
      const mpPayment = await fetchMercadoPagoPayment(data.id);
      if (!mpPayment) return NextResponse.json({ ok: true });

      const payment = await findPaymentRecord(data.id, mpPayment.external_reference);
      if (!payment) return NextResponse.json({ ok: true });

      if (mpPayment.status === "approved") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "PAGO",
            paidAt: new Date(),
            gatewayId: String(data.id),
          },
        });

        const updatedOrder = await prisma.order.update({
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
          include: { customer: { select: { pushToken: true } } },
        });

        if (updatedOrder.customer.pushToken) {
          sendPushNotification({
            to: updatedOrder.customer.pushToken,
            title: "Pagamento confirmado! ✅",
            body: `Pedido #${updatedOrder.orderNumber} pago. Já estamos preparando seus itens.`,
            data: { orderId: updatedOrder.id, orderNumber: updatedOrder.orderNumber },
          });
        }

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
      } else if (mpPayment.status === "rejected" || mpPayment.status === "cancelled") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "RECUSADO" },
        });

        await prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.CANCELADO,
            statusHistory: {
              create: { status: OrderStatus.CANCELADO, note: "Pagamento recusado pelo gateway" },
            },
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

// Mercado Pago v2 — x-signature: "ts=TIMESTAMP,v1=HMAC"
// Manifest: "id:DATA_ID;request-id:X_REQUEST_ID;ts:TIMESTAMP;"
function validateSignature(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  secret: string
): boolean {
  const ts = xSignature.split(",").find((p) => p.startsWith("ts="))?.slice(3) ?? "";
  const v1 = xSignature.split(",").find((p) => p.startsWith("v1="))?.slice(3) ?? "";
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

async function fetchMercadoPagoPayment(id: string) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) return { id, status: "approved", external_reference: null };

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; status: string; external_reference: string | null }>;
}

async function findPaymentRecord(mpPaymentId: string, externalReference: string | null) {
  // PIX: gatewayId = MP payment ID direto
  let payment = await prisma.payment.findFirst({
    where: { gatewayId: String(mpPaymentId) },
  });

  // Checkout Pro: gateway armazena preference ID, mas o order tem external_reference = orderNumber
  if (!payment && externalReference) {
    const order = await prisma.order.findFirst({
      where: { orderNumber: externalReference },
      include: { payment: true },
    });
    payment = order?.payment ?? null;
  }

  return payment;
}
