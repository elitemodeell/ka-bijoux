import { describe, expect, it, vi } from "vitest";
import { PaymentService, createPaymentService } from "@/lib/payments/payment-service";
import {
  PaymentValidationError,
  type PaymentProvider,
  type ProviderPayment,
} from "@/lib/payments/types";

function providerPayment(overrides: Partial<ProviderPayment> = {}): ProviderPayment {
  return {
    provider: "ASAAS" as const,
    externalPaymentId: "pay_1",
    externalCustomerId: "cus_1",
    externalReference: "order-1",
    method: "PIX",
    status: "PAID",
    rawStatus: "RECEIVED",
    amount: 50,
    dueDate: "2026-07-28",
    invoiceUrl: null,
    ...overrides,
  };
}

function fakeProvider(payment = providerPayment()): PaymentProvider {
  return {
    id: "ASAAS",
    supportedMethods: ["PIX"],
    assertAccountIdentity: vi.fn(async () => ({
      provider: "ASAAS" as const,
      environment: "sandbox" as const,
      accountId: "wallet-ka-tests",
      legalName: "KABIJOUX LTDA",
      cpfCnpj: "31042012000102",
    })),
    findOrCreateCustomer: vi.fn(),
    createPixPayment: vi.fn(),
    getPayment: vi.fn(async () => payment),
    cancelPayment: vi.fn(async (externalPaymentId) => ({
      provider: "ASAAS" as const,
      externalPaymentId,
      status: "CANCELED" as const,
      deleted: true,
      alreadyCanceled: false,
    })),
    refundPayment: vi.fn(async ({ externalPaymentId }) => ({
      provider: "ASAAS" as const,
      externalPaymentId,
      status: "REFUNDED" as const,
      rawStatus: "REFUNDED",
      amount: payment.amount,
    })),
    interpretWebhook: vi.fn(),
    mapStatus: vi.fn(() => "UNKNOWN" as const),
  };
}

describe("PaymentService verification", () => {
  it("accepts only a provider payment matching ID, order, Pix, amount and customer", async () => {
    const service = new PaymentService(fakeProvider());

    await expect(
      service.verifyPayment({
        externalPaymentId: "pay_1",
        orderId: "order-1",
        amount: 50,
        externalCustomerId: "cus_1",
      })
    ).resolves.toMatchObject({ isPaid: true });
  });

  it("rejects an Asaas value different from the internal order total", async () => {
    const service = new PaymentService(fakeProvider(providerPayment({ amount: 49.99 })));

    await expect(
      service.verifyPayment({ externalPaymentId: "pay_1", orderId: "order-1", amount: 50 })
    ).rejects.toThrow(/valor/);
  });

  it("rejects a charge linked to another order", async () => {
    const service = new PaymentService(
      fakeProvider(providerPayment({ externalReference: "another-order" }))
    );

    await expect(
      service.verifyPayment({ externalPaymentId: "pay_1", orderId: "order-1", amount: 50 })
    ).rejects.toThrow(/referência do pedido/);
  });

  it("rejects a charge linked to another external customer", async () => {
    const service = new PaymentService(
      fakeProvider(providerPayment({ externalCustomerId: "another-customer" }))
    );

    await expect(
      service.verifyPayment({
        externalPaymentId: "pay_1",
        orderId: "order-1",
        amount: 50,
        externalCustomerId: "cus_1",
      })
    ).rejects.toThrow(/cliente externo/);
  });
});

describe("PaymentService compensating operations", () => {
  it("treats refund of an already refunded payment as an idempotent no-op", async () => {
    const provider = fakeProvider(providerPayment({ status: "REFUNDED", rawStatus: "REFUNDED" }));
    const service = new PaymentService(provider);

    await expect(service.refundPayment({ externalPaymentId: "pay_1" })).resolves.toMatchObject({
      status: "REFUNDED" as const,
    });
    expect(provider.refundPayment).not.toHaveBeenCalled();
  });

  it("rejects a refund larger than the received payment", async () => {
    const provider = fakeProvider();
    const service = new PaymentService(provider);

    await expect(
      service.refundPayment({ externalPaymentId: "pay_1", amount: 50.01 })
    ).rejects.toBeInstanceOf(PaymentValidationError);
    expect(provider.refundPayment).not.toHaveBeenCalled();
  });

  it("does not allow refunding a pending Pix", async () => {
    const provider = fakeProvider(providerPayment({ status: "PENDING", rawStatus: "PENDING" }));
    const service = new PaymentService(provider);

    await expect(service.refundPayment({ externalPaymentId: "pay_1" })).rejects.toThrow(
      /Somente cobranças recebidas/
    );
    expect(provider.refundPayment).not.toHaveBeenCalled();
  });

  it("treats cancellation of an already canceled payment as an idempotent no-op", async () => {
    const provider = fakeProvider(providerPayment({ status: "CANCELED", rawStatus: "DELETED" }));
    const service = new PaymentService(provider);

    await expect(service.cancelPayment("pay_1")).resolves.toMatchObject({
      status: "CANCELED" as const,
      alreadyCanceled: true,
    });
    expect(provider.cancelPayment).not.toHaveBeenCalled();
  });

  it("constructs the service from an injected provider without reading environment or network", () => {
    const provider = fakeProvider();

    expect(createPaymentService({ provider }).provider).toBe(provider);
  });
});
