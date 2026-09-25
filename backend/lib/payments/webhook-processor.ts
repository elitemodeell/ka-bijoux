import { createHash, timingSafeEqual } from "node:crypto";
import {
  OrderStatus,
  PaymentMethod,
  PaymentProvider as PrismaPaymentProvider,
  PaymentStatus,
  Prisma,
  WebhookProcessingStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createPaymentService, PaymentService } from "./payment-service";
import { resolvePaymentStatusTransition } from "./state-machine";
import {
  NormalizedPaymentStatus,
  PaymentProviderError,
  PaymentValidationError,
  PaymentWebhookEvent,
  ProviderPayment,
  RefundPaymentResult,
} from "./types";

export const DEFAULT_WEBHOOK_CLAIM_TIMEOUT_MS = 2 * 60 * 1000;

const KNOWN_ASAAS_PAYMENT_EVENTS = new Set([
  "PAYMENT_CREATED",
  "PAYMENT_AWAITING_RISK_ANALYSIS",
  "PAYMENT_APPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_AUTHORIZED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_RESTORED",
  "PAYMENT_REFUND_IN_PROGRESS",
  "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_REFUNDED",
]);

type CountResult = { count: number };

interface WebhookEventRow {
  id: string;
  provider: PrismaPaymentProvider;
  externalEventId: string;
  eventType: string;
  externalPaymentId: string | null;
  payloadHash: string | null;
  processingStatus: WebhookProcessingStatus;
  errorSummary: string | null;
  processingStartedAt: Date | null;
  processedAt: Date | null;
  attemptCount: number;
  orderId: string | null;
}

interface LocalOrderItem {
  productId: string;
  variationId: string | null;
  quantity: number;
}

interface LocalOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: unknown;
  customer: { asaasCustomerId: string | null };
  items: LocalOrderItem[];
}

interface LocalPayment {
  id: string;
  orderId: string;
  provider: PrismaPaymentProvider;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: unknown;
  externalPaymentId: string | null;
  externalCheckoutId?: string | null;
  externalCustomerId: string | null;
  stockCommittedAt: Date | null;
  order: LocalOrder;
}

interface WebhookEventDelegate {
  create(args: unknown): Promise<WebhookEventRow>;
  findUnique(args: unknown): Promise<WebhookEventRow | null>;
  updateMany(args: unknown): Promise<CountResult>;
}

interface PaymentDelegate {
  findUnique(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<CountResult>;
}

interface UpdateManyDelegate {
  updateMany(args: unknown): Promise<CountResult>;
}

interface CreateDelegate {
  create(args: unknown): Promise<unknown>;
}

export interface WebhookTransactionDatabase {
  paymentWebhookEvent: WebhookEventDelegate;
  payment: PaymentDelegate;
  order: UpdateManyDelegate;
  orderStatusHistory: CreateDelegate;
  product: UpdateManyDelegate;
  productVariation: UpdateManyDelegate;
}

export interface WebhookProcessorDatabase {
  paymentWebhookEvent: WebhookEventDelegate;
  payment: PaymentDelegate;
  $transaction<T>(
    callback: (tx: WebhookTransactionDatabase) => Promise<T>,
    options?: { isolationLevel?: unknown }
  ): Promise<T>;
}

export type PaymentReconciliationService = Pick<
  PaymentService,
  "getPayment" | "refundPayment"
>;

export type WebhookPaymentService = PaymentReconciliationService &
  Pick<PaymentService, "interpretWebhook">;

export type WebhookProcessingOutcome =
  | "processed"
  | "ignored"
  | "duplicate"
  | "retry";

export interface ProcessAsaasWebhookResult {
  outcome: WebhookProcessingOutcome;
  httpStatus: 200 | 503;
  externalEventId: string | null;
  reason: string;
}

export interface ProcessAsaasWebhookInput {
  rawBody: string;
  payloadHash?: string;
  paymentService?: WebhookPaymentService;
  db?: WebhookProcessorDatabase;
  now?: () => Date;
  claimTimeoutMs?: number;
}

export interface RequestOrderRefundOptions {
  db?: WebhookProcessorDatabase;
  now?: () => Date;
}

export interface RequestOrderRefundResult {
  orderId: string;
  externalPaymentId: string;
  status: NormalizedPaymentStatus;
  rawStatus: string;
  stockRestored: boolean;
}

export interface ReconcileOrderPaymentOptions {
  db?: WebhookProcessorDatabase;
  now?: () => Date;
  sourceId?: string;
}

export interface ReconcileOrderPaymentResult {
  orderId: string;
  externalPaymentId: string;
  status: NormalizedPaymentStatus;
  changed: boolean;
  stockChanged: boolean;
}

export class WebhookPayloadError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "WebhookPayloadError";
  }
}

class InsufficientStockError extends Error {
  constructor() {
    super("Estoque insuficiente para confirmar o pagamento.");
    this.name = "InsufficientStockError";
  }
}

class ConcurrentPaymentMutationError extends Error {
  constructor() {
    super("O pagamento foi alterado concorrentemente.");
    this.name = "ConcurrentPaymentMutationError";
  }
}

interface Claim {
  eventRowId: string;
  externalEventId: string;
  startedAt: Date;
}

interface ApplyResult {
  changed: boolean;
  stockChanged: boolean;
  reason: string;
}

export function isValidAsaasWebhookToken(
  received: string | null,
  expected: string
): boolean {
  if (!received || !expected) return false;
  const receivedDigest = createHash("sha256").update(received, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(receivedDigest, expectedDigest);
}

export function hashAsaasWebhookPayload(rawBody: string): string {
  return createHash("sha256").update(rawBody, "utf8").digest("hex");
}

export async function processAsaasWebhook(
  input: ProcessAsaasWebhookInput
): Promise<ProcessAsaasWebhookResult> {
  const db = input.db ?? defaultDatabase();
  const paymentService = input.paymentService ?? createPaymentService();
  const now = input.now ?? (() => new Date());
  const calculatedHash = hashAsaasWebhookPayload(input.rawBody);
  if (input.payloadHash && input.payloadHash !== calculatedHash) {
    throw new WebhookPayloadError("Hash do payload do webhook divergente.");
  }

  const payload = parseWebhookJson(input.rawBody);
  const event = interpretWebhook(paymentService, payload);
  const registered = await registerEvent(db, event, calculatedHash);

  if (
    registered.payloadHash !== calculatedHash ||
    registered.eventType !== event.eventType ||
    registered.externalPaymentId !== event.externalPaymentId
  ) {
    return result("ignored", event.externalEventId, "event_id_conflict");
  }

  const startedAt = now();
  const claimTimeoutMs =
    input.claimTimeoutMs ?? DEFAULT_WEBHOOK_CLAIM_TIMEOUT_MS;
  const claimed = await claimEvent(
    db,
    registered,
    startedAt,
    claimTimeoutMs
  );
  if (!claimed) {
    const current = await db.paymentWebhookEvent.findUnique({
      where: { id: registered.id },
    });
    if (
      !current ||
      current.processingStatus === WebhookProcessingStatus.PROCESSING ||
      current.processingStatus === WebhookProcessingStatus.RECEIVED ||
      (current.processingStatus === WebhookProcessingStatus.FAILED &&
        !current.processedAt)
    ) {
      return result("retry", event.externalEventId, "processing_in_progress");
    }
    return result("duplicate", event.externalEventId, "already_processed");
  }

  if (event.eventType.startsWith("CHECKOUT_")) {
    try {
      const applied = await applyCheckoutLifecycleEvent(
        db,
        claimed,
        event,
        now()
      );
      return result(
        applied.changed ? "processed" : "ignored",
        event.externalEventId,
        applied.reason
      );
    } catch (error) {
      return finishFromError(db, claimed, event.externalEventId, error, now);
    }
  }

  if (!KNOWN_ASAAS_PAYMENT_EVENTS.has(event.eventType)) {
    await finishEvent(
      db.paymentWebhookEvent,
      claimed,
      WebhookProcessingStatus.IGNORED,
      "unknown_event",
      now()
    );
    return result("ignored", event.externalEventId, "unknown_event");
  }

  let providerPayment: ProviderPayment;
  try {
    // A consulta ao Asaas nunca ocorre dentro de uma transação de banco.
    providerPayment = await paymentService.getPayment(
      event.externalPaymentId
    );
  } catch (error) {
    return finishFromError(db, claimed, event.externalEventId, error, now);
  }

  if (providerPayment.status === "UNKNOWN") {
    await finishEvent(
      db.paymentWebhookEvent,
      claimed,
      WebhookProcessingStatus.IGNORED,
      "unknown_provider_status",
      now()
    );
    return result(
      "ignored",
      event.externalEventId,
      "unknown_provider_status"
    );
  }

  const basicMismatch = validateProviderIdentity(event, providerPayment);
  if (basicMismatch) {
    await finishEvent(
      db.paymentWebhookEvent,
      claimed,
      WebhookProcessingStatus.FAILED,
      basicMismatch,
      now(),
      { terminal: true }
    );
    return result("ignored", event.externalEventId, basicMismatch);
  }

  const orderId = providerPayment.externalReference!;
  let localPayment: LocalPayment | null;
  try {
    localPayment = await findLocalPayment(db, orderId);
  } catch (error) {
    return finishFromError(db, claimed, event.externalEventId, error, now);
  }

  if (!localPayment || !localPayment.externalPaymentId) {
    if (
      localPayment &&
      !localPayment.externalPaymentId &&
      providerMethodMatchesLocal(localPayment.method, providerPayment.method) &&
      providerPayment.externalReference === localPayment.order.id &&
      toCents(providerPayment.amount) === toCents(localPayment.amount) &&
      (!localPayment.order.customer.asaasCustomerId ||
        localPayment.order.customer.asaasCustomerId ===
          providerPayment.externalCustomerId)
    ) {
      const linked = await db.payment.updateMany({
        where: {
          id: localPayment.id,
          externalPaymentId: null,
        },
        data: {
          externalPaymentId: providerPayment.externalPaymentId,
          gatewayId: providerPayment.externalPaymentId,
          externalCustomerId: providerPayment.externalCustomerId,
        },
      });
      if (linked.count === 1) {
        localPayment.externalPaymentId = providerPayment.externalPaymentId;
        localPayment.externalCustomerId = providerPayment.externalCustomerId;
      }
    }
  }

  if (!localPayment || !localPayment.externalPaymentId) {
    await finishEvent(
      db.paymentWebhookEvent,
      claimed,
      WebhookProcessingStatus.FAILED,
      "local_payment_not_linked",
      now(),
      { terminal: false }
    );
    return result(
      "retry",
      event.externalEventId,
      "local_payment_not_linked"
    );
  }

  const localMismatch = validateLocalPayment(localPayment, providerPayment);
  if (localMismatch) {
    await finishEvent(
      db.paymentWebhookEvent,
      claimed,
      WebhookProcessingStatus.FAILED,
      localMismatch,
      now(),
      { terminal: true, orderId: localPayment.orderId }
    );
    return result("ignored", event.externalEventId, localMismatch);
  }

  try {
    const applied = await applyProviderState(
      db,
      claimed,
      localPayment,
      providerPayment,
      now()
    );
    return result(
      applied.changed ? "processed" : "ignored",
      event.externalEventId,
      applied.reason
    );
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return refundAfterInsufficientStock({
        db,
        claim: claimed,
        localPayment,
        providerPayment,
        paymentService,
        externalEventId: event.externalEventId,
        now,
      });
    }
    return finishFromError(db, claimed, event.externalEventId, error, now);
  }
}

function providerMethodMatchesLocal(
  local: PaymentMethod,
  provider: ProviderPayment["method"]
): boolean {
  return (
    (local === PaymentMethod.PIX && provider === "PIX") ||
    (local === PaymentMethod.CARTAO_CREDITO && provider === "CREDIT_CARD") ||
    (local === PaymentMethod.BOLETO && provider === "BOLETO")
  );
}

async function applyCheckoutLifecycleEvent(
  db: WebhookProcessorDatabase,
  claim: Claim,
  event: PaymentWebhookEvent,
  changedAt: Date
): Promise<ApplyResult> {
  const local = (await db.payment.findUnique({
    where: {
      provider_externalCheckoutId: {
        provider: PrismaPaymentProvider.ASAAS,
        externalCheckoutId: event.externalPaymentId,
      },
    },
    include: { order: true },
  })) as (LocalPayment & { order: LocalOrder }) | null;

  if (!local) {
    throw new PaymentValidationError(
      "Checkout Asaas ainda não está vinculado ao pedido."
    );
  }
  if (local.method !== PaymentMethod.CARTAO_CREDITO) {
    throw new PaymentValidationError(
      "Evento de checkout vinculado a método divergente."
    );
  }

  const transition =
    event.eventType === "CHECKOUT_PAID"
      ? {
          payment: PaymentStatus.EM_ANALISE,
          order: OrderStatus.AGUARDANDO_PAGAMENTO,
          note: "Checkout concluído; aguardando confirmação financeira.",
          reason: "checkout_completed_pending_payment",
        }
      : event.eventType === "CHECKOUT_EXPIRED"
        ? {
            payment: PaymentStatus.EXPIRADO,
            order: OrderStatus.PAGAMENTO_EXPIRADO,
            note: "Checkout de cartão expirado.",
            reason: "checkout_expired",
          }
        : event.eventType === "CHECKOUT_CANCELED"
          ? {
              payment: PaymentStatus.CANCELADO,
              order: OrderStatus.FALHA_NO_PAGAMENTO,
              note: "Checkout de cartão cancelado.",
              reason: "checkout_canceled",
            }
          : null;

  if (!transition) {
    await finishEvent(
      db.paymentWebhookEvent,
      claim,
      WebhookProcessingStatus.IGNORED,
      "checkout_event_without_financial_effect",
      changedAt,
      { orderId: local.orderId }
    );
    return {
      changed: false,
      stockChanged: false,
      reason: "checkout_event_without_financial_effect",
    };
  }

  return db.$transaction(
    async (tx) => {
      const changed = await tx.payment.updateMany({
        where: {
          id: local.id,
          status: {
            in: [
              PaymentStatus.AGUARDANDO,
              PaymentStatus.EM_ANALISE,
            ],
          },
          stockCommittedAt: null,
        },
        data: {
          status: transition.payment,
          lastProviderStatus: event.rawPaymentStatus,
        },
      });
      if (changed.count > 0) {
        await updateOrderStatus(
          tx,
          local.order,
          transition.order,
          transition.note
        );
      }
      await finishEvent(
        tx.paymentWebhookEvent,
        claim,
        WebhookProcessingStatus.PROCESSED,
        transition.reason,
        changedAt,
        { orderId: local.orderId }
      );
      return {
        changed: changed.count > 0,
        stockChanged: false,
        reason: transition.reason,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Fluxo reutilizável pelo admin: a intenção local é gravada primeiro, a chamada
 * externa ocorre sem transação aberta e o resultado é reconciliado depois.
 */
export async function requestOrderRefund(
  orderId: string,
  paymentService: PaymentReconciliationService,
  reason: string,
  options: RequestOrderRefundOptions = {}
): Promise<RequestOrderRefundResult> {
  const db = options.db ?? defaultDatabase();
  const now = options.now ?? (() => new Date());
  const safeReason = compactReason(reason || "Estorno solicitado");

  const localPayment = await markOrderRefundPending(
    db,
    orderId,
    safeReason,
    now()
  );
  if (!localPayment.externalPaymentId) {
    throw new PaymentValidationError(
      "Pagamento não possui identificador Asaas."
    );
  }

  // Consulta/estorno no provedor sempre fora de transação.
  const current = await paymentService.getPayment(
    localPayment.externalPaymentId
  );
  validateLocalPaymentOrThrow(localPayment, current);

  let reconciled: ProviderPayment | RefundPaymentResult = current;
  if (current.status === "PAID" || current.status === "PARTIALLY_REFUNDED") {
    reconciled = await paymentService.refundPayment({
      externalPaymentId: current.externalPaymentId,
      description: safeReason,
    });
  } else if (
    current.status !== "REFUND_PENDING" &&
    current.status !== "REFUNDED"
  ) {
    throw new PaymentValidationError(
      "O estado atual da cobrança Asaas não permite estorno."
    );
  }

  const finalStatus = reconciled.status;
  const rawStatus = reconciled.rawStatus;
  if (
    finalStatus !== "REFUND_PENDING" &&
    finalStatus !== "PARTIALLY_REFUNDED" &&
    finalStatus !== "REFUNDED"
  ) {
    throw new PaymentProviderError({
      operation: "refund_payment",
      message: "A Asaas ainda não confirmou o início do estorno.",
      retryable: true,
    });
  }
  if (finalStatus === "REFUND_PENDING" || finalStatus === "PARTIALLY_REFUNDED") {
    await applyRefundPending(db, null, localPayment, rawStatus, now());
  }
  const stockRestored =
    finalStatus === "REFUNDED"
      ? await applyRefundedWithoutEvent(
          db,
          localPayment,
          rawStatus,
          safeReason,
          now()
        )
      : false;

  return {
    orderId,
    externalPaymentId: localPayment.externalPaymentId,
    status: finalStatus,
    rawStatus,
    stockRestored,
  };
}

/**
 * Reconcilia uma cobrança já vinculada (por exemplo, após retomar checkout).
 * Nunca confia no estado retornado anteriormente pela criação da cobrança.
 */
export async function reconcileOrderPayment(
  orderId: string,
  paymentService: PaymentReconciliationService,
  optionsOrSourceId: ReconcileOrderPaymentOptions | string = {}
): Promise<ReconcileOrderPaymentResult> {
  const options =
    typeof optionsOrSourceId === "string"
      ? { sourceId: optionsOrSourceId }
      : optionsOrSourceId;
  const db = options.db ?? defaultDatabase();
  const now = options.now ?? (() => new Date());
  const localPayment = await findLocalPayment(db, orderId);
  if (!localPayment?.externalPaymentId) {
    throw new PaymentValidationError(
      "Pagamento Asaas ainda não está vinculado ao pedido."
    );
  }

  const providerPayment = await paymentService.getPayment(
    localPayment.externalPaymentId
  );
  validateLocalPaymentOrThrow(localPayment, providerPayment);
  if (
    providerPayment.status === "UNKNOWN" ||
    (providerPayment.status === "PAID" &&
      providerPayment.rawStatus !== "RECEIVED" &&
      !(
        localPayment.method === PaymentMethod.CARTAO_CREDITO &&
        providerPayment.rawStatus === "CONFIRMED"
      ))
  ) {
    return {
      orderId,
      externalPaymentId: localPayment.externalPaymentId,
      status: providerPayment.status,
      changed: false,
      stockChanged: false,
    };
  }

  try {
    const applied = await applyProviderStateWithoutEvent(
      db,
      localPayment,
      providerPayment,
      now()
    );
    return {
      orderId,
      externalPaymentId: localPayment.externalPaymentId,
      status: providerPayment.status,
      changed: applied.changed,
      stockChanged: applied.stockChanged,
    };
  } catch (error) {
    if (!(error instanceof InsufficientStockError)) throw error;

    await markOrderRefundPending(
      db,
      orderId,
      "Estorno automático: estoque indisponível após recebimento.",
      now(),
      { allowUncommittedReceived: true }
    );
    const refund = await paymentService.refundPayment({
      externalPaymentId: providerPayment.externalPaymentId,
      description: "Estorno automático por indisponibilidade de estoque.",
    });
    const refreshed = await findLocalPayment(db, orderId);
    if (!refreshed) throw new ConcurrentPaymentMutationError();

    if (refund.status === "REFUNDED") {
      await applyRefunded(db, null, refreshed, refund.rawStatus, now());
    } else if (
      refund.status === "REFUND_PENDING" ||
      refund.status === "PARTIALLY_REFUNDED"
    ) {
      await applyRefundPending(db, null, refreshed, refund.rawStatus, now());
    } else {
      throw new PaymentProviderError({
        operation: "refund_payment",
        message: "A Asaas ainda não confirmou o início do estorno.",
        retryable: true,
      });
    }

    void options.sourceId;
    return {
      orderId,
      externalPaymentId: localPayment.externalPaymentId,
      status: refund.status,
      changed: true,
      stockChanged: false,
    };
  }
}

function parseWebhookJson(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new WebhookPayloadError("JSON do webhook inválido.");
  }
}

function interpretWebhook(
  paymentService: WebhookPaymentService,
  payload: unknown
): PaymentWebhookEvent {
  try {
    return paymentService.interpretWebhook(payload);
  } catch (error) {
    if (error instanceof PaymentValidationError) {
      throw new WebhookPayloadError(error.message);
    }
    throw error;
  }
}

async function registerEvent(
  db: WebhookProcessorDatabase,
  event: PaymentWebhookEvent,
  payloadHash: string
): Promise<WebhookEventRow> {
  try {
    return await db.paymentWebhookEvent.create({
      data: {
        provider: PrismaPaymentProvider.ASAAS,
        externalEventId: event.externalEventId,
        eventType: event.eventType,
        externalPaymentId: event.externalPaymentId,
        payloadHash,
        processingStatus: WebhookProcessingStatus.RECEIVED,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const existing = await db.paymentWebhookEvent.findUnique({
      where: {
        provider_externalEventId: {
          provider: PrismaPaymentProvider.ASAAS,
          externalEventId: event.externalEventId,
        },
      },
    });
    if (!existing) throw error;
    return existing;
  }
}

async function claimEvent(
  db: WebhookProcessorDatabase,
  event: WebhookEventRow,
  startedAt: Date,
  claimTimeoutMs: number
): Promise<Claim | null> {
  if (!Number.isFinite(claimTimeoutMs) || claimTimeoutMs < 1_000) {
    throw new WebhookPayloadError("Tempo de claim do webhook inválido.");
  }
  const staleBefore = new Date(startedAt.getTime() - claimTimeoutMs);
  const claimed = await db.paymentWebhookEvent.updateMany({
    where: {
      id: event.id,
      OR: [
        { processingStatus: WebhookProcessingStatus.RECEIVED },
        {
          processingStatus: WebhookProcessingStatus.FAILED,
          processedAt: null,
        },
        {
          processingStatus: WebhookProcessingStatus.PROCESSING,
          processingStartedAt: { lt: staleBefore },
        },
      ],
    },
    data: {
      processingStatus: WebhookProcessingStatus.PROCESSING,
      processingStartedAt: startedAt,
      processedAt: null,
      errorSummary: null,
      attemptCount: { increment: 1 },
    },
  });
  if (claimed.count !== 1) return null;
  return {
    eventRowId: event.id,
    externalEventId: event.externalEventId,
    startedAt,
  };
}

async function finishEvent(
  delegate: WebhookEventDelegate,
  claim: Claim,
  status: WebhookProcessingStatus,
  reason: string,
  finishedAt: Date,
  options: { terminal?: boolean; orderId?: string } = {}
): Promise<void> {
  const terminal = options.terminal ?? status !== WebhookProcessingStatus.FAILED;
  const updated = await delegate.updateMany({
    where: leaseWhere(claim),
    data: {
      processingStatus: status,
      processingStartedAt: null,
      processedAt: terminal ? finishedAt : null,
      errorSummary: compactReason(reason),
      orderId: options.orderId,
    },
  });
  if (updated.count !== 1) throw new ConcurrentPaymentMutationError();
}

async function finishFromError(
  db: WebhookProcessorDatabase,
  claim: Claim,
  externalEventId: string,
  error: unknown,
  now: () => Date
): Promise<ProcessAsaasWebhookResult> {
  const retryable = isRetryableError(error);
  try {
    await finishEvent(
      db.paymentWebhookEvent,
      claim,
      WebhookProcessingStatus.FAILED,
      safeErrorReason(error),
      now(),
      { terminal: !retryable }
    );
  } catch {
    return result("retry", externalEventId, "event_finalize_failed");
  }
  return retryable
    ? result("retry", externalEventId, "transient_processing_error")
    : result("ignored", externalEventId, "permanent_processing_error");
}

function validateProviderIdentity(
  event: PaymentWebhookEvent,
  payment: ProviderPayment
): string | null {
  if (payment.provider !== "ASAAS") return "provider_mismatch";
  if (payment.externalPaymentId !== event.externalPaymentId) {
    return "external_payment_id_mismatch";
  }
  if (!payment.externalReference) return "external_reference_missing";
  if (!payment.externalCustomerId) return "external_customer_missing";
  if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
    return "payment_amount_invalid";
  }
  return null;
}

function validateLocalPayment(
  local: LocalPayment,
  provider: ProviderPayment
): string | null {
  if (local.provider !== PrismaPaymentProvider.ASAAS) {
    return "local_provider_mismatch";
  }
  const expectedMethod =
    local.method === PaymentMethod.CARTAO_CREDITO
      ? "CREDIT_CARD"
      : local.method === PaymentMethod.BOLETO
        ? "BOLETO"
        : "PIX";
  if (provider.method !== expectedMethod) return "local_method_mismatch";
  if (local.order.id !== provider.externalReference) {
    return "order_reference_mismatch";
  }
  if (local.externalPaymentId !== provider.externalPaymentId) {
    return "local_external_payment_id_mismatch";
  }
  if (local.externalCustomerId !== provider.externalCustomerId) {
    return "local_external_customer_mismatch";
  }
  if (
    local.order.customer.asaasCustomerId &&
    local.order.customer.asaasCustomerId !== provider.externalCustomerId
  ) {
    return "customer_reference_mismatch";
  }
  if (
    toCents(local.amount) !== toCents(provider.amount) ||
    toCents(local.order.total) !== toCents(provider.amount)
  ) {
    return "payment_amount_mismatch";
  }
  return null;
}

function validateLocalPaymentOrThrow(
  local: LocalPayment,
  provider: ProviderPayment
): void {
  const mismatch =
    validateProviderIdentity(
      {
        provider: "ASAAS",
        externalEventId: "reconciliation",
        eventType: "PAYMENT_RECONCILIATION",
        externalPaymentId: local.externalPaymentId ?? "",
        occurredAt: null,
        status: provider.status,
        rawPaymentStatus: provider.rawStatus,
      },
      provider
    ) ?? validateLocalPayment(local, provider);
  if (mismatch) {
    throw new PaymentValidationError(
      `Cobrança Asaas divergente do pedido (${mismatch}).`
    );
  }
}

async function findLocalPayment(
  db: WebhookProcessorDatabase,
  orderId: string
): Promise<LocalPayment | null> {
  return (await db.payment.findUnique({
    where: { orderId },
    include: {
      order: {
        include: {
          items: true,
          customer: { select: { asaasCustomerId: true } },
        },
      },
    },
  })) as LocalPayment | null;
}

async function applyProviderState(
  db: WebhookProcessorDatabase,
  claim: Claim,
  local: LocalPayment,
  provider: ProviderPayment,
  changedAt: Date
): Promise<ApplyResult> {
  return applyProviderStateCore(db, local, provider, changedAt, claim);
}

async function applyProviderStateWithoutEvent(
  db: WebhookProcessorDatabase,
  local: LocalPayment,
  provider: ProviderPayment,
  changedAt: Date
): Promise<ApplyResult> {
  return applyProviderStateCore(db, local, provider, changedAt, null);
}

async function applyProviderStateCore(
  db: WebhookProcessorDatabase,
  local: LocalPayment,
  provider: ProviderPayment,
  changedAt: Date,
  claim: Claim | null
): Promise<ApplyResult> {
  if (provider.status === "PAID") {
    const acceptedAsPaid =
      provider.rawStatus === "RECEIVED" ||
      (local.method === PaymentMethod.CARTAO_CREDITO &&
        provider.rawStatus === "CONFIRMED");
    if (!acceptedAsPaid) {
      return ignoreState(
        db,
        claim,
        local.orderId,
        local.method === PaymentMethod.PIX
          ? "pix_not_received"
          : "payment_not_financially_confirmed",
        changedAt
      );
    }
    if (
      local.status === PaymentStatus.ESTORNO_PENDENTE &&
      !local.stockCommittedAt
    ) {
      throw new InsufficientStockError();
    }
    if (local.status === PaymentStatus.ESTORNO_PENDENTE) {
      return ignoreState(
        db,
        claim,
        local.orderId,
        "refund_already_pending",
        changedAt
      );
    }
    return applyPaid(db, claim, local, provider, changedAt);
  }

  if (provider.status === "REFUNDED") {
    return applyRefunded(db, claim, local, provider.rawStatus, changedAt);
  }

  if (
    provider.status === "REFUND_PENDING" ||
    provider.status === "PARTIALLY_REFUNDED"
  ) {
    return applyRefundPending(db, claim, local, provider.rawStatus, changedAt);
  }

  const current = toNormalizedStatus(local.status);
  const transition = resolvePaymentStatusTransition(current, provider.status);
  if (!transition.allowed || !transition.changed) {
    return ignoreState(
      db,
      claim,
      local.orderId,
      transition.allowed ? "status_already_applied" : "status_out_of_order",
      changedAt
    );
  }

  const target = toDatabasePaymentStatus(provider.status);
  if (!target) {
    return ignoreState(db, claim, local.orderId, "unsupported_status", changedAt);
  }

  return db.$transaction(
    async (tx) => {
      const paymentChanged = await tx.payment.updateMany({
        where: {
          id: local.id,
          status: local.status,
          provider: PrismaPaymentProvider.ASAAS,
          externalPaymentId: provider.externalPaymentId,
        },
        data: {
          status: target,
          lastProviderStatus: provider.rawStatus,
        },
      });
      if (paymentChanged.count !== 1) {
        throw new ConcurrentPaymentMutationError();
      }

      await updateOrderStatus(
        tx,
        local.order,
        toOrderStatus(provider.status),
        statusHistoryNote(provider.status)
      );
      if (claim) {
        await finishEvent(
          tx.paymentWebhookEvent,
          claim,
          WebhookProcessingStatus.PROCESSED,
          "status_reconciled",
          changedAt,
          { orderId: local.orderId }
        );
      }
      return {
        changed: true,
        stockChanged: false,
        reason: "status_reconciled",
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

async function applyPaid(
  db: WebhookProcessorDatabase,
  claim: Claim | null,
  local: LocalPayment,
  provider: ProviderPayment,
  changedAt: Date
): Promise<ApplyResult> {
  const current = toNormalizedStatus(local.status);
  const transition = resolvePaymentStatusTransition(current, "PAID");
  if (!transition.allowed && current !== "PAID") {
    return ignoreState(
      db,
      claim,
      local.orderId,
      "status_out_of_order",
      changedAt
    );
  }
  if (local.status === PaymentStatus.PAGO && local.stockCommittedAt) {
    return ignoreState(
      db,
      claim,
      local.orderId,
      "payment_already_received",
      changedAt
    );
  }

  return db.$transaction(
    async (tx) => {
      const paymentChanged = await tx.payment.updateMany({
        where: {
          id: local.id,
          status: local.status,
          provider: PrismaPaymentProvider.ASAAS,
          externalPaymentId: provider.externalPaymentId,
          stockCommittedAt: null,
        },
        data: {
          status: PaymentStatus.PAGO,
          lastProviderStatus: provider.rawStatus,
          paidAt: changedAt,
          confirmedAt:
            provider.rawStatus === "CONFIRMED" ? changedAt : undefined,
          receivedAt:
            provider.rawStatus === "RECEIVED" ? changedAt : undefined,
          stockCommittedAt: changedAt,
        },
      });
      if (paymentChanged.count !== 1) {
        throw new ConcurrentPaymentMutationError();
      }

      await decrementStock(tx, local.order.items);
      await updateOrderStatus(
        tx,
        local.order,
        OrderStatus.PAGAMENTO_APROVADO,
        "Pagamento confirmado e estoque atualizado."
      );
      if (claim) {
        await finishEvent(
          tx.paymentWebhookEvent,
          claim,
          WebhookProcessingStatus.PROCESSED,
          "payment_received",
          changedAt,
          { orderId: local.orderId }
        );
      }
      return {
        changed: true,
        stockChanged: true,
        reason: "payment_received",
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

async function decrementStock(
  tx: WebhookTransactionDatabase,
  items: LocalOrderItem[]
): Promise<void> {
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new InsufficientStockError();
    }
    const changed = item.variationId
      ? await tx.productVariation.updateMany({
          where: { id: item.variationId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        })
      : await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: {
            stock: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        });
    if (changed.count !== 1) throw new InsufficientStockError();
  }
}

async function applyRefundPending(
  db: WebhookProcessorDatabase,
  claim: Claim | null,
  local: LocalPayment,
  rawStatus: string,
  changedAt: Date
): Promise<ApplyResult> {
  if (local.status === PaymentStatus.REEMBOLSADO) {
    return ignoreState(
      db,
      claim,
      local.orderId,
      "refund_already_completed",
      changedAt
    );
  }
  return db.$transaction(
    async (tx) => {
      const paymentChanged = await tx.payment.updateMany({
        where: {
          id: local.id,
          status: local.status,
          provider: PrismaPaymentProvider.ASAAS,
        },
        data: {
          status: PaymentStatus.ESTORNO_PENDENTE,
          lastProviderStatus: rawStatus,
        },
      });
      if (paymentChanged.count !== 1) {
        throw new ConcurrentPaymentMutationError();
      }
      await updateOrderStatus(
        tx,
        local.order,
        OrderStatus.REEMBOLSO_PENDENTE,
        "Estorno do pagamento em processamento."
      );
      if (claim) {
        await finishEvent(
          tx.paymentWebhookEvent,
          claim,
          WebhookProcessingStatus.PROCESSED,
          "refund_pending",
          changedAt,
          { orderId: local.orderId }
        );
      }
      return {
        changed: local.status !== PaymentStatus.ESTORNO_PENDENTE,
        stockChanged: false,
        reason: "refund_pending",
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

async function applyRefunded(
  db: WebhookProcessorDatabase,
  claim: Claim | null,
  local: LocalPayment,
  rawStatus: string,
  changedAt: Date
): Promise<ApplyResult> {
  return db.$transaction(
    async (tx) => {
      const stockClaimed = await tx.payment.updateMany({
        where: {
          id: local.id,
          provider: PrismaPaymentProvider.ASAAS,
          stockCommittedAt: { not: null },
        },
        data: {
          status: PaymentStatus.REEMBOLSADO,
          lastProviderStatus: rawStatus,
          refundedAt: changedAt,
          stockCommittedAt: null,
        },
      });

      let changed = stockClaimed.count === 1;
      if (stockClaimed.count === 1) {
        await restoreStock(tx, local.order.items);
      } else {
        const statusChanged = await tx.payment.updateMany({
          where: {
            id: local.id,
            provider: PrismaPaymentProvider.ASAAS,
            status: { not: PaymentStatus.REEMBOLSADO },
          },
          data: {
            status: PaymentStatus.REEMBOLSADO,
            lastProviderStatus: rawStatus,
            refundedAt: changedAt,
          },
        });
        changed = statusChanged.count === 1;
      }

      await updateOrderStatus(
        tx,
        local.order,
        OrderStatus.REEMBOLSADO,
        "Pagamento estornado; estoque restaurado quando aplicável."
      );
      if (claim) {
        await finishEvent(
          tx.paymentWebhookEvent,
          claim,
          WebhookProcessingStatus.PROCESSED,
          "payment_refunded",
          changedAt,
          { orderId: local.orderId }
        );
      }
      return {
        changed,
        stockChanged: stockClaimed.count === 1,
        reason: "payment_refunded",
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

async function restoreStock(
  tx: WebhookTransactionDatabase,
  items: LocalOrderItem[]
): Promise<void> {
  for (const item of items) {
    if (item.variationId) {
      const restored = await tx.productVariation.updateMany({
        where: { id: item.variationId },
        data: { stock: { increment: item.quantity } },
      });
      if (restored.count !== 1) throw new ConcurrentPaymentMutationError();
    } else {
      const restored = await tx.product.updateMany({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
      if (restored.count !== 1) throw new ConcurrentPaymentMutationError();
      await tx.product.updateMany({
        where: { id: item.productId, soldCount: { gte: item.quantity } },
        data: { soldCount: { decrement: item.quantity } },
      });
    }
  }
}

async function ignoreState(
  db: WebhookProcessorDatabase,
  claim: Claim | null,
  orderId: string,
  reason: string,
  changedAt: Date
): Promise<ApplyResult> {
  if (claim) {
    await finishEvent(
      db.paymentWebhookEvent,
      claim,
      WebhookProcessingStatus.IGNORED,
      reason,
      changedAt,
      { orderId }
    );
  }
  return { changed: false, stockChanged: false, reason };
}

async function updateOrderStatus(
  tx: WebhookTransactionDatabase,
  order: LocalOrder,
  target: OrderStatus | null,
  note: string
): Promise<void> {
  if (!target || order.status === target) return;
  const allowed = allowedOrderSources(target);
  if (!allowed.includes(order.status)) return;
  const changed = await tx.order.updateMany({
    where: { id: order.id, status: { in: allowed } },
    data: { status: target },
  });
  if (changed.count === 1) {
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, status: target, note },
    });
  }
}

async function refundAfterInsufficientStock(options: {
  db: WebhookProcessorDatabase;
  claim: Claim;
  localPayment: LocalPayment;
  providerPayment: ProviderPayment;
  paymentService: WebhookPaymentService;
  externalEventId: string;
  now: () => Date;
}): Promise<ProcessAsaasWebhookResult> {
  const {
    db,
    claim,
    localPayment,
    providerPayment,
    paymentService,
    externalEventId,
    now,
  } = options;
  try {
    await markOrderRefundPending(
      db,
      localPayment.orderId,
      "Estorno automático: estoque indisponível após recebimento.",
      now(),
      { allowUncommittedReceived: true }
    );

    const refund = await paymentService.refundPayment({
      externalPaymentId: providerPayment.externalPaymentId,
      description: "Estorno automático por indisponibilidade de estoque.",
    });

    const refreshed = await findLocalPayment(db, localPayment.orderId);
    if (!refreshed) throw new ConcurrentPaymentMutationError();
    if (refund.status === "REFUNDED") {
      await applyRefunded(
        db,
        claim,
        refreshed,
        refund.rawStatus,
        now()
      );
    } else if (
      refund.status === "REFUND_PENDING" ||
      refund.status === "PARTIALLY_REFUNDED"
    ) {
      await applyRefundPending(
        db,
        claim,
        refreshed,
        refund.rawStatus,
        now()
      );
    } else {
      throw new PaymentProviderError({
        operation: "refund_payment",
        message: "A Asaas ainda não confirmou o início do estorno.",
        retryable: true,
      });
    }
    return result("processed", externalEventId, "insufficient_stock_refund");
  } catch (error) {
    return finishFromError(db, claim, externalEventId, error, now);
  }
}

async function markOrderRefundPending(
  db: WebhookProcessorDatabase,
  orderId: string,
  reason: string,
  changedAt: Date,
  options: { allowUncommittedReceived?: boolean } = {}
): Promise<LocalPayment> {
  return db.$transaction(
    async (tx) => {
      const payment = (await tx.payment.findUnique({
        where: { orderId },
        include: {
          order: {
            include: {
              items: true,
              customer: { select: { asaasCustomerId: true } },
            },
          },
        },
      })) as LocalPayment | null;
      if (!payment) {
        throw new PaymentValidationError("Pagamento do pedido não encontrado.");
      }
      if (
        payment.provider !== PrismaPaymentProvider.ASAAS
      ) {
        throw new PaymentValidationError(
          "O provedor original deste pagamento não está disponível para estorno."
        );
      }
      const canMarkUncommittedReceived =
        options.allowUncommittedReceived === true &&
        !payment.stockCommittedAt &&
        ([
          PaymentStatus.AGUARDANDO,
          PaymentStatus.EM_ANALISE,
          PaymentStatus.EXPIRADO,
        ] as PaymentStatus[]).includes(payment.status);
      if (
        payment.status !== PaymentStatus.PAGO &&
        payment.status !== PaymentStatus.ESTORNO_PENDENTE &&
        payment.status !== PaymentStatus.REEMBOLSADO &&
        !canMarkUncommittedReceived
      ) {
        throw new PaymentValidationError(
          "Somente pagamentos recebidos podem ser estornados."
        );
      }

      if (payment.status === PaymentStatus.PAGO || canMarkUncommittedReceived) {
        const marked = await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: payment.status,
            stockCommittedAt: payment.stockCommittedAt,
          },
          data: { status: PaymentStatus.ESTORNO_PENDENTE },
        });
        if (marked.count !== 1) throw new ConcurrentPaymentMutationError();
      }
      await updateOrderStatus(
        tx,
        payment.order,
        OrderStatus.REEMBOLSO_PENDENTE,
        reason
      );
      void changedAt;
      return {
        ...payment,
        status:
          payment.status === PaymentStatus.REEMBOLSADO
            ? PaymentStatus.REEMBOLSADO
            : PaymentStatus.ESTORNO_PENDENTE,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

async function applyRefundedWithoutEvent(
  db: WebhookProcessorDatabase,
  local: LocalPayment,
  rawStatus: string,
  reason: string,
  changedAt: Date
): Promise<boolean> {
  const result = await applyRefunded(db, null, local, rawStatus, changedAt);
  void reason;
  return result.stockChanged;
}

function toNormalizedStatus(status: PaymentStatus): NormalizedPaymentStatus {
  switch (status) {
    case PaymentStatus.AGUARDANDO:
      return "PENDING";
    case PaymentStatus.EM_ANALISE:
      return "UNDER_REVIEW";
    case PaymentStatus.PAGO:
      return "PAID";
    case PaymentStatus.EXPIRADO:
      return "EXPIRED";
    case PaymentStatus.CANCELADO:
      return "CANCELED";
    case PaymentStatus.ESTORNO_PENDENTE:
      return "REFUND_PENDING";
    case PaymentStatus.REEMBOLSADO:
      return "REFUNDED";
    case PaymentStatus.RECUSADO:
    case PaymentStatus.FALHA:
      return "FAILED";
  }
}

function toDatabasePaymentStatus(
  status: NormalizedPaymentStatus
): PaymentStatus | null {
  switch (status) {
    case "PENDING":
      return PaymentStatus.AGUARDANDO;
    case "UNDER_REVIEW":
      return PaymentStatus.EM_ANALISE;
    case "PAID":
      return PaymentStatus.PAGO;
    case "EXPIRED":
      return PaymentStatus.EXPIRADO;
    case "CANCELED":
      return PaymentStatus.CANCELADO;
    case "REFUND_PENDING":
    case "PARTIALLY_REFUNDED":
      return PaymentStatus.ESTORNO_PENDENTE;
    case "REFUNDED":
      return PaymentStatus.REEMBOLSADO;
    case "FAILED":
      return PaymentStatus.RECUSADO;
    case "UNKNOWN":
      return null;
  }
}

function toOrderStatus(status: NormalizedPaymentStatus): OrderStatus | null {
  switch (status) {
    case "PENDING":
      return OrderStatus.AGUARDANDO_PAGAMENTO;
    case "UNDER_REVIEW":
      return OrderStatus.PAGAMENTO_PENDENTE;
    case "PAID":
      return OrderStatus.PAGAMENTO_APROVADO;
    case "EXPIRED":
      return OrderStatus.PAGAMENTO_EXPIRADO;
    case "FAILED":
      return OrderStatus.FALHA_NO_PAGAMENTO;
    case "CANCELED":
      return OrderStatus.CANCELADO;
    case "REFUND_PENDING":
    case "PARTIALLY_REFUNDED":
      return OrderStatus.REEMBOLSO_PENDENTE;
    case "REFUNDED":
      return OrderStatus.REEMBOLSADO;
    case "UNKNOWN":
      return null;
  }
}

function allowedOrderSources(target: OrderStatus): OrderStatus[] {
  switch (target) {
    case OrderStatus.AGUARDANDO_PAGAMENTO:
      return [
        OrderStatus.CRIADO,
        OrderStatus.PAGAMENTO_PENDENTE,
        OrderStatus.FALHA_NO_PAGAMENTO,
        OrderStatus.CANCELADO,
      ];
    case OrderStatus.PAGAMENTO_PENDENTE:
      return [OrderStatus.CRIADO, OrderStatus.AGUARDANDO_PAGAMENTO];
    case OrderStatus.PAGAMENTO_APROVADO:
      return [
        OrderStatus.CRIADO,
        OrderStatus.AGUARDANDO_PAGAMENTO,
        OrderStatus.PAGAMENTO_PENDENTE,
        OrderStatus.PAGAMENTO_EXPIRADO,
        OrderStatus.CANCELADO,
      ];
    case OrderStatus.PAGAMENTO_EXPIRADO:
      return [
        OrderStatus.CRIADO,
        OrderStatus.AGUARDANDO_PAGAMENTO,
        OrderStatus.PAGAMENTO_PENDENTE,
      ];
    case OrderStatus.FALHA_NO_PAGAMENTO:
    case OrderStatus.CANCELADO:
      return [
        OrderStatus.CRIADO,
        OrderStatus.AGUARDANDO_PAGAMENTO,
        OrderStatus.PAGAMENTO_PENDENTE,
        OrderStatus.PAGAMENTO_EXPIRADO,
        OrderStatus.FALHA_NO_PAGAMENTO,
      ];
    case OrderStatus.REEMBOLSO_PENDENTE:
      return Object.values(OrderStatus).filter(
        (status) =>
          status !== OrderStatus.REEMBOLSO_PENDENTE &&
          status !== OrderStatus.REEMBOLSADO
      );
    case OrderStatus.REEMBOLSADO:
      return Object.values(OrderStatus).filter(
        (status) => status !== OrderStatus.REEMBOLSADO
      );
    default:
      return [];
  }
}

function statusHistoryNote(status: NormalizedPaymentStatus): string {
  switch (status) {
    case "PENDING":
      return "Cobrança Pix aguardando pagamento.";
    case "UNDER_REVIEW":
      return "Pagamento Asaas em análise; estoque ainda não confirmado.";
    case "EXPIRED":
      return "Cobrança Pix expirada.";
    case "CANCELED":
      return "Cobrança Pix cancelada.";
    case "FAILED":
      return "Pagamento recusado pela Asaas.";
    case "REFUND_PENDING":
    case "PARTIALLY_REFUNDED":
      return "Estorno em processamento.";
    case "REFUNDED":
      return "Pagamento estornado.";
    case "PAID":
      return "Pagamento Pix recebido.";
    case "UNKNOWN":
      return "Status de pagamento desconhecido.";
  }
}

function leaseWhere(claim: Claim): unknown {
  return {
    id: claim.eventRowId,
    processingStatus: WebhookProcessingStatus.PROCESSING,
    processingStartedAt: claim.startedAt,
  };
}

function result(
  outcome: WebhookProcessingOutcome,
  externalEventId: string | null,
  reason: string
): ProcessAsaasWebhookResult {
  return {
    outcome,
    httpStatus: outcome === "retry" ? 503 : 200,
    externalEventId,
    reason,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof PaymentProviderError) return error.retryable;
  if (error instanceof PaymentValidationError) return false;
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "P2002") return false;
  }
  return true;
}

function safeErrorReason(error: unknown): string {
  if (error instanceof PaymentProviderError) {
    return `provider_${error.operation}_${error.statusCode ?? "network"}`;
  }
  if (error instanceof PaymentValidationError) {
    return compactReason(error.message);
  }
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return `database_${(error as { code: string }).code}`;
  }
  return error instanceof ConcurrentPaymentMutationError
    ? "concurrent_payment_mutation"
    : "unexpected_processing_error";
}

function compactReason(reason: string): string {
  return reason.replace(/\s+/g, " ").trim().slice(0, 500);
}

function toCents(value: unknown): number {
  return Math.round(Number(value) * 100);
}

function defaultDatabase(): WebhookProcessorDatabase {
  return prisma as unknown as WebhookProcessorDatabase;
}
