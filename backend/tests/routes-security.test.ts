import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const routeMocks = vi.hoisted(() => ({
  requireCustomer: vi.fn(),
  requireAdmin: vi.fn(),
  createOrResumeCheckout: vi.fn(),
  getPaymentService: vi.fn(),
  prisma: {
    order: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireCustomer: routeMocks.requireCustomer,
  requireAdmin: routeMocks.requireAdmin,
}));

vi.mock("@/lib/checkout/checkout-service", () => ({
  createOrResumeCheckout: routeMocks.createOrResumeCheckout,
}));

vi.mock("@/lib/payments/payment-service", () => ({
  getPaymentService: routeMocks.getPaymentService,
}));

vi.mock("@/lib/prisma", () => ({ prisma: routeMocks.prisma }));

import { POST as checkoutPost } from "@/app/api/orders/route";
import { POST as mercadoPagoWebhookPost } from "@/app/api/payment/webhook/route";

function checkoutRequest(payload: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      shippingType: "MOTOTAXI",
      shippingOptionId: "mototaxi",
      addressId: "address-1",
      idempotencyKey: "229b21f0-e893-4f1c-9765-e129612d9ed7",
      ...payload,
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.requireCustomer.mockResolvedValue({ id: "customer-1" });
});

describe("strict checkout HTTP contract", () => {
  it("rejects a client-supplied shippingPrice, including zero, before checkout execution", async () => {
    const response = await checkoutPost(checkoutRequest({ shippingPrice: 0 }));

    expect(response.status).toBe(422);
    expect(routeMocks.createOrResumeCheckout).not.toHaveBeenCalled();
  });

  it("rejects client-supplied item and price fields before checkout execution", async () => {
    const response = await checkoutPost(
      checkoutRequest({
        subtotal: 0.01,
        total: 0.01,
        items: [{ productId: "product-1", quantity: 1, unitPrice: 0.01 }],
      })
    );

    expect(response.status).toBe(422);
    expect(routeMocks.createOrResumeCheckout).not.toHaveBeenCalled();
  });
});

describe("disabled Mercado Pago webhook", () => {
  it("[25] returns HTTP 410 and never processes a legacy Mercado Pago event", async () => {
    const response = await mercadoPagoWebhookPost();

    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      code: "PAYMENT_PROVIDER_DISABLED",
    });
  });
});