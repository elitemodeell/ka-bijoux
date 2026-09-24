import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PaymentConfigurationError } from "@/lib/payments/types";

const refundRouteMocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  findOrder: vi.fn(),
  createPaymentService: vi.fn(),
  requestOrderRefund: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAdmin: refundRouteMocks.requireAdmin,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: refundRouteMocks.findOrder },
  },
}));

vi.mock("@/lib/payments/payment-service", () => ({
  createPaymentService: refundRouteMocks.createPaymentService,
}));

vi.mock("@/lib/payments/webhook-processor", () => ({
  requestOrderRefund: refundRouteMocks.requestOrderRefund,
}));

import { POST } from "@/app/api/admin/orders/[id]/refund/route";

const paymentService = { provider: { id: "ASAAS" } };

function request() {
  return new NextRequest("http://localhost/api/admin/orders/order-1/refund", {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  refundRouteMocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
  refundRouteMocks.findOrder.mockResolvedValue({
    id: "order-1",
    payment: { id: "payment-1" },
  });
  refundRouteMocks.createPaymentService.mockReturnValue(paymentService);
  refundRouteMocks.requestOrderRefund.mockResolvedValue({
    orderId: "order-1",
    externalPaymentId: "pay-1",
    status: "REFUNDED",
    rawStatus: "REFUNDED",
    stockRestored: true,
  });
});

describe("POST /api/admin/orders/[id]/refund", () => {
  it("returns 401 for a non-admin before reading the order or touching payment", async () => {
    refundRouteMocks.requireAdmin.mockRejectedValueOnce(
      new Error("Acesso não autorizado")
    );

    const response = await POST(request(), { params: Promise.resolve({ id: "order-1" }) });

    expect(response.status).toBe(401);
    expect(refundRouteMocks.findOrder).not.toHaveBeenCalled();
    expect(refundRouteMocks.createPaymentService).not.toHaveBeenCalled();
    expect(refundRouteMocks.requestOrderRefund).not.toHaveBeenCalled();
  });

  it("returns 503 without a mock fallback when Asaas configuration is absent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    refundRouteMocks.createPaymentService.mockImplementationOnce(() => {
      throw new PaymentConfigurationError("ASAAS_API_KEY não configurado.");
    });

    const response = await POST(request(), { params: Promise.resolve({ id: "order-1" }) });

    expect(response.status).toBe(503);
    expect(refundRouteMocks.requestOrderRefund).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: "Serviço de pagamento indisponível.",
    });
  });

  it("delegates an authorized refund only to the shared Asaas refund workflow", async () => {
    const response = await POST(request(), { params: Promise.resolve({ id: "order-1" }) });

    expect(response.status).toBe(200);
    expect(refundRouteMocks.requestOrderRefund).toHaveBeenCalledOnce();
    expect(refundRouteMocks.requestOrderRefund).toHaveBeenCalledWith(
      "order-1",
      paymentService,
      "Estorno total solicitado pelo administrador."
    );
    await expect(response.json()).resolves.toMatchObject({
      data: {
        status: "REFUNDED",
        stockRestored: true,
      },
    });
  });
});
