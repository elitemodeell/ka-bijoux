import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShippingType } from "@prisma/client";

const prismaMock = vi.hoisted((): any => ({
  order: { findUnique: vi.fn() },
  payment: { updateMany: vi.fn(), findUnique: vi.fn() },
  customer: { findUnique: vi.fn(), updateMany: vi.fn() },
  cart: { findUnique: vi.fn() },
  storeSettings: { findFirst: vi.fn() },
  address: { findFirst: vi.fn() },
  coupon: { findFirst: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  createOrResumeCheckout,
  type CheckoutInput,
  type CheckoutPaymentResult,
  type CheckoutPaymentService,
} from "@/lib/checkout/checkout-service";
import { CheckoutError } from "@/lib/checkout/domain";

const customer = {
  id: "customer-1",
  name: "Cliente Teste",
  email: "cliente@example.test",
  phone: "31999999999",
  cpf: "52998224725",
  active: true,
  asaasCustomerId: "cus_1",
  asaasAccountId: "wallet-ka-tests",
};

const address = {
  id: "address-1",
  customerId: customer.id,
  zipCode: "35680-000",
  street: "Rua Teste",
  number: "10",
  neighborhood: "Centro",
  city: "Itaúna",
  state: "MG",
};

const settings = {
  id: "settings-1",
  updatedAt: new Date("2026-07-27T10:00:00Z"),
  correiosEnabled: false,
  mototaxiEnabled: true,
  storePickupEnabled: true,
  mototaxiPrice: 12.5,
};

function cart() {
  return {
    id: "cart-1",
    customerId: customer.id,
    items: [
      {
        id: "cart-item-1",
        cartId: "cart-1",
        productId: "product-1",
        variationId: null,
        quantity: 1,
        unitPrice: 0.01,
        product: {
          id: "product-1",
          name: "Produto Atual",
          active: true,
          price: 25,
          promotionalPrice: null,
          stock: 10,
          weight: 0.3,
          height: 5,
          width: 10,
          length: 15,
          images: [],
        },
        variation: null,
      },
    ],
  };
}

function input(overrides: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    addressId: address.id,
    shippingType: ShippingType.MOTOTAXI,
    shippingOptionId: "mototaxi",
    idempotencyKey: "checkout-key-1",
    ...overrides,
  };
}

function paymentResult(orderId: string): CheckoutPaymentResult {
  return {
    provider: "ASAAS",
    externalPaymentId: "pay_1",
    externalCustomerId: "cus_1",
    externalReference: orderId,
    method: "PIX",
    status: "PENDING",
    rawStatus: "PENDING",
    amount: 37.5,
    dueDate: "2026-07-28",
    invoiceUrl: null,
    pix: {
      copyAndPaste: "pix-copy",
      qrCodeBase64: "pix-qr",
      expirationAt: "2026-07-28T23:59:59Z",
    },
  };
}

function configureCheckout(
  options: { addressFound?: boolean; asaasCustomerId?: string | null } = {}
) {
  let storedOrder: any = null;
  let successfulOrderCreates = 0;
  const cartValue = cart();
  const customerValue: any = {
    ...customer,
    asaasCustomerId:
      options.asaasCustomerId === undefined
        ? customer.asaasCustomerId
        : options.asaasCustomerId,
    asaasAccountId:
      options.asaasCustomerId === null ? null : customer.asaasAccountId,
    asaasCreationClaimedAt: null,
    asaasCreationAttemptCount: 0,
  };
  const tx: any = {
    customer: {
      findUnique: vi.fn(async () => customerValue),
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (where.id && customerValue.id !== where.id) return { count: 0 };
        if (
          Object.prototype.hasOwnProperty.call(where, "asaasCustomerId") &&
          customerValue.asaasCustomerId !== where.asaasCustomerId
        ) {
          return { count: 0 };
        }
        if (
          where.asaasCreationClaimedAt instanceof Date &&
          customerValue.asaasCreationClaimedAt?.getTime() !==
            where.asaasCreationClaimedAt.getTime()
        ) {
          return { count: 0 };
        }
        if (where.OR) {
          const matchesAlternative = where.OR.some((condition: any) => {
            if (condition.asaasCreationClaimedAt === null) {
              return customerValue.asaasCreationClaimedAt == null;
            }
            if (condition.asaasCreationClaimedAt?.lt) {
              return (
                customerValue.asaasCreationClaimedAt instanceof Date &&
                customerValue.asaasCreationClaimedAt.getTime() <
                  condition.asaasCreationClaimedAt.lt.getTime()
              );
            }
            return false;
          });
          if (!matchesAlternative) return { count: 0 };
        }
        for (const [field, value] of Object.entries(data)) {
          if (value && typeof value === "object" && "increment" in value) {
            customerValue[field] = Number(customerValue[field] ?? 0) + Number(value.increment);
          } else {
            customerValue[field] = value;
          }
        }
        if (storedOrder?.customer) Object.assign(storedOrder.customer, customerValue);
        return { count: 1 };
      }),
    },
    cart: { findUnique: vi.fn(async () => cartValue) },
    storeSettings: { findFirst: vi.fn(async () => settings) },
    address: {
      findFirst: vi.fn(async () => (options.addressFound === false ? null : address)),
    },
    coupon: {
      findFirst: vi.fn(async () => null),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    order: {
      findUnique: vi.fn(async ({ where }: any) =>
        where.checkoutIdempotencyKey ? storedOrder : storedOrder
      ),
      create: vi.fn(async ({ data }: any) => {
        if (storedOrder) {
          const conflict: any = new Error("Unique checkout key conflict");
          conflict.code = "P2002";
          throw conflict;
        }
        successfulOrderCreates += 1;
        storedOrder = {
          id: "order-1",
          orderNumber: "KA-0001",
          customerId: customer.id,
          addressId: data.addressId,
          couponId: data.couponId ?? null,
          status: data.status,
          shippingType: data.shippingType,
          shippingPrice: data.shippingPrice,
          subtotal: data.subtotal,
          discount: data.discount,
          total: data.total,
          notes: data.notes,
          checkoutIdempotencyKey: data.checkoutIdempotencyKey,
          checkoutRequestHash: data.checkoutRequestHash,
          createdAt: new Date("2026-07-27T12:00:00Z"),
          updatedAt: new Date("2026-07-27T12:00:00Z"),
          items: data.items.create.map((item: any, index: number) => ({
            id: `order-item-${index + 1}`,
            orderId: "order-1",
            ...item,
          })),
          payment: {
            id: "payment-1",
            orderId: "order-1",
            externalPaymentId: null,
            pixCode: null,
            ...data.payment.create,
          },
          customer: { ...customerValue },
          address,
          statusHistory: [],
        };
        return storedOrder;
      }),
      updateMany: vi.fn(async ({ data }: any) => {
        if (storedOrder) Object.assign(storedOrder, data);
        return { count: storedOrder ? 1 : 0 };
      }),
    },
    payment: {
      updateMany: vi.fn(async ({ where, data }: any) => {
        const payment = storedOrder?.payment;
        if (!payment) return { count: 0 };
        if (where.id && payment.id !== where.id) return { count: 0 };
        if (where.orderId && payment.orderId !== where.orderId) return { count: 0 };
        if (
          Object.prototype.hasOwnProperty.call(where, "externalPaymentId") &&
          where.externalPaymentId !== undefined &&
          payment.externalPaymentId !== where.externalPaymentId
        ) {
          return { count: 0 };
        }
        if (where.OR) {
          const matchesAlternative = where.OR.some((condition: any) => {
            if (Object.prototype.hasOwnProperty.call(condition, "externalPaymentId")) {
              return payment.externalPaymentId === condition.externalPaymentId;
            }
            if (condition.creationClaimedAt === null) {
              return payment.creationClaimedAt == null;
            }
            if (condition.creationClaimedAt?.lt) {
              return (
                payment.creationClaimedAt instanceof Date &&
                payment.creationClaimedAt.getTime() < condition.creationClaimedAt.lt.getTime()
              );
            }
            return false;
          });
          if (!matchesAlternative) return { count: 0 };
        }
        for (const [field, value] of Object.entries(data)) {
          if (value && typeof value === "object" && "increment" in value) {
            payment[field] = Number(payment[field] ?? 0) + Number(value.increment);
          } else {
            payment[field] = value;
          }
        }
        return { count: 1 };
      }),
      findUnique: vi.fn(async () => storedOrder?.payment ?? null),
    },
    orderStatusHistory: {
      create: vi.fn(async ({ data }: any) => data),
      findFirst: vi.fn(async () => null),
    },
    cartItem: { deleteMany: vi.fn(async () => ({ count: 1 })) },
  };

  prismaMock.customer.findUnique.mockImplementation(tx.customer.findUnique);
  prismaMock.customer.updateMany.mockImplementation(tx.customer.updateMany);
  prismaMock.cart.findUnique.mockImplementation(tx.cart.findUnique);
  prismaMock.storeSettings.findFirst.mockImplementation(tx.storeSettings.findFirst);
  prismaMock.address.findFirst.mockImplementation(tx.address.findFirst);
  prismaMock.coupon.findFirst.mockImplementation(tx.coupon.findFirst);
  prismaMock.payment.updateMany.mockImplementation(tx.payment.updateMany);
  prismaMock.payment.findUnique.mockImplementation(tx.payment.findUnique);
  prismaMock.order.findUnique.mockImplementation(async ({ where }: any) => {
    if (where.checkoutIdempotencyKey) {
      return storedOrder?.checkoutIdempotencyKey === where.checkoutIdempotencyKey
        ? storedOrder
        : null;
    }
    return storedOrder?.id === where.id ? storedOrder : null;
  });
  prismaMock.$transaction.mockImplementation(async (callback: (db: any) => unknown) => callback(tx));

  const uniqueCharges = new Set<string>();
  const service: CheckoutPaymentService = {
    assertAccountIdentity: vi.fn(async () => ({
      provider: "ASAAS" as const,
      environment: "sandbox" as const,
      accountId: "wallet-ka-tests",
      legalName: "KABIJOUX LTDA",
      cpfCnpj: "31042012000102",
    })),
    reconcileOrderPayment: vi.fn(async () => undefined),
    findOrCreateCustomer: vi.fn(async (request) => ({
      provider: "ASAAS" as const,
      externalCustomerId: "cus_1",
      externalReference: request.internalId,
      cpfCnpj: request.cpfCnpj,
    })),
    createPixPayment: vi.fn(async (request) => {
      uniqueCharges.add(request.orderId);
      return paymentResult(request.orderId);
    }),
  };

  return {
    tx,
    service,
    getStoredOrder: () => storedOrder,
    getSuccessfulOrderCreates: () => successfulOrderCreates,
    getUniqueCharges: () => uniqueCharges.size,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PAYMENT_PIX_DUE_DAYS", "1");
});

describe("server-authoritative checkout service", () => {
  it("[01] ignores client shippingPrice zero and records the server mototaxi quote", async () => {
    const setup = configureCheckout();
    const malicious = { ...input(), shippingPrice: 0 } as CheckoutInput & { shippingPrice: number };

    const order = await createOrResumeCheckout(customer.id, malicious, setup.service);

    expect(order.shippingPrice).toBe(12.5);
    expect(setup.tx.order.create.mock.calls[0][0].data.shippingPrice).toBe(12.5);
  });

  it("[02] ignores a negative shippingPrice sent by the client", async () => {
    const setup = configureCheckout();
    const malicious = { ...input(), shippingPrice: -100 } as CheckoutInput & { shippingPrice: number };

    const order = await createOrResumeCheckout(customer.id, malicious, setup.service);

    expect(order.shippingPrice).toBe(12.5);
    expect(order.total).toBe(37.5);
  });

  it("[03] ignores an adulterated product price and records the current database catalog value", async () => {
    const setup = configureCheckout();
    const malicious = { ...input(), unitPrice: 0.01, total: 0.01 } as CheckoutInput & {
      unitPrice: number;
      total: number;
    };

    const order = await createOrResumeCheckout(customer.id, malicious, setup.service);

    expect(order.subtotal).toBe(25);
    expect(order.total).toBe(37.5);
    expect(setup.tx.order.create.mock.calls[0][0].data.items.create[0].unitPrice).toBe(25);
  });

  it("[04] rejects an address that belongs to another authenticated customer", async () => {
    const setup = configureCheckout({ addressFound: false });

    await expect(createOrResumeCheckout(customer.id, input(), setup.service)).rejects.toMatchObject({
      name: "CheckoutError",
      status: 403,
      code: "ADDRESS_FORBIDDEN",
    });
    expect(setup.tx.order.create).not.toHaveBeenCalled();
  });
});

describe("checkout idempotency with an in-memory unique-key fake", () => {
  it("[10] returns the same order for a retry with the same idempotency key", async () => {
    const setup = configureCheckout();

    const first = await createOrResumeCheckout(customer.id, input(), setup.service);
    const retry = await createOrResumeCheckout(customer.id, input(), setup.service);

    expect(retry.id).toBe(first.id);
    expect(setup.getSuccessfulOrderCreates()).toBe(1);
    expect(setup.getUniqueCharges()).toBe(1);
    expect(setup.service.createPixPayment).toHaveBeenCalledTimes(1);
  });

  it("rejects reuse of an existing idempotency key by another customer without revealing the order", async () => {
    const setup = configureCheckout();
    await createOrResumeCheckout(customer.id, input(), setup.service);

    await expect(
      createOrResumeCheckout("customer-2", input(), setup.service)
    ).rejects.toMatchObject({
      name: "CheckoutError",
      status: 409,
      code: "IDEMPOTENCY_CONFLICT",
    });
  });

  it("rejects the same key when its request payload changes", async () => {
    const setup = configureCheckout();
    await createOrResumeCheckout(customer.id, input(), setup.service);

    await expect(
      createOrResumeCheckout(customer.id, input({ notes: "changed payload" }), setup.service)
    ).rejects.toBeInstanceOf(CheckoutError);
  });

  it("[09] coalesces a double click into one order and one unique charge", async () => {
    const setup = configureCheckout();

    const [left, right] = await Promise.all([
      createOrResumeCheckout(customer.id, input(), setup.service),
      createOrResumeCheckout(customer.id, input(), setup.service),
    ]);

    expect(left.id).toBe(right.id);
    expect(setup.getSuccessfulOrderCreates()).toBe(1);
    expect(setup.getUniqueCharges()).toBe(1);
    expect(setup.getStoredOrder().payment.externalPaymentId).toBe("pay_1");
  });
});
describe("failure boundary after local order creation", () => {
  it("keeps one retryable local order when Asaas fails after order creation", async () => {
    const setup = configureCheckout();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(setup.service.createPixPayment).mockRejectedValueOnce(
      new Error("Synthetic provider failure")
    );

    await expect(createOrResumeCheckout(customer.id, input(), setup.service)).rejects.toMatchObject({
      name: "CheckoutError",
      status: 503,
      code: "PAYMENT_UNAVAILABLE",
    });

    expect(setup.getSuccessfulOrderCreates()).toBe(1);
    expect(setup.getStoredOrder()).toMatchObject({
      id: "order-1",
      status: "FALHA_NO_PAGAMENTO",
      payment: {
        externalPaymentId: null,
        status: "FALHA",
        creationClaimedAt: null,
      },
    });
  });
});
describe("Asaas customer deduplication", () => {
  it("creates and persists one external customer when the account has no Asaas ID", async () => {
    const setup = configureCheckout({ asaasCustomerId: null });

    const first = await createOrResumeCheckout(customer.id, input(), setup.service);
    const retry = await createOrResumeCheckout(customer.id, input(), setup.service);

    expect(retry.id).toBe(first.id);
    expect(setup.service.findOrCreateCustomer).toHaveBeenCalledTimes(1);
    expect(setup.service.createPixPayment).toHaveBeenCalledTimes(1);
    expect(setup.getStoredOrder().customer.asaasCustomerId).toBe("cus_1");
  });
});
describe("authoritative reconciliation before returning Pix", () => {
  it("reconciles a newly linked Asaas charge before the first checkout response", async () => {
    const setup = configureCheckout();

    await createOrResumeCheckout(customer.id, input(), setup.service);

    expect(setup.service.reconcileOrderPayment).toHaveBeenCalledTimes(1);
    expect(setup.service.reconcileOrderPayment).toHaveBeenCalledWith("order-1");
  });

  it("reconciles a linked charge again before returning an idempotent retry", async () => {
    const setup = configureCheckout();
    await createOrResumeCheckout(customer.id, input(), setup.service);
    vi.mocked(setup.service.reconcileOrderPayment).mockClear();

    await createOrResumeCheckout(customer.id, input(), setup.service);

    expect(setup.service.reconcileOrderPayment).toHaveBeenCalledOnce();
    expect(setup.service.createPixPayment).toHaveBeenCalledTimes(1);
  });

  it("fails safely instead of returning stale Pix data when reconciliation is unavailable", async () => {
    const setup = configureCheckout();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await createOrResumeCheckout(customer.id, input(), setup.service);
    vi.mocked(setup.service.reconcileOrderPayment).mockRejectedValueOnce(
      new Error("Synthetic reconciliation outage")
    );

    await expect(
      createOrResumeCheckout(customer.id, input(), setup.service)
    ).rejects.toMatchObject({
      name: "CheckoutError",
      status: 503,
      code: "PAYMENT_RECONCILIATION_UNAVAILABLE",
    });
    expect(setup.service.createPixPayment).toHaveBeenCalledTimes(1);
  });

  it("never returns a legacy Pix whose financial account is unknown", async () => {
    const setup = configureCheckout();
    await createOrResumeCheckout(customer.id, input(), setup.service);
    setup.getStoredOrder().payment.providerAccountId = null;
    vi.mocked(setup.service.reconcileOrderPayment).mockClear();

    await expect(
      createOrResumeCheckout(customer.id, input(), setup.service)
    ).rejects.toMatchObject({
      name: "CheckoutError",
      status: 409,
      code: "PAYMENT_ACCOUNT_MISMATCH",
    });
    expect(setup.service.reconcileOrderPayment).not.toHaveBeenCalled();
  });
});
