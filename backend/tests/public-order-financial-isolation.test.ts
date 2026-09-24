import { afterEach, describe, expect, it, vi } from "vitest";
import { toPublicOrder } from "@/lib/checkout/public-order";

function order(providerAccountId: string | null, environment: string | null) {
  return {
    id: "order-1",
    subtotal: 12,
    shippingPrice: 0,
    discount: 0,
    total: 12,
    items: [],
    payment: {
      id: "payment-1",
      provider: "ASAAS",
      providerAccountId,
      environment,
      method: "PIX",
      status: "AGUARDANDO",
      amount: 12,
      pixCode: "sensitive-pix-payload",
      pixQrCode: "sensitive-pix-image",
      checkoutUrl: "https://example.test/checkout",
      boletoUrl: "https://example.test/boleto",
      boletoDigitableLine: "123456",
    },
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("public payment artifact isolation", () => {
  it("redacts legacy payment artifacts when their financial account is unknown", () => {
    vi.stubEnv("ASAAS_ENVIRONMENT", "production");
    vi.stubEnv("ASAAS_EXPECTED_WALLET_ID", "wallet-ka");

    const safe = toPublicOrder(order(null, null)) as any;

    expect(safe.payment).toMatchObject({
      pixCode: null,
      pixQrCode: null,
      checkoutUrl: null,
      boletoUrl: null,
      boletoDigitableLine: null,
    });
  });

  it("exposes artifacts only for the explicitly configured account and environment", () => {
    vi.stubEnv("ASAAS_ENVIRONMENT", "production");
    vi.stubEnv("ASAAS_EXPECTED_WALLET_ID", "wallet-ka");

    const safe = toPublicOrder(order("wallet-ka", "PRODUCTION")) as any;

    expect(safe.payment.pixCode).toBe("sensitive-pix-payload");
    expect(safe.payment.checkoutUrl).toBe("https://example.test/checkout");
  });
});
