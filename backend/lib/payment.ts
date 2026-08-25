import { PaymentMethod } from "@prisma/client";

export interface PaymentRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
  customer: { id: string; name: string; email: string; cpf?: string | null; phone?: string | null };
}

export interface PaymentResult {
  success: boolean;
  gatewayProvider: "ASAAS";
  gatewayId?: string;
  pixCode?: string;
  pixExpiration?: Date;
  checkoutUrl?: string;
  error?: string;
}

type AsaasEnvironment = "production" | "sandbox";

export class PaymentUnavailableError extends Error {
  constructor(message = "Pagamento temporariamente indisponível") {
    super(message);
    this.name = "PaymentUnavailableError";
  }
}

function enabled(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

function paymentConfig() {
  const provider = process.env.PAYMENT_DEFAULT_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.ASAAS_API_KEY?.trim();
  const environment = process.env.ASAAS_ENVIRONMENT?.trim().toLowerCase() as AsaasEnvironment | undefined;
  if (provider !== "asaas" || !apiKey || !environment || !["production", "sandbox"].includes(environment)) {
    throw new PaymentUnavailableError();
  }
  return {
    apiKey,
    baseUrl: environment === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3",
  };
}

export function assertPaymentMethodAvailable(method: PaymentMethod) {
  paymentConfig();
  if (method === PaymentMethod.PIX && !enabled("ASAAS_PIX_ENABLED")) throw new PaymentUnavailableError();
  if (method === PaymentMethod.CARTAO_CREDITO && !enabled("ASAAS_CREDIT_CARD_ENABLED")) throw new PaymentUnavailableError();
  if (method === PaymentMethod.BOLETO && !enabled("ASAAS_BOLETO_ENABLED")) throw new PaymentUnavailableError();
}

export async function asaasRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = paymentConfig();
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      access_token: config.apiKey,
      "User-Agent": "KA-Bijoux/1.0 (adm@kabijoux.com.br)",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new PaymentUnavailableError();
  return response.json() as Promise<T>;
}

function digits(value?: string | null) {
  return value?.replace(/\D/g, "") || undefined;
}

async function findOrCreateAsaasCustomer(customer: PaymentRequest["customer"]): Promise<string> {
  const query = new URLSearchParams({ externalReference: customer.id, limit: "1" });
  const existing = await asaasRequest<{ data?: Array<{ id?: string }> }>(`/customers?${query.toString()}`);
  const existingId = existing.data?.[0]?.id;
  if (existingId) return existingId;
  const created = await asaasRequest<{ id?: string }>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: customer.name,
      email: customer.email,
      cpfCnpj: digits(customer.cpf),
      mobilePhone: digits(customer.phone),
      externalReference: customer.id,
      notificationDisabled: true,
    }),
  });
  if (!created.id) throw new PaymentUnavailableError();
  return created.id;
}

function dueDate(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function billingType(method: PaymentMethod): "PIX" | "CREDIT_CARD" | "BOLETO" {
  if (method === PaymentMethod.PIX) return "PIX";
  if (method === PaymentMethod.CARTAO_CREDITO) return "CREDIT_CARD";
  return "BOLETO";
}

interface AsaasPayment { id: string; invoiceUrl?: string; status?: string }

async function findExistingCharge(orderNumber: string) {
  const query = new URLSearchParams({ externalReference: orderNumber, limit: "1" });
  const existing = await asaasRequest<{ data?: AsaasPayment[] }>(`/payments?${query.toString()}`);
  return existing.data?.[0] ?? null;
}

async function createCharge(request: PaymentRequest, customerId: string): Promise<AsaasPayment> {
  const existing = await findExistingCharge(request.orderNumber);
  if (existing?.id) return existing;
  const configuredDays = Number(process.env.PAYMENT_PIX_DUE_DAYS ?? 1);
  let payment: AsaasPayment;
  try {
    payment = await asaasRequest<AsaasPayment>("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: billingType(request.method),
        value: Number(request.amount.toFixed(2)),
        dueDate: dueDate(Number.isFinite(configuredDays) && configuredDays >= 0 ? configuredDays : 1),
        description: `Pedido KA Bijoux #${request.orderNumber}`,
        externalReference: request.orderNumber,
        callback: { successUrl: "https://kabijoux.com.br/app?payment=success", autoRedirect: true },
      }),
    });
  } catch {
    // Se a resposta se perdeu depois da criação, recupere pela referência antes de permitir nova tentativa.
    const recovered = await findExistingCharge(request.orderNumber);
    if (!recovered?.id) throw new PaymentUnavailableError();
    payment = recovered;
  }
  if (!payment.id) throw new PaymentUnavailableError();
  return payment;
}

export async function processPayment(request: PaymentRequest): Promise<PaymentResult> {
  assertPaymentMethodAvailable(request.method);
  try {
    const customerId = await findOrCreateAsaasCustomer(request.customer);
    const payment = await createCharge(request, customerId);
    if (request.method === PaymentMethod.PIX) {
      const qr = await asaasRequest<{ payload?: string; expirationDate?: string }>(`/payments/${encodeURIComponent(payment.id)}/pixQrCode`);
      if (!qr.payload) throw new PaymentUnavailableError();
      return {
        success: true,
        gatewayProvider: "ASAAS",
        gatewayId: payment.id,
        pixCode: qr.payload,
        pixExpiration: qr.expirationDate ? new Date(qr.expirationDate) : undefined,
        checkoutUrl: payment.invoiceUrl,
      };
    }
    if (!payment.invoiceUrl) throw new PaymentUnavailableError();
    return { success: true, gatewayProvider: "ASAAS", gatewayId: payment.id, checkoutUrl: payment.invoiceUrl };
  } catch (error) {
    if (error instanceof PaymentUnavailableError) throw error;
    throw new PaymentUnavailableError();
  }
}

export async function refundAsaasPayment(paymentId: string) {
  return asaasRequest<{ id: string; status: string }>(`/payments/${encodeURIComponent(paymentId)}/refund`, { method: "POST" });
}
