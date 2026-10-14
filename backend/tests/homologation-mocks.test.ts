import { afterEach, describe, expect, it, vi } from "vitest";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { loadPaymentConfig } from "@/lib/payments/config";
import { createPaymentService } from "@/lib/payments/payment-service";
import { calculateShipping } from "@/lib/shipping";
import { runBlingOperation } from "@/lib/bling-adapter";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function isolatedMock() {
  vi.stubEnv("HOMOLOGATION_MODE", "isolated");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", "codex/security-audit-20261013");
}

describe("isolated homologation adapters", () => {
  it("acknowledges email locally without calling Resend", async () => {
    isolatedMock();
    vi.stubEnv("EMAIL_DELIVERY_MODE", "mock");
    const network = vi.spyOn(globalThis, "fetch");
    const result = await sendTransactionalEmail({ to: "synthetic@example.invalid", subject: "Synthetic", html: "<p>x</p>", text: "x" });
    expect(result).toMatchObject({ ok: true });
    expect(network).not.toHaveBeenCalled();
  });

  it("blocks Asaas before any network call in payment mock mode", () => {
    isolatedMock();
    const network = vi.spyOn(globalThis, "fetch");
    expect(() => loadPaymentConfig({
      HOMOLOGATION_MODE: "isolated",
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_REF: "codex/security-audit-20261013",
      PAYMENT_PROVIDER_MODE: "mock",
    })).toThrow(/chamadas ao Asaas estao bloqueadas/);
    expect(network).not.toHaveBeenCalled();
  });

  it("simulates approved and declined payments without Asaas", async () => {
    isolatedMock();
    vi.stubEnv("PAYMENT_PROVIDER_MODE", "mock");
    const network = vi.spyOn(globalThis, "fetch");
    const service = createPaymentService();
    const base = { orderNumber: "1", amount: 49.9, dueDate: "2026-10-20", customer: { internalId: "synthetic-customer", name: "Synthetic", cpfCnpj: "00000000000" } };
    await expect(service.createPixPayment({ ...base, orderId: "synthetic-approved" })).resolves.toMatchObject({ status: "PAID", rawStatus: "MOCK_PAID" });
    await expect(service.createPixPayment({ ...base, orderId: "synthetic-declined" })).resolves.toMatchObject({ status: "FAILED", rawStatus: "MOCK_FAILED" });
    expect(() => service.interpretWebhook({ simulateFailure: true })).toThrow(/Falha sintetica de webhook/);
    expect(network).not.toHaveBeenCalled();
  });

  it("calculates deterministic synthetic freight without Melhor Envio", async () => {
    isolatedMock();
    vi.stubEnv("SHIPPING_PROVIDER_MODE", "mock");
    const network = vi.spyOn(globalThis, "fetch");
    const rates = await calculateShipping("30110-000", [{ weight: 0.3, height: 5, width: 10, length: 15, quantity: 1, declaredValue: 25 }], {
      correiosEnabled: true, mototaxiEnabled: false, storePickupEnabled: false, mototaxiPrice: 10,
      storeZipCode: "35680056", packageWeight: 0.1, packageHeight: 4, packageWidth: 16, packageLength: 24, handlingDays: 1,
    });
    expect(rates).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "melhor-envio:1", price: 12.4, estimatedDays: 7 }),
      expect.objectContaining({ id: "melhor-envio:2", price: 22.4, estimatedDays: 3 }),
    ]));
    expect(network).not.toHaveBeenCalled();
  });

  it("returns a controlled Bling failure without external traffic", async () => {
    isolatedMock();
    vi.stubEnv("BLING_PROVIDER_MODE", "mock");
    const network = vi.spyOn(globalThis, "fetch");
    await expect(runBlingOperation({ operation: "stock-sync", simulateFailure: true })).resolves.toEqual({ ok: false, reason: "simulated_failure" });
    expect(network).not.toHaveBeenCalled();
  });

  it("rejects mock mode on production", () => {
    expect(() => loadPaymentConfig({ PAYMENT_PROVIDER_MODE: "mock", VERCEL_ENV: "production" }))
      .toThrow(/restricted to the isolated homologation branch/);
  });
});
