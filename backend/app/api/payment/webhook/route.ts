export const dynamic = "force-dynamic";

import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface AsaasWebhook {
  id?: unknown;
  event?: unknown;
  payment?: { id?: unknown; externalReference?: unknown; status?: unknown };
}

const PAID_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const REFUND_EVENTS = new Set(["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED"]);
const FAILED_EVENTS = new Set([
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_DELETED",
]);
const EXPIRED_EVENTS = new Set(["PAYMENT_OVERDUE"]);

function secureTokenMatches(received: string, expected: string) {
  const left = createHash("sha256").update(received).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

async function updateStock(
  tx: Prisma.TransactionClient,
  orderId: string,
  direction: "decrement" | "increment",
) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    if (item.variationId) {
      await tx.productVariation.update({
        where: { id: item.variationId },
        data: { stock: { [direction]: item.quantity } },
      });
    } else {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { [direction]: item.quantity },
          soldCount:
            direction === "decrement"
              ? { increment: item.quantity }
              : { decrement: item.quantity },
        },
      });
    }
  }
}

export async function POST(req: NextRequest) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  const receivedToken = req.headers.get("asaas-access-token")?.trim() ?? "";
  if (!expectedToken) {
    return NextResponse.json({ error: "Webhook indisponível." }, { status: 503 });
  }
  if (!receivedToken || !secureTokenMatches(receivedToken, expectedToken)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody) as AsaasWebhook;
    const eventId = typeof body.id === "string" ? body.id : "";
    const eventType = typeof body.event === "string" ? body.event : "";
    const externalPaymentId = typeof body.payment?.id === "string" ? body.payment.id : "";
    if (!eventId || !eventType || !externalPaymentId) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 422 });
    }

    const payloadHash = createHash("sha256").update(rawBody).digest("hex");
    const result = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.paymentWebhookEvent.findUnique({
        where: {
          provider_externalEventId: {
            provider: "ASAAS",
            externalEventId: eventId,
          },
        },
      });
      if (duplicate) return { duplicate: true, processed: false };

      const payment = await tx.payment.findFirst({
        where: {
          provider: "ASAAS",
          OR: [{ externalPaymentId }, { gatewayId: externalPaymentId }],
        },
        include: { order: true },
      });

      const webhookEvent = await tx.paymentWebhookEvent.create({
        data: {
          provider: "ASAAS",
          externalEventId: eventId,
          eventType,
          externalPaymentId,
          payloadHash,
          processingStatus: "PROCESSING",
          processingStartedAt: new Date(),
          attemptCount: 1,
          orderId: payment?.orderId,
        },
      });

      if (!payment) {
        await tx.paymentWebhookEvent.update({
          where: { id: webhookEvent.id },
          data: { processingStatus: "IGNORED", processedAt: new Date() },
        });
        return { duplicate: false, processed: false };
      }

      let processed = false;
      if (PAID_EVENTS.has(eventType)) {
        const stockClaim = await tx.payment.updateMany({
          where: { id: payment.id, stockCommittedAt: null },
          data: {
            status: "PAGO",
            paidAt: payment.paidAt ?? new Date(),
            confirmedAt: payment.confirmedAt ?? new Date(),
            stockCommittedAt: new Date(),
            lastProviderStatus:
              typeof body.payment?.status === "string" ? body.payment.status : eventType,
          },
        });
        if (stockClaim.count === 1) await updateStock(tx, payment.orderId, "decrement");
        if (stockClaim.count === 0) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "PAGO",
              lastProviderStatus:
                typeof body.payment?.status === "string" ? body.payment.status : eventType,
            },
          });
        }
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.PAGAMENTO_APROVADO,
            statusHistory: {
              create: {
                status: OrderStatus.PAGAMENTO_APROVADO,
                note: "Pagamento confirmado pelo Asaas",
              },
            },
          },
        });
        processed = true;
      } else if (
        REFUND_EVENTS.has(eventType) ||
        FAILED_EVENTS.has(eventType) ||
        EXPIRED_EVENTS.has(eventType)
      ) {
        const shouldRestock =
          payment.stockCommittedAt !== null && payment.refundedAt === null;
        const isRefund = REFUND_EVENTS.has(eventType);
        const isExpired = EXPIRED_EVENTS.has(eventType);
        const paymentStatus = isRefund ? "REEMBOLSADO" : isExpired ? "EXPIRADO" : "RECUSADO";
        const orderStatus = isRefund
          ? OrderStatus.REEMBOLSADO
          : isExpired
            ? OrderStatus.PAGAMENTO_EXPIRADO
            : OrderStatus.FALHA_NO_PAGAMENTO;

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: paymentStatus,
            refundedAt: shouldRestock ? new Date() : payment.refundedAt,
            cancelledAt: isRefund ? payment.cancelledAt : new Date(),
            lastProviderStatus:
              typeof body.payment?.status === "string" ? body.payment.status : eventType,
          },
        });
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: orderStatus,
            statusHistory: {
              create: {
                status: orderStatus,
                note: `Pagamento atualizado pelo Asaas: ${eventType}`,
              },
            },
          },
        });
        if (shouldRestock) await updateStock(tx, payment.orderId, "increment");
        processed = true;
      }

      await tx.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingStatus: processed ? "PROCESSED" : "IGNORED",
          processedAt: new Date(),
        },
      });
      return { duplicate: false, processed };
    });

    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
