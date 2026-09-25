export const PAYMENT_PROVIDER_IDS = ["ASAAS", "MERCADO_PAGO"] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number];
export type ActivePaymentProviderId = "ASAAS";

export const PAYMENT_METHODS = ["PIX", "CREDIT_CARD", "BOLETO"] as const;
export type ProviderPaymentMethod = (typeof PAYMENT_METHODS)[number];

export const INTERNAL_PAYMENT_STATUSES = [
  "CREATED",
  "PENDING",
  "UNDER_REVIEW",
  "CONFIRMED",
  "RECEIVED",
  "OVERDUE",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "FAILED",
] as const;
export type InternalPaymentStatus = (typeof INTERNAL_PAYMENT_STATUSES)[number];

export const NORMALIZED_PAYMENT_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "PAID",
  "EXPIRED",
  "CANCELED",
  "REFUND_PENDING",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "FAILED",
  "UNKNOWN",
] as const;
export type NormalizedPaymentStatus = (typeof NORMALIZED_PAYMENT_STATUSES)[number];

export type PaymentFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export interface PaymentCustomerInput {
  internalId: string;
  persistedExternalCustomerId?: string | null;
  name: string;
  cpfCnpj: string;
  email?: string | null;
  phone?: string | null;
}

export interface ProviderCustomer {
  provider: ActivePaymentProviderId;
  externalCustomerId: string;
  externalReference: string;
  cpfCnpj: string;
  created: boolean;
}

export interface ProviderAccountIdentity {
  provider: ActivePaymentProviderId;
  environment: "sandbox" | "production";
  accountId: string;
  legalName: string;
  cpfCnpj: string;
}

export interface CreatePixPaymentRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  dueDate: Date | string;
  description?: string;
  customer: PaymentCustomerInput;
}

export interface CheckoutItemInput {
  externalReference: string;
  name: string;
  description?: string;
  quantity: number;
  value: number;
}

export interface CreateCreditCardCheckoutRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  installmentCount: number;
  maxInstallmentCount: number;
  minutesToExpire: number;
  callback: {
    successUrl: string;
    cancelUrl: string;
    expiredUrl: string;
  };
  items: CheckoutItemInput[];
  customer: PaymentCustomerInput;
}

export interface CreateBoletoPaymentRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  dueDate: Date | string;
  description?: string;
  customer: PaymentCustomerInput;
}

export interface PixPaymentData {
  copyAndPaste: string;
  qrCodeBase64: string;
  expirationAt: string;
}

export interface ProviderPayment {
  provider: ActivePaymentProviderId;
  externalPaymentId: string;
  externalCustomerId: string;
  externalReference: string | null;
  method: ProviderPaymentMethod;
  status: NormalizedPaymentStatus;
  rawStatus: string;
  amount: number;
  dueDate: string | null;
  invoiceUrl: string | null;
  pix?: PixPaymentData;
  bankSlip?: {
    bankSlipUrl: string;
    identificationField: string | null;
    dueDate: string;
  };
}

export interface CreatePixPaymentResult extends ProviderPayment {
  method: "PIX";
  externalReference: string;
  pix: PixPaymentData;
  customerCreated: boolean;
  reusedExistingPayment: boolean;
}

export interface CreateCreditCardCheckoutResult {
  provider: ActivePaymentProviderId;
  method: "CREDIT_CARD";
  externalCheckoutId: string | null;
  externalPaymentId: string | null;
  externalCustomerId: string | null;
  externalReference: string;
  checkoutUrl: string;
  status: "PENDING";
  rawStatus: string;
  amount: number;
  installmentCount: number;
  installmentValue: number;
  expiresAt: string;
  reusedExistingCheckout: boolean;
}

export interface CreateBoletoPaymentResult extends ProviderPayment {
  method: "BOLETO";
  externalReference: string;
  bankSlip: {
    bankSlipUrl: string;
    identificationField: string | null;
    dueDate: string;
  };
  customerCreated: boolean;
  reusedExistingPayment: boolean;
}

export interface CancelPaymentResult {
  provider: ActivePaymentProviderId;
  externalPaymentId: string;
  status: "CANCELED";
  deleted: boolean;
  alreadyCanceled: boolean;
}

export interface RefundPaymentRequest {
  externalPaymentId: string;
  amount?: number;
  description?: string;
  method?: ProviderPaymentMethod;
}

export interface RefundPaymentResult {
  provider: ActivePaymentProviderId;
  externalPaymentId: string;
  status: NormalizedPaymentStatus;
  rawStatus: string;
  amount: number;
}

export interface PaymentVerificationRequest {
  externalPaymentId: string;
  orderId: string;
  amount: number;
  externalCustomerId?: string | null;
  method?: ProviderPaymentMethod;
}

export interface PaymentVerificationResult {
  payment: ProviderPayment;
  isPaid: boolean;
}

export interface PaymentWebhookEvent {
  provider: ActivePaymentProviderId;
  externalEventId: string;
  eventType: string;
  externalPaymentId: string;
  occurredAt: string | null;
  status: NormalizedPaymentStatus;
  rawPaymentStatus: string | null;
}

export interface PaymentProvider {
  readonly id: ActivePaymentProviderId;
  readonly supportedMethods: readonly ProviderPaymentMethod[];

  assertAccountIdentity(): Promise<ProviderAccountIdentity>;

  findOrCreateCustomer(customer: PaymentCustomerInput): Promise<ProviderCustomer>;
  createPixPayment(request: CreatePixPaymentRequest): Promise<CreatePixPaymentResult>;
  createCreditCardCheckout?(
    request: CreateCreditCardCheckoutRequest
  ): Promise<CreateCreditCardCheckoutResult>;
  createBoletoPayment?(
    request: CreateBoletoPaymentRequest
  ): Promise<CreateBoletoPaymentResult>;
  getPayment(externalPaymentId: string): Promise<ProviderPayment>;
  cancelPayment(externalPaymentId: string): Promise<CancelPaymentResult>;
  refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResult>;
  interpretWebhook(payload: unknown): PaymentWebhookEvent;
  mapStatus(rawStatus: string): NormalizedPaymentStatus;
}

export type PaymentProviderOperation =
  | "verify_account_identity"
  | "find_customer"
  | "get_customer"
  | "create_customer"
  | "update_customer"
  | "find_payment"
  | "create_payment"
  | "find_checkout"
  | "create_checkout"
  | "get_checkout"
  | "get_pix_qr_code"
  | "get_boleto_identification_field"
  | "get_payment"
  | "cancel_payment"
  | "refund_payment";

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export class PaymentConfigurationError extends PaymentError {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConfigurationError";
  }
}

export class PaymentValidationError extends PaymentError {
  constructor(message: string) {
    super(message);
    this.name = "PaymentValidationError";
  }
}

export class PaymentStateTransitionError extends PaymentError {
  readonly currentStatus: NormalizedPaymentStatus;
  readonly attemptedStatus: NormalizedPaymentStatus;

  constructor(
    currentStatus: NormalizedPaymentStatus,
    attemptedStatus: NormalizedPaymentStatus
  ) {
    super(`Transição de pagamento inválida: ${currentStatus} -> ${attemptedStatus}.`);
    this.name = "PaymentStateTransitionError";
    this.currentStatus = currentStatus;
    this.attemptedStatus = attemptedStatus;
  }
}

export class PaymentProviderError extends PaymentError {
  readonly provider: ActivePaymentProviderId;
  readonly operation: PaymentProviderOperation;
  readonly statusCode?: number;
  readonly providerCode?: string;
  readonly endpoint?: string;
  readonly externalResourceId?: string;
  readonly correlationId?: string;
  readonly retryable: boolean;

  constructor(options: {
    message: string;
    operation: PaymentProviderOperation;
    statusCode?: number;
    providerCode?: string;
    endpoint?: string;
    externalResourceId?: string;
    correlationId?: string;
    retryable?: boolean;
  }) {
    super(options.message);
    this.name = "PaymentProviderError";
    this.provider = "ASAAS";
    this.operation = options.operation;
    this.statusCode = options.statusCode;
    this.providerCode = options.providerCode;
    this.endpoint = options.endpoint;
    this.externalResourceId = options.externalResourceId;
    this.correlationId = options.correlationId;
    this.retryable = options.retryable ?? false;
  }
}
