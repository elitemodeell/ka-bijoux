import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentMethod } from "@prisma/client";
import { PaymentUnavailableError, processPayment } from "@/lib/payment";

const request = {
  orderId: "order-1",
  orderNumber: "KA-ORDER-1",
  amount: 129.9,
  customer: { id: "customer-1", name: "Cliente", email: "cliente@example.test", cpf: null, phone: null },
};

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubEnv("PAYMENT_DEFAULT_PROVIDER", "ASAAS");
  vi.stubEnv("ASAAS_ENVIRONMENT", "sandbox");
  vi.stubEnv("ASAAS_API_KEY", "test-api-key-not-production");
  vi.stubEnv("ASAAS_PIX_ENABLED", "true");
  vi.stubEnv("ASAAS_CREDIT_CARD_ENABLED", "true");
  vi.stubEnv("ASAAS_BOLETO_ENABLED", "false");
});

describe("pagamentos Asaas sem fallback mock", () => {
  it("falha fechado antes de chamar o gateway quando a configuração está ausente", async () => {
    vi.stubEnv("ASAAS_API_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(processPayment({ ...request, method: PaymentMethod.PIX })).rejects.toBeInstanceOf(PaymentUnavailableError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("cria PIX real e recupera o código copia e cola", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => jsonResponse({ data: [{ id: "cus_1" }] }))
      .mockImplementationOnce(() => jsonResponse({ data: [] }))
      .mockImplementationOnce(() => jsonResponse({ id: "pay_1", invoiceUrl: "https://sandbox.asaas.com/i/1" }))
      .mockImplementationOnce(() => jsonResponse({ payload: "pix-copy-paste", expirationDate: "2026-08-25T12:00:00Z" }));

    const result = await processPayment({ ...request, method: PaymentMethod.PIX });

    expect(result).toMatchObject({ gatewayProvider: "ASAAS", gatewayId: "pay_1", pixCode: "pix-copy-paste" });
    expect(fetchSpy).toHaveBeenCalledTimes(4);
    const allRequests = fetchSpy.mock.calls.map(([url, init]) => `${url} ${String(init?.body ?? "")}`).join("\n");
    expect(allRequests).not.toMatch(/MOCK|mercadopago/i);
    expect(allRequests).toContain('"billingType":"PIX"');
    expect(allRequests).toContain('"externalReference":"KA-ORDER-1"');
  });

  it("cria cobrança de cartão para pagamento na fatura segura do Asaas", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => jsonResponse({ data: [{ id: "cus_1" }] }))
      .mockImplementationOnce(() => jsonResponse({ data: [] }))
      .mockImplementationOnce(() => jsonResponse({ id: "pay_card", invoiceUrl: "https://sandbox.asaas.com/i/card" }));

    const result = await processPayment({ ...request, method: PaymentMethod.CARTAO_CREDITO });
    expect(result.checkoutUrl).toBe("https://sandbox.asaas.com/i/card");
    expect(fetchSpy.mock.calls.map(([, init]) => String(init?.body ?? "")).join("\n")).toContain('"billingType":"CREDIT_CARD"');
  });

  it("reutiliza cobrança por externalReference em repetição idempotente", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => jsonResponse({ data: [{ id: "cus_1" }] }))
      .mockImplementationOnce(() => jsonResponse({ data: [{ id: "pay_existing", invoiceUrl: "https://sandbox.asaas.com/i/existing" }] }));

    const result = await processPayment({ ...request, method: PaymentMethod.CARTAO_CREDITO });
    expect(result.gatewayId).toBe("pay_existing");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });
});
