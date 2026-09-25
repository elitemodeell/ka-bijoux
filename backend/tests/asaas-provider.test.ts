import { describe, expect, it, vi } from "vitest";
import { AsaasPaymentProvider } from "@/lib/payments/asaas-provider";
import type { AsaasPaymentConfig } from "@/lib/payments/config";
import {
  PaymentProviderError,
  PaymentValidationError,
  type CreatePixPaymentRequest,
  type PaymentFetch,
} from "@/lib/payments/types";

const config: AsaasPaymentConfig = {
  provider: "ASAAS",
  environment: "sandbox",
  baseUrl: "https://api-sandbox.asaas.com/v3",
  apiKey: "synthetic-offline-key",
  userAgent: "KA-Bijoux/tests",
  expectedAccount: {
    legalName: "KABIJOUX LTDA",
    cpfCnpj: "31042012000102",
    walletId: "wallet-ka-tests",
  },
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function scriptedFetch(...responses: Response[]) {
  const queue = [...responses];
  const mock = vi.fn<PaymentFetch>(async (input, _init) => {
    const url = String(input);
    if (url.endsWith("/myAccount/commercialInfo/")) {
      return response({ companyName: "KABIJOUX LTDA", cpfCnpj: "31.042.012/0001-02" });
    }
    if (url.endsWith("/wallets/")) {
      return response([{ id: "wallet-ka-tests" }]);
    }
    const next = queue.shift();
    if (!next) throw new Error("Unexpected HTTP call in offline provider test.");
    return next;
  });
  return { fetch: mock, mock };
}

function customerPayload() {
  return {
    id: "cus_asaas_1",
    cpfCnpj: "52998224725",
    externalReference: "customer-1",
  };
}

function paymentPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "pay_asaas_1",
    customer: "cus_asaas_1",
    billingType: "PIX",
    value: 42.5,
    status: "PENDING",
    dueDate: "2099-07-28",
    externalReference: "order-1",
    ...overrides,
  };
}

function pixPayload() {
  return {
    payload: "pix-copy-and-paste-sandbox",
    encodedImage: "base64-qr-sandbox",
    expirationDate: "2099-07-28T23:59:59Z",
  };
}

function paymentRequest(overrides: Partial<CreatePixPaymentRequest> = {}): CreatePixPaymentRequest {
  return {
    orderId: "order-1",
    orderNumber: "KA-0001",
    amount: 42.5,
    dueDate: "2099-07-28",
    customer: {
      internalId: "customer-1",
      persistedExternalCustomerId: "cus_asaas_1",
      name: "Cliente de Teste",
      cpfCnpj: "529.982.247-25",
      email: "cliente@example.test",
      phone: "31999999999",
    },
    ...overrides,
  };
}

describe("AsaasPaymentProvider offline contract", () => {
  it("creates one Sandbox Pix with the exact server amount and internal order reference", async () => {
    const http = scriptedFetch(
      response(customerPayload()),
      response({ data: [] }),
      response(paymentPayload()),
      response(pixPayload())
    );
    const provider = new AsaasPaymentProvider({
      config,
      fetch: http.fetch,
      now: () => new Date("2026-07-27T12:00:00Z"),
    });

    const result = await provider.createPixPayment(paymentRequest());

    expect(result).toMatchObject({
      provider: "ASAAS",
      externalPaymentId: "pay_asaas_1",
      externalReference: "order-1",
      amount: 42.5,
      method: "PIX",
      reusedExistingPayment: false,
      pix: {
        copyAndPaste: "pix-copy-and-paste-sandbox",
        qrCodeBase64: "base64-qr-sandbox",
      },
    });
    const createCall = http.mock.mock.calls.find(
      ([url, init]) => String(url).endsWith("/payments") && init?.method === "POST"
    );
    expect(createCall).toBeDefined();
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      customer: "cus_asaas_1",
      billingType: "PIX",
      value: 42.5,
      externalReference: "order-1",
    });
    expect(String(createCall?.[0]).startsWith("https://api-sandbox.asaas.com/v3")).toBe(true);
  });

  it("[11] prevents creating two charges for the same order by reusing the existing charge", async () => {
    const http = scriptedFetch(
      response(customerPayload()),
      response({ data: [paymentPayload()] }),
      response(pixPayload())
    );
    const provider = new AsaasPaymentProvider({ config, fetch: http.fetch });

    const result = await provider.createPixPayment(paymentRequest());

    expect(result.reusedExistingPayment).toBe(true);
    expect(
      http.mock.mock.calls.filter(
        ([url, init]) => String(url).endsWith("/payments") && init?.method === "POST"
      )
    ).toHaveLength(0);
  });

  it("preserves the external payment id and safe request context when Pix QR retrieval fails", async () => {
    const http = scriptedFetch(
      response(customerPayload()),
      response({ data: [] }),
      response(paymentPayload()),
      response(
        { errors: [{ code: "invalid_action", description: "Pix key is not available." }] },
        400
      )
    );
    const provider = new AsaasPaymentProvider({ config, fetch: http.fetch });

    await expect(provider.createPixPayment(paymentRequest())).rejects.toMatchObject({
      name: "PaymentProviderError",
      operation: "get_pix_qr_code",
      statusCode: 400,
      providerCode: "invalid_action",
      endpoint: "GET /payments/pay_asaas_1/pixQrCode",
      externalResourceId: "pay_asaas_1",
      retryable: false,
    });
  });

  it("fails closed when two charges already exist for the same order", async () => {
    const http = scriptedFetch(
      response(customerPayload()),
      response({
        data: [
          paymentPayload({ id: "pay_duplicate_1" }),
          paymentPayload({ id: "pay_duplicate_2" }),
        ],
      })
    );
    const provider = new AsaasPaymentProvider({ config, fetch: http.fetch });

    await expect(provider.createPixPayment(paymentRequest())).rejects.toMatchObject({
      name: "PaymentProviderError",
      operation: "find_payment",
    });
  });

  it("[17] rejects an Asaas amount that diverges from the internal order", async () => {
    const http = scriptedFetch(
      response(customerPayload()),
      response({ data: [paymentPayload({ value: 1 })] })
    );
    const provider = new AsaasPaymentProvider({ config, fetch: http.fetch });

    await expect(provider.createPixPayment(paymentRequest())).rejects.toBeInstanceOf(
      PaymentProviderError
    );
  });

  it("[18] rejects an Asaas charge linked to another order", async () => {
    const http = scriptedFetch(
      response(customerPayload()),
      response({ data: [] }),
      response(paymentPayload({ externalReference: "another-order" }))
    );
    const provider = new AsaasPaymentProvider({ config, fetch: http.fetch });

    await expect(provider.createPixPayment(paymentRequest())).rejects.toMatchObject({
      name: "PaymentProviderError",
      operation: "find_payment",
    });
  });

  it("rejects zero, negative and over-precision amounts before creating a charge", async () => {
    const http = scriptedFetch();
    const provider = new AsaasPaymentProvider({ config, fetch: http.fetch });

    await expect(provider.createPixPayment(paymentRequest({ amount: 0 }))).rejects.toBeInstanceOf(
      PaymentValidationError
    );
    await expect(provider.createPixPayment(paymentRequest({ amount: -1 }))).rejects.toBeInstanceOf(
      PaymentValidationError
    );
    await expect(
      provider.createPixPayment(paymentRequest({ amount: 10.001 }))
    ).rejects.toBeInstanceOf(PaymentValidationError);
    expect(http.mock).not.toHaveBeenCalled();
  });

  it("interprets a valid webhook without trusting it as a payment lookup", () => {
    const http = scriptedFetch();
    const provider = new AsaasPaymentProvider({ config, fetch: http.fetch });

    expect(
      provider.interpretWebhook({
        id: "evt_1",
        event: "PAYMENT_RECEIVED",
        dateCreated: "2026-07-27T12:00:00Z",
        payment: { id: "pay_asaas_1", status: "RECEIVED" },
      })
    ).toEqual({
      provider: "ASAAS",
      externalEventId: "evt_1",
      eventType: "PAYMENT_RECEIVED",
      externalPaymentId: "pay_asaas_1",
      occurredAt: "2026-07-27T12:00:00Z",
      status: "PAID",
      rawPaymentStatus: "RECEIVED",
    });
    expect(http.mock).not.toHaveBeenCalled();
  });

  it("rejects malformed webhook bodies and missing event/payment identifiers", () => {
    const provider = new AsaasPaymentProvider({ config, fetch: scriptedFetch().fetch });

    expect(() => provider.interpretWebhook(null)).toThrow(PaymentValidationError);
    expect(() => provider.interpretWebhook({ event: "PAYMENT_RECEIVED", payment: {} })).toThrow(
      PaymentValidationError
    );
    expect(() =>
      provider.interpretWebhook({ id: "evt_1", event: "PAYMENT_RECEIVED", payment: {} })
    ).toThrow(PaymentValidationError);
  });

  it("[21] refunds through the injected client and verifies the resulting provider state", async () => {
    const http = scriptedFetch(
      response({ success: true }),
      response(paymentPayload({ status: "REFUNDED" }))
    );
    const provider = new AsaasPaymentProvider({ config, fetch: http.fetch });

    const result = await provider.refundPayment({
      externalPaymentId: "pay_asaas_1",
      amount: 42.5,
      description: "Estoque indisponível",
    });

    expect(result).toMatchObject({
      externalPaymentId: "pay_asaas_1",
      status: "REFUNDED",
      amount: 42.5,
    });
    const refundCall = http.mock.mock.calls.find(
      ([url, init]) => String(url).endsWith("/payments/pay_asaas_1/refund") && init?.method === "POST"
    );
    expect(refundCall).toBeDefined();
  });

  it("does not reuse a persisted Asaas customer linked to another internal customer", async () => {
    const http = scriptedFetch(
      response(customerPayload(), 200)
    );
    const provider = new AsaasPaymentProvider({ config, fetch: http.fetch });
    const request = paymentRequest();
    request.customer.internalId = "customer-2";

    await expect(provider.createPixPayment(request)).rejects.toMatchObject({
      name: "PaymentProviderError",
      operation: "get_customer",
    });
  });

  it("adopts one legacy Asaas customer with the same CPF and no external reference", async () => {
    const legacyCustomer = { ...customerPayload(), externalReference: null };
    const http = scriptedFetch(
      response({ data: [legacyCustomer] }),
      response(customerPayload())
    );
    const provider = new AsaasPaymentProvider({ config, fetch: http.fetch });

    const result = await provider.findOrCreateCustomer({
      ...paymentRequest().customer,
      persistedExternalCustomerId: null,
    });

    expect(result).toMatchObject({
      externalCustomerId: "cus_asaas_1",
      externalReference: "customer-1",
      created: false,
    });
    const updateCall = http.mock.mock.calls.find(
      ([url, init]) => String(url).includes("/customers/cus_asaas_1") && init?.method === "PUT"
    );
    expect(updateCall).toBeDefined();
  });

  it("fails closed when the same CPF has more than one active Asaas customer", async () => {
    const http = scriptedFetch(response({
      data: [customerPayload(), { ...customerPayload(), id: "cus_asaas_2" }],
    }));
    const provider = new AsaasPaymentProvider({ config, fetch: http.fetch });

    await expect(provider.findOrCreateCustomer({
      ...paymentRequest().customer,
      persistedExternalCustomerId: null,
    })).rejects.toMatchObject({
      name: "PaymentProviderError",
      operation: "find_customer",
    });
    expect(http.mock).toHaveBeenCalledTimes(3);
  });

  it("fails closed before any charge lookup when the authenticated account is not KA Bijoux", async () => {
    const mock = vi.fn<PaymentFetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/myAccount/commercialInfo/")) {
        return response({ companyName: "ELITE MODEL LTDA", cpfCnpj: "00000000000071" });
      }
      if (url.endsWith("/wallets/")) return response([{ id: "wallet-elite" }]);
      throw new Error("No financial operation should be attempted.");
    });
    const provider = new AsaasPaymentProvider({ config, fetch: mock });

    await expect(provider.createPixPayment(paymentRequest())).rejects.toMatchObject({
      name: "PaymentProviderError",
      operation: "verify_account_identity",
    });
    expect(mock.mock.calls.some(([url]) => String(url).includes("/payments"))).toBe(false);
    expect(mock.mock.calls.some(([url]) => String(url).includes("/customers"))).toBe(false);
  });

  it("fails closed when account identity lookup is unavailable", async () => {
    const mock = vi.fn<PaymentFetch>(async () => {
      throw new Error("network unavailable");
    });
    const provider = new AsaasPaymentProvider({ config, fetch: mock });

    await expect(provider.createPixPayment(paymentRequest())).rejects.toMatchObject({
      name: "PaymentProviderError",
      operation: "verify_account_identity",
      retryable: true,
    });
  });
});
