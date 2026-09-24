import {
  NormalizedPaymentStatus,
  PaymentStateTransitionError,
} from "./types";

const ASAAS_STATUS_MAP: Readonly<Record<string, NormalizedPaymentStatus>> = {
  PENDING: "PENDING",
  AWAITING_RISK_ANALYSIS: "UNDER_REVIEW",
  CONFIRMED: "PAID",
  RECEIVED: "PAID",
  RECEIVED_IN_CASH: "UNDER_REVIEW",
  OVERDUE: "EXPIRED",
  DELETED: "CANCELED",
  REFUND_REQUESTED: "REFUND_PENDING",
  REFUND_IN_PROGRESS: "REFUND_PENDING",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  REFUNDED: "REFUNDED",
  CREDIT_CARD_CAPTURE_REFUSED: "FAILED",
};

const ASAAS_EVENT_MAP: Readonly<Record<string, NormalizedPaymentStatus>> = {
  PAYMENT_CREATED: "PENDING",
  PAYMENT_AWAITING_RISK_ANALYSIS: "UNDER_REVIEW",
  PAYMENT_APPROVED_BY_RISK_ANALYSIS: "UNDER_REVIEW",
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: "FAILED",
  PAYMENT_AUTHORIZED: "UNDER_REVIEW",
  PAYMENT_CONFIRMED: "PAID",
  PAYMENT_RECEIVED: "PAID",
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: "FAILED",
  PAYMENT_OVERDUE: "EXPIRED",
  PAYMENT_DELETED: "CANCELED",
  PAYMENT_RESTORED: "PENDING",
  PAYMENT_REFUND_IN_PROGRESS: "REFUND_PENDING",
  PAYMENT_PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  PAYMENT_REFUNDED: "REFUNDED",
};

const ALLOWED_TRANSITIONS: Readonly<
  Record<NormalizedPaymentStatus, ReadonlySet<NormalizedPaymentStatus>>
> = {
  UNKNOWN: new Set<NormalizedPaymentStatus>([
    "PENDING",
    "UNDER_REVIEW",
    "PAID",
    "EXPIRED",
    "CANCELED",
    "REFUND_PENDING",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
    "FAILED",
  ]),
  PENDING: new Set<NormalizedPaymentStatus>([
    "UNDER_REVIEW",
    "PAID",
    "EXPIRED",
    "CANCELED",
    "FAILED",
  ]),
  UNDER_REVIEW: new Set<NormalizedPaymentStatus>(["PAID", "CANCELED", "REFUNDED", "FAILED"]),
  // A documentação Asaas admite Pix recebido após ficar vencido.
  EXPIRED: new Set<NormalizedPaymentStatus>(["PAID", "CANCELED"]),
  PAID: new Set<NormalizedPaymentStatus>(["REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED"]),
  REFUND_PENDING: new Set<NormalizedPaymentStatus>(["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]),
  PARTIALLY_REFUNDED: new Set<NormalizedPaymentStatus>(["REFUND_PENDING", "REFUNDED"]),
  CANCELED: new Set<NormalizedPaymentStatus>(["PENDING", "PAID"]),
  REFUNDED: new Set<NormalizedPaymentStatus>(),
  FAILED: new Set<NormalizedPaymentStatus>(),
};

export function mapAsaasPaymentStatus(
  rawStatus: string | null | undefined
): NormalizedPaymentStatus {
  if (!rawStatus) return "UNKNOWN";
  return ASAAS_STATUS_MAP[rawStatus.trim().toUpperCase()] ?? "UNKNOWN";
}

export function mapAsaasEventStatus(
  eventType: string | null | undefined,
  rawPaymentStatus?: string | null
): NormalizedPaymentStatus {
  if (!eventType) return mapAsaasPaymentStatus(rawPaymentStatus);
  const eventStatus = ASAAS_EVENT_MAP[eventType.trim().toUpperCase()];
  return eventStatus ?? mapAsaasPaymentStatus(rawPaymentStatus);
}

export function canTransitionPaymentStatus(
  currentStatus: NormalizedPaymentStatus,
  attemptedStatus: NormalizedPaymentStatus
): boolean {
  if (currentStatus === attemptedStatus) return true;
  if (attemptedStatus === "UNKNOWN") return false;
  if (
    attemptedStatus === "REFUND_PENDING" ||
    attemptedStatus === "PARTIALLY_REFUNDED" ||
    attemptedStatus === "REFUNDED"
  ) {
    return currentStatus !== "REFUNDED";
  }

  return ALLOWED_TRANSITIONS[currentStatus].has(attemptedStatus);
}

export function assertPaymentStatusTransition(
  currentStatus: NormalizedPaymentStatus,
  attemptedStatus: NormalizedPaymentStatus
): void {
  if (!canTransitionPaymentStatus(currentStatus, attemptedStatus)) {
    throw new PaymentStateTransitionError(currentStatus, attemptedStatus);
  }
}

export interface PaymentTransitionResolution {
  allowed: boolean;
  changed: boolean;
  currentStatus: NormalizedPaymentStatus;
  attemptedStatus: NormalizedPaymentStatus;
  nextStatus: NormalizedPaymentStatus;
}

export function resolvePaymentStatusTransition(
  currentStatus: NormalizedPaymentStatus,
  attemptedStatus: NormalizedPaymentStatus
): PaymentTransitionResolution {
  const allowed = canTransitionPaymentStatus(currentStatus, attemptedStatus);
  return {
    allowed,
    changed: allowed && currentStatus !== attemptedStatus,
    currentStatus,
    attemptedStatus,
    nextStatus: allowed ? attemptedStatus : currentStatus,
  };
}
