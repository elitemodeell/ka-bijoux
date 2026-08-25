import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  eventFind: vi.fn(),
  eventCreate: vi.fn(),
  eventUpdate: vi.fn(),
  paymentFind: vi.fn(),
  paymentUpdateMany: vi.fn(),
  paymentUpdate: vi.fn(),
  orderUpdate: vi.fn(),
  orderItems: vi.fn(),
  productUpdate: vi.fn(),
  variationUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
import { POST } from "@/app/api/payment/webhook/route";

function request(event: Record<string, unknown>, token = "secure-webhook-token-with-32-characters") {
  return new NextRequest("https://kabijoux.com.br/api/payment/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "asaas-access-token": token },
    body: JSON.stringify(event),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ASAAS_WEBHOOK_TOKEN = "secure-webhook-token-with-32-characters";
  mocks.transaction.mockImplementation((callback) => callback({
    paymentWebhookEvent: { findUnique: mocks.eventFind, create: mocks.eventCreate, update: mocks.eventUpdate },
    payment: { findFirst: mocks.paymentFind, updateMany: mocks.paymentUpdateMany, update: mocks.paymentUpdate },
    order: { update: mocks.orderUpdate },
    orderItem: { findMany: mocks.orderItems },
    product: { update: mocks.productUpdate },
    productVariation: { update: mocks.variationUpdate },
  }));
  mocks.eventFind.mockResolvedValue(null);
  mocks.eventCreate.mockResolvedValue({ id: "event-1" });
  mocks.eventUpdate.mockResolvedValue({});
  mocks.paymentFind.mockResolvedValue({
    id: "payment-1",
    orderId: "order-1",
    status: "AGUARDANDO",
    stockCommittedAt: null,
    refundedAt: null,
    paidAt: null,
    confirmedAt: null,
    order: {},
  });
  mocks.paymentUpdateMany.mockResolvedValue({ count: 1 });
  mocks.orderUpdate.mockResolvedValue({});
  mocks.orderItems.mockResolvedValue([{ productId: "product-1", variationId: null, quantity: 2 }]);
  mocks.productUpdate.mockResolvedValue({});
});

describe("webhook autenticado e idempotente do Asaas", () => {
  it("rejeita token inválido", async () => {
    const response = await POST(request({ id: "evt_1", event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }, "wrong"));
    expect(response.status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("aprova pagamento e baixa estoque uma única vez", async () => {
    const event = { id: "evt_1", event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } };
    const first = await POST(request(event));
    expect(first.status).toBe(200);
    expect(mocks.paymentUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "payment-1", stockCommittedAt: null } }));
    expect(mocks.productUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stock: { decrement: 2 } }) }));

    mocks.eventFind.mockResolvedValue({ id: "stored-event" });
    const duplicate = await POST(request(event));
    const payload = await duplicate.json();
    expect(payload.duplicate).toBe(true);
    expect(mocks.productUpdate).toHaveBeenCalledTimes(1);
  });

  it("marca reembolso e devolve estoque apenas quando estava pago", async () => {
    mocks.paymentFind.mockResolvedValue({
      id: "payment-1",
      orderId: "order-1",
      status: "PAGO",
      stockCommittedAt: new Date(),
      refundedAt: null,
      cancelledAt: null,
      order: {},
    });
    mocks.paymentUpdate.mockResolvedValue({});
    const response = await POST(request({ id: "evt_refund", event: "PAYMENT_REFUNDED", payment: { id: "pay_1" } }));
    expect(response.status).toBe(200);
    expect(mocks.paymentUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "REEMBOLSADO" }) }));
    expect(mocks.productUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stock: { increment: 2 } }) }));
  });
});
