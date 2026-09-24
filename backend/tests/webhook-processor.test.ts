import { describe, expect, it, vi } from "vitest";
import {
  OrderStatus,
  PaymentMethod,
  PaymentProvider as PrismaPaymentProvider,
  PaymentStatus,
  WebhookProcessingStatus,
} from "@prisma/client";
import {
  hashAsaasWebhookPayload,
  isValidAsaasWebhookToken,
  processAsaasWebhook,
  reconcileOrderPayment,
  requestOrderRefund,
  WebhookPayloadError,
  type WebhookPaymentService,
  type WebhookProcessorDatabase,
} from "@/lib/payments/webhook-processor";
import {
  PaymentValidationError,
  type PaymentWebhookEvent,
  type ProviderPayment,
  type RefundPaymentResult,
} from "@/lib/payments/types";

type AnyRow = Record<string, any>;

interface SeedOrder {
  orderId: string;
  paymentId: string;
  externalPaymentId: string;
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
  amount?: number;
  externalCustomerId?: string;
  stockCommittedAt?: Date | null;
  productId?: string;
  variationId?: string | null;
  quantity?: number;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function matchesValue(current: unknown, expected: unknown): boolean {
  if (expected === undefined) return true;
  if (expected instanceof Date) {
    return current instanceof Date && current.getTime() === expected.getTime();
  }
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    const operators = expected as AnyRow;
    if ("in" in operators && !operators.in.includes(current)) return false;
    if ("not" in operators && matchesValue(current, operators.not)) return false;
    if ("gte" in operators && !(Number(current) >= Number(operators.gte))) return false;
    if (
      "lt" in operators &&
      !(
        current instanceof Date &&
        operators.lt instanceof Date &&
        current.getTime() < operators.lt.getTime()
      )
    ) {
      return false;
    }
    return true;
  }
  return current === expected;
}

function matchesWhere(row: AnyRow, where: AnyRow = {}): boolean {
  return Object.entries(where).every(([field, expected]) => {
    if (field === "OR") {
      return (expected as AnyRow[]).some((condition) => matchesWhere(row, condition));
    }
    return matchesValue(row[field], expected);
  });
}

function applyData(row: AnyRow, data: AnyRow): void {
  for (const [field, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const operation = value as AnyRow;
      if ("increment" in operation) {
        row[field] = Number(row[field] ?? 0) + Number(operation.increment);
        continue;
      }
      if ("decrement" in operation) {
        row[field] = Number(row[field] ?? 0) - Number(operation.decrement);
        continue;
      }
    }
    row[field] = value;
  }
}

function createWebhookDatabase(options: {
  seeds?: SeedOrder[];
  productStock?: number;
  productSoldCount?: number;
  variationStock?: number;
} = {}) {
  let events = new Map<string, AnyRow>();
  let payments = new Map<string, AnyRow>();
  let orders = new Map<string, AnyRow>();
  let products = new Map<string, AnyRow>([
    [
      "product-1",
      {
        id: "product-1",
        stock: options.productStock ?? 3,
        soldCount: options.productSoldCount ?? 0,
      },
    ],
  ]);
  let variations = new Map<string, AnyRow>([
    ["variation-1", { id: "variation-1", stock: options.variationStock ?? 3 }],
  ]);
  let statusHistory: AnyRow[] = [];
  let eventSequence = 0;
  let transactionTail: Promise<void> = Promise.resolve();

  const seeds =
    options.seeds ??
    ([
      {
        orderId: "order-1",
        paymentId: "payment-1",
        externalPaymentId: "pay-1",
      },
    ] satisfies SeedOrder[]);

  for (const seed of seeds) {
    const externalCustomerId = seed.externalCustomerId ?? "cus-1";
    const order = {
      id: seed.orderId,
      orderNumber: `KA-${seed.orderId}`,
      status: seed.orderStatus ?? OrderStatus.AGUARDANDO_PAGAMENTO,
      total: seed.amount ?? 50,
      customer: { asaasCustomerId: externalCustomerId },
      items: [
        {
          productId: seed.productId ?? "product-1",
          variationId: seed.variationId ?? null,
          quantity: seed.quantity ?? 1,
        },
      ],
    };
    orders.set(seed.orderId, order);
    payments.set(seed.orderId, {
      id: seed.paymentId,
      orderId: seed.orderId,
      provider: PrismaPaymentProvider.ASAAS,
      method: PaymentMethod.PIX,
      status: seed.paymentStatus ?? PaymentStatus.AGUARDANDO,
      amount: seed.amount ?? 50,
      externalPaymentId: seed.externalPaymentId,
      externalCustomerId,
      stockCommittedAt: seed.stockCommittedAt ?? null,
      lastProviderStatus: "PENDING",
      paidAt: null,
      refundedAt: null,
    });
  }

  const webhookDelegate = {
    create: vi.fn(async ({ data }: AnyRow) => {
      const existing = Array.from(events.values()).find(
        (row) =>
          row.provider === data.provider && row.externalEventId === data.externalEventId
      );
      if (existing) {
        const error: AnyRow = new Error("Unique webhook event");
        error.code = "P2002";
        throw error;
      }
      const row = {
        id: `webhook-row-${++eventSequence}`,
        provider: data.provider,
        externalEventId: data.externalEventId,
        eventType: data.eventType,
        externalPaymentId: data.externalPaymentId ?? null,
        payloadHash: data.payloadHash ?? null,
        processingStatus: data.processingStatus ?? WebhookProcessingStatus.RECEIVED,
        errorSummary: null,
        processingStartedAt: null,
        processedAt: null,
        attemptCount: 0,
        orderId: null,
      };
      events.set(row.id, row);
      return clone(row);
    }),
    findUnique: vi.fn(async ({ where }: AnyRow) => {
      if (where.id) {
        const byId = events.get(where.id);
        return byId ? clone(byId) : null;
      }
      const compound = where.provider_externalEventId;
      const row = Array.from(events.values()).find(
        (candidate) =>
          candidate.provider === compound.provider &&
          candidate.externalEventId === compound.externalEventId
      );
      return row ? clone(row) : null;
    }),
    updateMany: vi.fn(async ({ where, data }: AnyRow) => {
      let count = 0;
      for (const row of Array.from(events.values())) {
        if (!matchesWhere(row, where)) continue;
        applyData(row, data);
        count += 1;
      }
      return { count };
    }),
  };

  const paymentDelegate = {
    findUnique: vi.fn(async ({ where }: AnyRow) => {
      const payment = payments.get(where.orderId);
      const order = orders.get(where.orderId);
      return payment && order ? clone({ ...payment, order }) : null;
    }),
    updateMany: vi.fn(async ({ where, data }: AnyRow) => {
      let count = 0;
      for (const payment of Array.from(payments.values())) {
        if (!matchesWhere(payment, where)) continue;
        applyData(payment, data);
        count += 1;
      }
      return { count };
    }),
  };

  const orderDelegate = {
    updateMany: vi.fn(async ({ where, data }: AnyRow) => {
      let count = 0;
      for (const order of Array.from(orders.values())) {
        if (!matchesWhere(order, where)) continue;
        applyData(order, data);
        count += 1;
      }
      return { count };
    }),
  };

  const productDelegate = {
    updateMany: vi.fn(async ({ where, data }: AnyRow) => {
      let count = 0;
      for (const product of Array.from(products.values())) {
        if (!matchesWhere(product, where)) continue;
        applyData(product, data);
        count += 1;
      }
      return { count };
    }),
  };

  const variationDelegate = {
    updateMany: vi.fn(async ({ where, data }: AnyRow) => {
      let count = 0;
      for (const variation of Array.from(variations.values())) {
        if (!matchesWhere(variation, where)) continue;
        applyData(variation, data);
        count += 1;
      }
      return { count };
    }),
  };

  const tx: any = {
    paymentWebhookEvent: webhookDelegate,
    payment: paymentDelegate,
    order: orderDelegate,
    orderStatusHistory: {
      create: vi.fn(async ({ data }: AnyRow) => {
        statusHistory.push(clone(data));
        return clone(data);
      }),
    },
    product: productDelegate,
    productVariation: variationDelegate,
  };

  const db = {
    paymentWebhookEvent: webhookDelegate,
    payment: paymentDelegate,
    $transaction: vi.fn(async (callback: (transaction: any) => Promise<any>) => {
      let release!: () => void;
      const previous = transactionTail;
      transactionTail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      const snapshot = {
        payments: clone(payments),
        orders: clone(orders),
        products: clone(products),
        variations: clone(variations),
        statusHistory: clone(statusHistory),
      };
      try {
        return await callback(tx);
      } catch (error) {
        payments = snapshot.payments;
        orders = snapshot.orders;
        products = snapshot.products;
        variations = snapshot.variations;
        statusHistory = snapshot.statusHistory;
        throw error;
      } finally {
        release();
      }
    }),
  } as unknown as WebhookProcessorDatabase;

  return {
    db,
    events,
    getEvent: (externalEventId: string) =>
      Array.from(events.values()).find((row) => row.externalEventId === externalEventId),
    getPayment: (orderId: string) => payments.get(orderId),
    getOrder: (orderId: string) => orders.get(orderId),
    getProduct: (productId = "product-1") => products.get(productId),
    getVariation: (variationId = "variation-1") => variations.get(variationId),
    getHistory: () => statusHistory,
  };
}

function asaasPayment(
  orderId = "order-1",
  externalPaymentId = "pay-1",
  overrides: Partial<ProviderPayment> = {}
): ProviderPayment {
  return {
    provider: "ASAAS",
    externalPaymentId,
    externalCustomerId: "cus-1",
    externalReference: orderId,
    method: "PIX",
    status: "PAID",
    rawStatus: "RECEIVED",
    amount: 50,
    dueDate: "2026-07-28",
    invoiceUrl: null,
    ...overrides,
  };
}

function paymentService(providerPayments: ProviderPayment[]) {
  const byId = new Map(
    providerPayments.map((payment) => [payment.externalPaymentId, payment])
  );
  const service: WebhookPaymentService = {
    interpretWebhook: vi.fn((payload: unknown): PaymentWebhookEvent => {
      if (!payload || typeof payload !== "object") {
        throw new PaymentValidationError("Payload Asaas inválido.");
      }
      const body = payload as AnyRow;
      if (!body.id || !body.event || !body.payment?.id) {
        throw new PaymentValidationError("Evento Asaas sem identificadores.");
      }
      return {
        provider: "ASAAS",
        externalEventId: body.id,
        eventType: body.event,
        externalPaymentId: body.payment.id,
        occurredAt: null,
        status: body.payment.status === "RECEIVED" ? "PAID" : "PENDING",
        rawPaymentStatus: body.payment.status ?? null,
      };
    }),
    getPayment: vi.fn(async (externalPaymentId: string): Promise<ProviderPayment> => {
      const payment = byId.get(externalPaymentId);
      if (!payment) throw new PaymentValidationError("Cobrança sintética ausente.");
      return clone(payment);
    }),
    refundPayment: vi.fn(async ({ externalPaymentId }): Promise<RefundPaymentResult> => {
      const current = byId.get(externalPaymentId);
      if (current) {
        byId.set(externalPaymentId, {
          ...current,
          status: "REFUNDED",
          rawStatus: "REFUNDED",
        });
      }
      return {
        provider: "ASAAS",
        externalPaymentId,
        status: "REFUNDED",
        rawStatus: "REFUNDED",
        amount: current?.amount ?? 0,
      };
    }),
  };
  return service;
}

function webhookBody(
  externalEventId: string,
  externalPaymentId = "pay-1",
  eventType = "PAYMENT_RECEIVED",
  rawStatus = "RECEIVED"
): string {
  return JSON.stringify({
    id: externalEventId,
    event: eventType,
    payment: { id: externalPaymentId, status: rawStatus },
  });
}

const fixedNow = () => new Date("2026-07-27T15:00:00.000Z");

describe("Asaas webhook authentication primitives", () => {
  const expected = "webhook-token-with-more-than-32-characters";

  it("[12] rejects a missing asaas-access-token", () => {
    expect(isValidAsaasWebhookToken(null, expected)).toBe(false);
  });

  it("[13] rejects an invalid asaas-access-token", () => {
    expect(isValidAsaasWebhookToken("wrong-token", expected)).toBe(false);
  });

  it("[14] accepts the exact valid asaas-access-token", () => {
    expect(isValidAsaasWebhookToken(expected, expected)).toBe(true);
  });

  it("hashes the exact raw body deterministically", () => {
    expect(hashAsaasWebhookPayload("synthetic-body")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashAsaasWebhookPayload("synthetic-body")).toBe(
      hashAsaasWebhookPayload("synthetic-body")
    );
  });
});

describe("idempotent Asaas webhook processing", () => {
  it("[14] processes a valid received Pix and commits stock once", async () => {
    const database = createWebhookDatabase({ productStock: 2 });
    const service = paymentService([asaasPayment()]);

    const result = await processAsaasWebhook({
      rawBody: webhookBody("event-valid"),
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });

    expect(result).toMatchObject({ outcome: "processed", reason: "payment_received" });
    expect(database.getPayment("order-1")).toMatchObject({
      status: PaymentStatus.PAGO,
      stockCommittedAt: fixedNow(),
    });
    expect(database.getOrder("order-1")?.status).toBe(OrderStatus.PAGAMENTO_APROVADO);
    expect(database.getProduct()).toMatchObject({ stock: 1, soldCount: 1 });
    expect(database.getEvent("event-valid")).toMatchObject({
      processingStatus: WebhookProcessingStatus.PROCESSED,
      orderId: "order-1",
      attemptCount: 1,
    });
  });

  it("[15] treats the same webhook event twice as a duplicate with one stock effect", async () => {
    const database = createWebhookDatabase({ productStock: 2 });
    const service = paymentService([asaasPayment()]);
    const rawBody = webhookBody("event-duplicate");

    const first = await processAsaasWebhook({
      rawBody,
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });
    const repeated = await processAsaasWebhook({
      rawBody,
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });

    expect(first.outcome).toBe("processed");
    expect(repeated).toMatchObject({ outcome: "duplicate", reason: "already_processed" });
    expect(database.getProduct()).toMatchObject({ stock: 1, soldCount: 1 });
    expect(database.events).toHaveLength(1);
    expect(service.getPayment).toHaveBeenCalledTimes(1);
  });

  it("[19] ignores a second confirmation with a new event ID without decrementing twice", async () => {
    const database = createWebhookDatabase({ productStock: 2 });
    const service = paymentService([asaasPayment()]);

    const first = await processAsaasWebhook({
      rawBody: webhookBody("event-paid-1"),
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });
    const second = await processAsaasWebhook({
      rawBody: webhookBody("event-paid-2"),
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });

    expect(first.outcome).toBe("processed");
    expect(second).toMatchObject({ outcome: "ignored", reason: "payment_already_received" });
    expect(database.getProduct()).toMatchObject({ stock: 1, soldCount: 1 });
    expect(database.getPayment("order-1")?.stockCommittedAt).toEqual(fixedNow());
  });

  it("rejects invalid JSON and a mismatched caller-supplied payload hash before persistence", async () => {
    const database = createWebhookDatabase();
    const service = paymentService([asaasPayment()]);

    await expect(
      processAsaasWebhook({ rawBody: "{", db: database.db, paymentService: service })
    ).rejects.toBeInstanceOf(WebhookPayloadError);
    await expect(
      processAsaasWebhook({
        rawBody: webhookBody("event-hash"),
        payloadHash: "0".repeat(64),
        db: database.db,
        paymentService: service,
      })
    ).rejects.toBeInstanceOf(WebhookPayloadError);
    expect(database.events).toHaveLength(0);
  });
});

describe("provider and state reconciliation", () => {
  it("[16] ignores an out-of-order pending event after payment is paid", async () => {
    const committedAt = new Date("2026-07-27T14:00:00.000Z");
    const database = createWebhookDatabase({
      productStock: 1,
      productSoldCount: 1,
      seeds: [
        {
          orderId: "order-1",
          paymentId: "payment-1",
          externalPaymentId: "pay-1",
          paymentStatus: PaymentStatus.PAGO,
          orderStatus: OrderStatus.PAGAMENTO_APROVADO,
          stockCommittedAt: committedAt,
        },
      ],
    });
    const service = paymentService([
      asaasPayment("order-1", "pay-1", { status: "PENDING", rawStatus: "PENDING" }),
    ]);

    const result = await processAsaasWebhook({
      rawBody: webhookBody("event-old", "pay-1", "PAYMENT_CREATED", "PENDING"),
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });

    expect(result).toMatchObject({ outcome: "ignored", reason: "status_out_of_order" });
    expect(database.getPayment("order-1")?.status).toBe(PaymentStatus.PAGO);
    expect(database.getProduct()).toMatchObject({ stock: 1, soldCount: 1 });
  });

  it("[17] rejects a divergent Asaas amount and never commits stock", async () => {
    const database = createWebhookDatabase({ productStock: 2 });
    const service = paymentService([asaasPayment("order-1", "pay-1", { amount: 49.99 })]);

    const result = await processAsaasWebhook({
      rawBody: webhookBody("event-amount-mismatch"),
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });

    expect(result).toMatchObject({ outcome: "ignored", reason: "payment_amount_mismatch" });
    expect(database.getPayment("order-1")?.status).toBe(PaymentStatus.AGUARDANDO);
    expect(database.getProduct()).toMatchObject({ stock: 2, soldCount: 0 });
  });

  it("[18] rejects a charge whose Asaas reference points to another order", async () => {
    const database = createWebhookDatabase({
      seeds: [
        { orderId: "order-1", paymentId: "payment-1", externalPaymentId: "pay-1" },
        { orderId: "order-2", paymentId: "payment-2", externalPaymentId: "pay-2" },
      ],
    });
    const service = paymentService([asaasPayment("order-2", "pay-1")]);

    const result = await processAsaasWebhook({
      rawBody: webhookBody("event-wrong-order", "pay-1"),
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });

    expect(result).toMatchObject({
      outcome: "ignored",
      reason: "local_external_payment_id_mismatch",
    });
    expect(database.getPayment("order-1")?.status).toBe(PaymentStatus.AGUARDANDO);
    expect(database.getPayment("order-2")?.status).toBe(PaymentStatus.AGUARDANDO);
  });

  it("[20] expires an overdue Pix without touching stock", async () => {
    const database = createWebhookDatabase({ productStock: 2 });
    const service = paymentService([
      asaasPayment("order-1", "pay-1", { status: "EXPIRED", rawStatus: "OVERDUE" }),
    ]);

    const result = await processAsaasWebhook({
      rawBody: webhookBody("event-overdue", "pay-1", "PAYMENT_OVERDUE", "OVERDUE"),
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });

    expect(result).toMatchObject({ outcome: "processed", reason: "status_reconciled" });
    expect(database.getPayment("order-1")?.status).toBe(PaymentStatus.EXPIRADO);
    expect(database.getOrder("order-1")?.status).toBe(OrderStatus.PAGAMENTO_EXPIRADO);
    expect(database.getProduct()).toMatchObject({ stock: 2, soldCount: 0 });
  });

  it("[21] restores committed stock exactly once after an Asaas refund", async () => {
    const committedAt = new Date("2026-07-27T14:00:00.000Z");
    const database = createWebhookDatabase({
      productStock: 1,
      productSoldCount: 1,
      seeds: [
        {
          orderId: "order-1",
          paymentId: "payment-1",
          externalPaymentId: "pay-1",
          paymentStatus: PaymentStatus.PAGO,
          orderStatus: OrderStatus.PAGAMENTO_APROVADO,
          stockCommittedAt: committedAt,
        },
      ],
    });
    const service = paymentService([
      asaasPayment("order-1", "pay-1", { status: "REFUNDED", rawStatus: "REFUNDED" }),
    ]);

    const first = await processAsaasWebhook({
      rawBody: webhookBody("event-refund-1", "pay-1", "PAYMENT_REFUNDED", "REFUNDED"),
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });
    const repeatedStatus = await processAsaasWebhook({
      rawBody: webhookBody("event-refund-2", "pay-1", "PAYMENT_REFUNDED", "REFUNDED"),
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });

    expect(first.outcome).toBe("processed");
    expect(repeatedStatus.outcome).toBe("ignored");
    expect(database.getPayment("order-1")).toMatchObject({
      status: PaymentStatus.REEMBOLSADO,
      stockCommittedAt: null,
    });
    expect(database.getOrder("order-1")?.status).toBe(OrderStatus.REEMBOLSADO);
    expect(database.getProduct()).toMatchObject({ stock: 2, soldCount: 0 });
  });
});

describe("atomic stock confirmation", () => {
  it("[22] never makes stock negative and automatically refunds a paid Pix with insufficient stock", async () => {
    const database = createWebhookDatabase({ productStock: 0 });
    const service = paymentService([asaasPayment()]);

    const result = await processAsaasWebhook({
      rawBody: webhookBody("event-insufficient-stock"),
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });

    expect(result).toMatchObject({ outcome: "processed", reason: "insufficient_stock_refund" });
    expect(service.refundPayment).toHaveBeenCalledTimes(1);
    expect(database.getProduct()).toMatchObject({ stock: 0, soldCount: 0 });
    expect(database.getPayment("order-1")?.status).toBe(PaymentStatus.REEMBOLSADO);
  });

  it("[22] serializes two simultaneous approvals for the last unit and refunds one", async () => {
    const database = createWebhookDatabase({
      productStock: 1,
      seeds: [
        { orderId: "order-1", paymentId: "payment-1", externalPaymentId: "pay-1" },
        { orderId: "order-2", paymentId: "payment-2", externalPaymentId: "pay-2" },
      ],
    });
    const service = paymentService([
      asaasPayment("order-1", "pay-1"),
      asaasPayment("order-2", "pay-2"),
    ]);

    const results = await Promise.all([
      processAsaasWebhook({
        rawBody: webhookBody("event-concurrent-1", "pay-1"),
        db: database.db,
        paymentService: service,
        now: fixedNow,
      }),
      processAsaasWebhook({
        rawBody: webhookBody("event-concurrent-2", "pay-2"),
        db: database.db,
        paymentService: service,
        now: fixedNow,
      }),
    ]);

    expect(results.map((result) => result.reason).sort()).toEqual([
      "insufficient_stock_refund",
      "payment_received",
    ]);
    expect(service.refundPayment).toHaveBeenCalledTimes(1);
    expect(database.getProduct()).toMatchObject({ stock: 0, soldCount: 1 });
    expect(
      [
        database.getPayment("order-1")?.status,
        database.getPayment("order-2")?.status,
      ].sort()
    ).toEqual([PaymentStatus.PAGO, PaymentStatus.REEMBOLSADO].sort());
  });
});
describe("webhook lease and reconciliation hardening", () => {
  it("returns retry/503 when the same event is actively PROCESSING inside its lease", async () => {
    const database = createWebhookDatabase();
    const service = paymentService([asaasPayment()]);
    const rawBody = webhookBody("event-active-lease");
    database.events.set("webhook-active-lease", {
      id: "webhook-active-lease",
      provider: PrismaPaymentProvider.ASAAS,
      externalEventId: "event-active-lease",
      eventType: "PAYMENT_RECEIVED",
      externalPaymentId: "pay-1",
      payloadHash: hashAsaasWebhookPayload(rawBody),
      processingStatus: WebhookProcessingStatus.PROCESSING,
      errorSummary: null,
      processingStartedAt: fixedNow(),
      processedAt: null,
      attemptCount: 1,
      orderId: null,
    });

    const result = await processAsaasWebhook({
      rawBody,
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });

    expect(result).toMatchObject({
      outcome: "retry",
      httpStatus: 503,
      reason: "processing_in_progress",
    });
    expect(service.getPayment).not.toHaveBeenCalled();
  });

  it("does not commit Pix stock for RECEIVED_IN_CASH", async () => {
    const database = createWebhookDatabase({ productStock: 2 });
    const service = paymentService([
      asaasPayment("order-1", "pay-1", {
        status: "PAID",
        rawStatus: "RECEIVED_IN_CASH",
      }),
    ]);

    const result = await processAsaasWebhook({
      rawBody: webhookBody(
        "event-received-in-cash",
        "pay-1",
        "PAYMENT_RECEIVED",
        "RECEIVED_IN_CASH"
      ),
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });

    expect(result).toMatchObject({ outcome: "ignored", reason: "pix_not_received" });
    expect(database.getPayment("order-1")?.status).toBe(PaymentStatus.AGUARDANDO);
    expect(database.getProduct()).toMatchObject({ stock: 2, soldCount: 0 });
  });

  it("restores committed stock once across repeated administrative refund reconciliation", async () => {
    const committedAt = new Date("2026-07-27T14:00:00.000Z");
    const database = createWebhookDatabase({
      productStock: 1,
      productSoldCount: 1,
      seeds: [
        {
          orderId: "order-1",
          paymentId: "payment-1",
          externalPaymentId: "pay-1",
          paymentStatus: PaymentStatus.PAGO,
          orderStatus: OrderStatus.PAGAMENTO_APROVADO,
          stockCommittedAt: committedAt,
        },
      ],
    });
    const service = paymentService([asaasPayment()]);

    const first = await requestOrderRefund("order-1", service, "Teste de estorno", {
      db: database.db,
      now: fixedNow,
    });
    const repeated = await requestOrderRefund("order-1", service, "Retry do estorno", {
      db: database.db,
      now: fixedNow,
    });

    expect(first.stockRestored).toBe(true);
    expect(repeated.stockRestored).toBe(false);
    expect(service.refundPayment).toHaveBeenCalledTimes(1);
    expect(database.getProduct()).toMatchObject({ stock: 2, soldCount: 0 });
    expect(database.getPayment("order-1")?.status).toBe(PaymentStatus.REEMBOLSADO);
  });

  it("reconciliation refunds a received Pix when conditional stock confirmation fails", async () => {
    const database = createWebhookDatabase({ productStock: 0 });
    const service = paymentService([asaasPayment()]);

    const result = await reconcileOrderPayment("order-1", service, {
      db: database.db,
      now: fixedNow,
      sourceId: "checkout:order-1",
    });

    expect(result).toMatchObject({
      orderId: "order-1",
      status: "REFUNDED",
      changed: true,
      stockChanged: false,
    });
    expect(service.refundPayment).toHaveBeenCalledOnce();
    expect(database.getProduct()).toMatchObject({ stock: 0, soldCount: 0 });
    expect(database.getPayment("order-1")?.status).toBe(PaymentStatus.REEMBOLSADO);
  });
});
describe("restored canceled Pix", () => {
  it("settles a canceled Pix only after authoritative RECEIVED and commits stock once", async () => {
    const database = createWebhookDatabase({
      productStock: 2,
      seeds: [
        {
          orderId: "order-1",
          paymentId: "payment-1",
          externalPaymentId: "pay-1",
          paymentStatus: PaymentStatus.CANCELADO,
          orderStatus: OrderStatus.CANCELADO,
          stockCommittedAt: null,
        },
      ],
    });
    const service = paymentService([asaasPayment()]);

    const restored = await processAsaasWebhook({
      rawBody: webhookBody("event-restored-received-1"),
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });
    const repeated = await processAsaasWebhook({
      rawBody: webhookBody("event-restored-received-2"),
      db: database.db,
      paymentService: service,
      now: fixedNow,
    });

    expect(restored).toMatchObject({ outcome: "processed", reason: "payment_received" });
    expect(repeated).toMatchObject({ outcome: "ignored", reason: "payment_already_received" });
    expect(database.getPayment("order-1")?.status).toBe(PaymentStatus.PAGO);
    expect(database.getOrder("order-1")?.status).toBe(OrderStatus.PAGAMENTO_APROVADO);
    expect(database.getProduct()).toMatchObject({ stock: 1, soldCount: 1 });
  });
});