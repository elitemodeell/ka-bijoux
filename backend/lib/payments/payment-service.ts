import { AsaasPaymentProvider } from "./asaas-provider";
import { AsaasPaymentConfig, loadPaymentConfig, PaymentEnvironmentVariables } from "./config";
import {
  CancelPaymentResult,
  CreateBoletoPaymentRequest,
  CreateBoletoPaymentResult,
  CreateCreditCardCheckoutRequest,
  CreateCreditCardCheckoutResult,
  CreatePixPaymentRequest,
  CreatePixPaymentResult,
  PaymentCustomerInput,
  PaymentFetch,
  PaymentProvider,
  ProviderAccountIdentity,
  PaymentValidationError,
  PaymentVerificationRequest,
  PaymentVerificationResult,
  PaymentWebhookEvent,
  ProviderCustomer,
  ProviderPayment,
  ProviderPaymentMethod,
  RefundPaymentRequest,
  RefundPaymentResult,
} from "./types";
import { PaymentProviderFactory } from "./provider-factory";

export class PaymentService {
  readonly provider: PaymentProvider;

  constructor(provider: PaymentProvider) {
    this.provider = provider;
  }

  assertAccountIdentity(): Promise<ProviderAccountIdentity> {
    return this.provider.assertAccountIdentity();
  }

  findOrCreateCustomer(
    customer: PaymentCustomerInput
  ): Promise<ProviderCustomer> {
    return this.provider.findOrCreateCustomer(customer);
  }
  createPixPayment(
    request: CreatePixPaymentRequest
  ): Promise<CreatePixPaymentResult> {
    return this.provider.createPixPayment(request);
  }

  createCreditCardCheckout(
    request: CreateCreditCardCheckoutRequest
  ): Promise<CreateCreditCardCheckoutResult> {
    if (!this.provider.createCreditCardCheckout) {
      throw new PaymentValidationError(
        "Provedor não implementa checkout de cartão."
      );
    }
    return this.provider.createCreditCardCheckout(request);
  }

  createBoletoPayment(
    request: CreateBoletoPaymentRequest
  ): Promise<CreateBoletoPaymentResult> {
    if (!this.provider.createBoletoPayment) {
      throw new PaymentValidationError("Provedor não implementa boleto.");
    }
    return this.provider.createBoletoPayment(request);
  }

  getPayment(externalPaymentId: string): Promise<ProviderPayment> {
    return this.provider.getPayment(externalPaymentId);
  }

  verifyStatus(externalPaymentId: string): Promise<ProviderPayment> {
    return this.getPayment(externalPaymentId);
  }

  async verifyPayment(
    expected: PaymentVerificationRequest
  ): Promise<PaymentVerificationResult> {
    const payment = await this.provider.getPayment(expected.externalPaymentId);
    const mismatches: string[] = [];

    if (payment.externalPaymentId !== expected.externalPaymentId) {
      mismatches.push("identificador externo");
    }
    if (payment.externalReference !== expected.orderId) {
      mismatches.push("referência do pedido");
    }
    if (expected.method && payment.method !== expected.method) {
      mismatches.push("modalidade de pagamento");
    }
    if (toCents(payment.amount) !== toCents(expected.amount)) {
      mismatches.push("valor");
    }
    if (
      expected.externalCustomerId &&
      payment.externalCustomerId !== expected.externalCustomerId
    ) {
      mismatches.push("cliente externo");
    }

    if (mismatches.length > 0) {
      throw new PaymentValidationError(
        `Cobrança Asaas divergente: ${mismatches.join(", ")}.`
      );
    }

    return { payment, isPaid: payment.status === "PAID" };
  }

  async cancelPayment(
    externalPaymentId: string
  ): Promise<CancelPaymentResult> {
    const payment = await this.provider.getPayment(externalPaymentId);
    if (payment.status === "CANCELED") {
      return {
        provider: "ASAAS",
        externalPaymentId,
        status: "CANCELED",
        deleted: true,
        alreadyCanceled: true,
      };
    }
    if (
      payment.status === "PAID" ||
      payment.status === "REFUND_PENDING" ||
      payment.status === "PARTIALLY_REFUNDED" ||
      payment.status === "REFUNDED"
    ) {
      throw new PaymentValidationError(
        "Cobrança paga não pode ser cancelada; utilize estorno."
      );
    }
    return this.provider.cancelPayment(externalPaymentId);
  }

  async refundPayment(
    request: RefundPaymentRequest
  ): Promise<RefundPaymentResult> {
    const payment = await this.provider.getPayment(request.externalPaymentId);
    if (payment.status === "REFUNDED") {
      return {
        provider: "ASAAS",
        externalPaymentId: payment.externalPaymentId,
        status: payment.status,
        rawStatus: payment.rawStatus,
        amount: payment.amount,
      };
    }
    if (
      payment.status !== "PAID" &&
      payment.status !== "PARTIALLY_REFUNDED"
    ) {
      throw new PaymentValidationError(
        "Somente cobranças recebidas podem ser estornadas."
      );
    }
    if (
      request.amount !== undefined &&
      toCents(request.amount) > toCents(payment.amount)
    ) {
      throw new PaymentValidationError(
        "O estorno não pode exceder o valor da cobrança."
      );
    }
    return this.provider.refundPayment({
      ...request,
      method: payment.method,
    });
  }

  interpretWebhook(payload: unknown): PaymentWebhookEvent {
    return this.provider.interpretWebhook(payload);
  }
}

export interface CreatePaymentServiceOptions {
  provider?: PaymentProvider;
  config?: AsaasPaymentConfig;
  env?: PaymentEnvironmentVariables;
  fetch?: PaymentFetch;
  now?: () => Date;
}

export function createPaymentService(
  options: CreatePaymentServiceOptions = {}
): PaymentService {
  if (options.provider) return new PaymentService(options.provider);

  const config = options.config ?? loadPaymentConfig(options.env);
  return new PaymentService(
    new AsaasPaymentProvider({
      config,
      fetch: options.fetch,
      now: options.now,
    })
  );
}

export const getPaymentService = createPaymentService;

export function getPaymentServiceForMethod(
  method: ProviderPaymentMethod,
  options: Omit<CreatePaymentServiceOptions, "provider" | "config"> = {}
): PaymentService {
  const factory = new PaymentProviderFactory(options);
  return new PaymentService(factory.resolveForMethod(method));
}

export function getPaymentServiceForProvider(
  providerId: "ASAAS" | "MERCADO_PAGO",
  options: Omit<CreatePaymentServiceOptions, "provider" | "config"> = {}
): PaymentService {
  const factory = new PaymentProviderFactory(options);
  return new PaymentService(factory.resolveById(providerId));
}

function toCents(value: number): number {
  return Math.round(Number(value) * 100);
}
