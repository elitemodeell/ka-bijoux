import { createHash } from "node:crypto";
import {
  PaymentValidationError,
  type CancelPaymentResult,
  type CreateBoletoPaymentRequest,
  type CreateBoletoPaymentResult,
  type CreateCreditCardCheckoutRequest,
  type CreateCreditCardCheckoutResult,
  type CreatePixPaymentRequest,
  type CreatePixPaymentResult,
  type NormalizedPaymentStatus,
  type PaymentCustomerInput,
  type PaymentProvider,
  type PaymentWebhookEvent,
  type ProviderAccountIdentity,
  type ProviderCustomer,
  type ProviderPayment,
  type RefundPaymentRequest,
  type RefundPaymentResult,
} from "./types";

const payments = new Map<string, ProviderPayment>();
const syntheticId = (prefix: string, value: string) =>
  `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 20)}`;
const scenario = (value: string) => value.toLowerCase().includes("declined") ? "FAILED" as const : "PAID" as const;

export class MockPaymentProvider implements PaymentProvider {
  readonly id = "ASAAS" as const;
  readonly supportedMethods = ["PIX", "CREDIT_CARD", "BOLETO"] as const;

  async assertAccountIdentity(): Promise<ProviderAccountIdentity> {
    return { provider: "ASAAS", environment: "sandbox", accountId: "mock-account", legalName: "KA Bijoux Homologacao", cpfCnpj: "00000000000000" };
  }

  async findOrCreateCustomer(customer: PaymentCustomerInput): Promise<ProviderCustomer> {
    return { provider: "ASAAS", externalCustomerId: syntheticId("mock_cus", customer.internalId), externalReference: customer.internalId, cpfCnpj: customer.cpfCnpj, created: true };
  }

  async createPixPayment(request: CreatePixPaymentRequest): Promise<CreatePixPaymentResult> {
    const externalPaymentId = syntheticId("mock_pay", request.orderId);
    const status = scenario(request.orderId);
    const result: CreatePixPaymentResult = {
      provider: "ASAAS", externalPaymentId, externalCustomerId: syntheticId("mock_cus", request.customer.internalId),
      externalReference: request.orderId, method: "PIX", status, rawStatus: `MOCK_${status}`,
      amount: request.amount, dueDate: new Date(request.dueDate).toISOString().slice(0, 10), invoiceUrl: null,
      pix: { copyAndPaste: `MOCK-PIX-${externalPaymentId}`, qrCodeBase64: "", expirationAt: new Date(Date.now() + 15 * 60_000).toISOString() },
      customerCreated: true, reusedExistingPayment: false,
    };
    payments.set(externalPaymentId, result);
    return result;
  }

  async createCreditCardCheckout(request: CreateCreditCardCheckoutRequest): Promise<CreateCreditCardCheckoutResult> {
    const id = syntheticId("mock_checkout", request.orderId);
    return { provider: "ASAAS", method: "CREDIT_CARD", externalCheckoutId: id, externalPaymentId: id,
      externalCustomerId: syntheticId("mock_cus", request.customer.internalId), externalReference: request.orderId,
      checkoutUrl: `https://mock.invalid/checkout/${id}`, status: "PENDING", rawStatus: `MOCK_${scenario(request.orderId)}`,
      amount: request.amount, installmentCount: request.installmentCount,
      installmentValue: Number((request.amount / request.installmentCount).toFixed(2)),
      expiresAt: new Date(Date.now() + request.minutesToExpire * 60_000).toISOString(), reusedExistingCheckout: false };
  }

  async createBoletoPayment(request: CreateBoletoPaymentRequest): Promise<CreateBoletoPaymentResult> {
    const externalPaymentId = syntheticId("mock_boleto", request.orderId);
    const status = scenario(request.orderId);
    const result: CreateBoletoPaymentResult = { provider: "ASAAS", externalPaymentId,
      externalCustomerId: syntheticId("mock_cus", request.customer.internalId), externalReference: request.orderId,
      method: "BOLETO", status, rawStatus: `MOCK_${status}`, amount: request.amount,
      dueDate: new Date(request.dueDate).toISOString().slice(0, 10), invoiceUrl: null,
      bankSlip: { bankSlipUrl: `https://mock.invalid/boleto/${externalPaymentId}`, identificationField: `MOCK-${externalPaymentId}`, dueDate: new Date(request.dueDate).toISOString().slice(0, 10) },
      customerCreated: true, reusedExistingPayment: false };
    payments.set(externalPaymentId, result);
    return result;
  }

  async getPayment(externalPaymentId: string): Promise<ProviderPayment> {
    const payment = payments.get(externalPaymentId);
    if (!payment) throw new PaymentValidationError("Pagamento sintetico inexistente.");
    return payment;
  }
  async cancelPayment(externalPaymentId: string): Promise<CancelPaymentResult> {
    return { provider: "ASAAS", externalPaymentId, status: "CANCELED", deleted: true, alreadyCanceled: false };
  }
  async refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResult> {
    return { provider: "ASAAS", externalPaymentId: request.externalPaymentId, status: "REFUNDED", rawStatus: "MOCK_REFUNDED", amount: request.amount ?? 0 };
  }
  interpretWebhook(payload: unknown): PaymentWebhookEvent {
    const body = payload as { simulateFailure?: boolean; id?: string; payment?: { id?: string; status?: string } };
    if (body?.simulateFailure) throw new PaymentValidationError("Falha sintetica de webhook.");
    if (!body?.id || !body.payment?.id) throw new PaymentValidationError("Webhook sintetico invalido.");
    return { provider: "ASAAS", externalEventId: body.id, eventType: "MOCK_PAYMENT", externalPaymentId: body.payment.id,
      occurredAt: new Date(0).toISOString(), status: this.mapStatus(body.payment.status ?? ""), rawPaymentStatus: body.payment.status ?? null };
  }
  mapStatus(rawStatus: string): NormalizedPaymentStatus {
    if (["PAID", "RECEIVED", "CONFIRMED"].includes(rawStatus)) return "PAID";
    if (["FAILED", "DECLINED"].includes(rawStatus)) return "FAILED";
    return "PENDING";
  }
}
