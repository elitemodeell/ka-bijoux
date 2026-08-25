import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const backendRoot = resolve(__dirname, "..");
const mobileRoot = resolve(__dirname, "../../mobile");
const backendSource = (path: string) => readFileSync(resolve(backendRoot, path), "utf8");
const mobileSource = (path: string) => readFileSync(resolve(mobileRoot, path), "utf8");

describe("gates de segurança de pagamentos em produção", () => {
  it("não contém caminhos mock ou Mercado Pago no processamento ativo", () => {
    const payment = backendSource("lib/payment.ts");
    const webhook = backendSource("app/api/payment/webhook/route.ts");
    const refund = backendSource("app/api/admin/orders/[id]/refund/route.ts");
    for (const source of [payment, webhook, refund]) {
      expect(source).not.toMatch(/MOCK_|mercadopago\.com|MERCADO_PAGO|MERCADOPAGO_WEBHOOK/i);
    }
    expect(payment).toContain('provider !== "asaas"');
    expect(payment).toContain("throw new PaymentUnavailableError");
  });

  it("valida gateway e idempotência antes de criar o pedido", () => {
    const orders = backendSource("app/api/orders/route.ts");
    expect(orders.indexOf("assertPaymentMethodAvailable")).toBeLessThan(orders.indexOf("prisma.order.create"));
    expect(orders.indexOf('req.headers.get("idempotency-key")')).toBeLessThan(orders.indexOf("prisma.order.create"));
    expect(orders.indexOf("calculateShipping(")).toBeLessThan(orders.indexOf("prisma.order.create"));
    expect(orders).toContain("customerId: customer.id");
    expect(orders).toContain("Opção de frete inválida ou desatualizada.");
    expect(orders).toContain("idempotencyKey,");
    expect(orders).toContain('apiError("Pagamento temporariamente indisponível", 503)');
  });

  it("mobile gera e envia uma chave de idempotência por tentativa", () => {
    expect(mobileSource("app/checkout/pagamento.tsx")).toContain("useRef(Crypto.randomUUID())");
    expect(mobileSource("app/checkout/pagamento.tsx")).toContain("idempotencyKeyRef.current");
    expect(mobileSource("services/api.ts")).toContain('"Idempotency-Key": idempotencyKey');
  });

  it("webhook exige token Asaas e persiste IDs de eventos", () => {
    const webhook = backendSource("app/api/payment/webhook/route.ts");
    expect(webhook).toContain('req.headers.get("asaas-access-token")');
    expect(webhook).toContain("paymentWebhookEvent.findUnique");
    expect(webhook).toContain("paymentWebhookEvent.create");
  });
});
