import { describe, expect, it, vi } from "vitest";
import { AsaasPaymentProvider } from "@/lib/payments/asaas-provider";
import {
  loadAsaasFeatureConfig,
  loadPaymentRoutingConfig,
  type AsaasPaymentConfig,
} from "@/lib/payments/config";
import { PaymentProviderFactory } from "@/lib/payments/provider-factory";
import {
  PaymentConfigurationError,
  PaymentValidationError,
  type CreateCreditCardCheckoutRequest,
  type PaymentFetch,
  type PaymentProvider,
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

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function scriptedFetch(...responses: Response[]) {
  const queue = [...responses];
  const mock = vi.fn<PaymentFetch>(async (input) => {
    const url = String(input);
    if (url.endsWith("/myAccount/commercialInfo/")) {
      return response({ companyName: "KABIJOUX LTDA", cpfCnpj: "31.042.012/0001-02" });
    }
    if (url.endsWith("/wallets/")) {
      return response([{ id: "wallet-ka-tests" }]);
    }
    const next = queue.shift();
    if (!next) throw new Error("Unexpected offline HTTP call.");
    return next;
  });
  return { fetch: mock, mock };
}

function customer() {
  return {
    internalId: "customer-1",
    persistedExternalCustomerId: "cus_1",
    name: "Cliente Teste",
    cpfCnpj: "52998224725",
    email: "cliente@example.test",
    phone: "31999999999",
  };
}

function cardRequest(
  installmentCount = 1
): CreateCreditCardCheckoutRequest {
  return {
    orderId: "order-1",
    orderNumber: "KA-1",
    amount: 120,
    installmentCount,
    maxInstallmentCount: 3,
    minutesToExpire: 60,
    callback: {
      successUrl: "https://kabijoux.com.br/pagamento/sucesso",
      cancelUrl: "https://kabijoux.com.br/pagamento/cancelado",
      expiredUrl: "https://kabijoux.com.br/pagamento/expirado",
    },
    items: [
      {
        externalReference: "order-1",
        name: "Pedido KA-1",
        quantity: 1,
        value: 120,
      },
    ],
    customer: customer(),
  };
}

function checkoutPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "checkout-1",
    link: "https://sandbox.asaas.com/checkoutSession/show/checkout-1",
    status: "ACTIVE",
    externalReference: "order-1",
    minutesToExpire: 60,
    ...overrides,
  };
}

function env(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "test",
    PAYMENT_PROVIDER: "ASAAS",
    PAYMENT_DEFAULT_PROVIDER: "ASAAS",
    PAYMENT_PIX_PROVIDER: "ASAAS",
    PAYMENT_CARD_PROVIDER: "ASAAS",
    PAYMENT_BOLETO_PROVIDER: "ASAAS",
    ASAAS_ENVIRONMENT: "sandbox",
    ASAAS_API_KEY: "synthetic-offline-key",
    ASAAS_EXPECTED_LEGAL_NAME: "KABIJOUX LTDA",
    ASAAS_EXPECTED_CPF_CNPJ: "31042012000102",
    ASAAS_EXPECTED_WALLET_ID: "wallet-ka-tests",
    ASAAS_PIX_ENABLED: "true",
    ASAAS_CREDIT_CARD_ENABLED: "true",
    ASAAS_BOLETO_ENABLED: "true",
    ASAAS_MAX_INSTALLMENTS: "3",
    PAYMENT_PIX_DUE_DAYS: "1",
    PAYMENT_BOLETO_DUE_DAYS: "3",
    PAYMENT_CHECKOUT_EXPIRATION_MINUTES: "60",
    PAYMENT_CHECKOUT_RETURN_URL: "https://kabijoux.com.br",
    ...overrides,
  };
}

describe("multi-provider routing", () => {
  it.each(["PIX", "CREDIT_CARD", "BOLETO"] as const)(
    "resolves Asaas for %s",
    (method) => {
      expect(loadPaymentRoutingConfig(env()).providersByMethod[method]).toBe(
        "ASAAS"
      );
    }
  );

  it("rejects Mercado Pago configured for one method", () => {
    expect(() =>
      loadPaymentRoutingConfig(env({ PAYMENT_CARD_PROVIDER: "MERCADO_PAGO" }))
    ).toThrow(/não possui implementação ativa/);
  });

  it("publishes only enabled methods without secrets", () => {
    const features = loadAsaasFeatureConfig(
      env({ ASAAS_BOLETO_ENABLED: "false" })
    );
    expect(features.enabledMethods).toEqual({
      PIX: true,
      CREDIT_CARD: true,
      BOLETO: false,
    });
    expect(JSON.stringify(features)).not.toContain("synthetic-offline-key");
  });

  it.each([
    ["ASAAS_MAX_INSTALLMENTS", "4"],
    ["PAYMENT_CHECKOUT_EXPIRATION_MINUTES", "9"],
    ["ASAAS_CREDIT_CARD_ENABLED", "yes"],
  ])("fails closed for invalid %s", (name, value) => {
    expect(() => loadAsaasFeatureConfig(env({ [name]: value }))).toThrow(
      PaymentConfigurationError
    );
  });
});

describe("Asaas hosted credit card checkout", () => {
  it.each([1, 2, 3])("creates a secure checkout for %sx", async (count) => {
    const http = scriptedFetch(response(checkoutPayload()));
    const provider = new AsaasPaymentProvider({
      config,
      fetch: http.fetch,
      now: () => new Date("2026-07-27T12:00:00Z"),
    });
    const result = await provider.createCreditCardCheckout(cardRequest(count));

    expect(result).toMatchObject({
      provider: "ASAAS",
      method: "CREDIT_CARD",
      externalCheckoutId: "checkout-1",
      externalReference: "order-1",
      amount: 120,
      installmentCount: count,
      status: "PENDING",
    });
    const createCall = http.mock.mock.calls.find(
      ([url, init]) => String(url).endsWith("/checkouts") && init?.method === "POST"
    );
    expect(createCall).toBeDefined();
    const body = JSON.parse(String(createCall?.[1]?.body));
    expect(body.billingTypes).toEqual(["CREDIT_CARD"]);
    expect(body.externalReference).toBe("order-1");
    expect(body.callback.successUrl).toMatch(/^https:/);
    expect(JSON.stringify(body)).not.toMatch(/cardNumber|cvv|creditCardNumber/i);
    if (count > 1) {
      expect(body.installment.maxInstallmentCount).toBe(count);
    } else {
      expect(body.installment).toBeUndefined();
    }
  });

  it.each([0, 4])("rejects invalid installment count %s", async (count) => {
    const provider = new AsaasPaymentProvider({
      config,
      fetch: scriptedFetch().fetch,
    });
    await expect(
      provider.createCreditCardCheckout(cardRequest(count))
    ).rejects.toBeInstanceOf(PaymentValidationError);
  });

  it("does not accept the callback as payment confirmation", async () => {
    const http = scriptedFetch(response(checkoutPayload({ status: "ACTIVE" })));
    const provider = new AsaasPaymentProvider({ config, fetch: http.fetch });
    const result = await provider.createCreditCardCheckout(cardRequest());
    expect(result.status).toBe("PENDING");
  });

  it("rejects a non-HTTPS callback", async () => {
    const provider = new AsaasPaymentProvider({
      config,
      fetch: scriptedFetch().fetch,
    });
    const request = cardRequest();
    request.callback.successUrl = "http://insecure.test/success";
    await expect(
      provider.createCreditCardCheckout(request)
    ).rejects.toBeInstanceOf(PaymentValidationError);
  });

  it("rejects item totals divergent from the server total", async () => {
    const provider = new AsaasPaymentProvider({
      config,
      fetch: scriptedFetch().fetch,
    });
    const request = cardRequest();
    request.items[0].value = 1;
    await expect(
      provider.createCreditCardCheckout(request)
    ).rejects.toThrow(/soma dos itens/);
  });
});

describe("Asaas boleto", () => {
  it("creates a pending boleto and retrieves its digitable line", async () => {
    const http = scriptedFetch(
      response({
        id: "cus_1",
        cpfCnpj: "52998224725",
        externalReference: "customer-1",
      }),
      response({ data: [] }),
      response({
        id: "pay_boleto_1",
        customer: "cus_1",
        billingType: "BOLETO",
        value: 120,
        status: "PENDING",
        dueDate: "2026-07-30",
        bankSlipUrl: "https://sandbox.asaas.com/b/pdf",
        externalReference: "order-1",
      }),
      response({ identificationField: "001900000000000000000000000" })
    );
    const provider = new AsaasPaymentProvider({
      config,
      fetch: http.fetch,
      now: () => new Date("2026-07-27T12:00:00Z"),
    });
    const result = await provider.createBoletoPayment({
      orderId: "order-1",
      orderNumber: "KA-1",
      amount: 120,
      dueDate: "2026-07-30",
      customer: customer(),
    });
    expect(result).toMatchObject({
      method: "BOLETO",
      status: "PENDING",
      externalPaymentId: "pay_boleto_1",
      bankSlip: {
        bankSlipUrl: "https://sandbox.asaas.com/b/pdf",
        identificationField: "001900000000000000000000000",
      },
    });
    const createCall = http.mock.mock.calls.find(
      ([url, init]) => String(url).endsWith("/payments") && init?.method === "POST"
    );
    expect(createCall).toBeDefined();
    const body = JSON.parse(String(createCall?.[1]?.body));
    expect(body.billingType).toBe("BOLETO");
    expect(body.daysAfterDueDateToRegistrationCancellation).toBe(0);
  });
});

describe("Asaas card and checkout webhook normalization", () => {
  it.each([
    ["PAYMENT_CONFIRMED", "CONFIRMED", "PAID"],
    ["PAYMENT_AWAITING_RISK_ANALYSIS", "AWAITING_RISK_ANALYSIS", "UNDER_REVIEW"],
    ["PAYMENT_CREDIT_CARD_CAPTURE_REFUSED", "CREDIT_CARD_CAPTURE_REFUSED", "FAILED"],
  ] as const)("maps %s to %s", (event, rawStatus, expected) => {
    const provider = new AsaasPaymentProvider({
      config,
      fetch: scriptedFetch().fetch,
    });
    const normalized = provider.interpretWebhook({
      id: `evt-${event}`,
      event,
      payment: { id: "pay_card_1", status: rawStatus },
    });
    expect(normalized).toMatchObject({
      provider: "ASAAS",
      externalPaymentId: "pay_card_1",
      status: expected,
      rawPaymentStatus: rawStatus,
    });
  });

  it("keeps CHECKOUT_PAID separate from the financial payment event", () => {
    const provider = new AsaasPaymentProvider({
      config,
      fetch: scriptedFetch().fetch,
    });
    const normalized = provider.interpretWebhook({
      id: "evt-checkout-paid",
      event: "CHECKOUT_PAID",
      checkout: { id: "checkout-1", status: "PAID" },
    });
    expect(normalized).toMatchObject({
      eventType: "CHECKOUT_PAID",
      externalPaymentId: "checkout-1",
      status: "PAID",
    });
  });
});

describe("provider identity remains explicit", () => {
  it("resolves a stored Asaas provider independently of defaults", () => {
    const asaas = {
      id: "ASAAS",
      supportedMethods: ["PIX"],
    } as unknown as PaymentProvider;
    const factory = new PaymentProviderFactory({
      env: env(),
      providers: { ASAAS: asaas },
    });
    expect(factory.resolveById("ASAAS")).toBe(asaas);
  });

  it("never creates a fictitious Mercado Pago provider", () => {
    const asaas = {
      id: "ASAAS",
      supportedMethods: ["PIX"],
    } as unknown as PaymentProvider;
    const factory = new PaymentProviderFactory({
      env: env(),
      providers: { ASAAS: asaas },
    });
    expect(() => factory.resolveById("MERCADO_PAGO")).toThrow(
      /não possui implementação ativa/
    );
  });
});
