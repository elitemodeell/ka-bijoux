import { randomUUID } from "node:crypto";
import { AsaasPaymentConfig } from "./config";
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
  PaymentProviderError,
  PaymentProviderOperation,
  ProviderAccountIdentity,
  PaymentValidationError,
  PaymentWebhookEvent,
  PixPaymentData,
  ProviderCustomer,
  ProviderPayment,
  ProviderPaymentMethod,
  RefundPaymentRequest,
  RefundPaymentResult,
} from "./types";
import {
  mapAsaasEventStatus,
  mapAsaasPaymentStatus,
} from "./state-machine";

type UnknownRecord = Record<string, unknown>;

export const ASAAS_REQUEST_TIMEOUT_MS = 15_000;

interface AsaasCustomerPayload {
  id: string;
  name?: string;
  cpfCnpj?: string;
  externalReference?: string | null;
  deleted?: boolean;
}

interface AsaasPaymentPayload {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  status: string;
  dueDate?: string | null;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  externalReference?: string | null;
  deleted?: boolean;
  installment?: string | null;
  installmentCount?: number | null;
  installmentNumber?: number | null;
  totalValue?: number | null;
}

interface AsaasCheckoutPayload {
  id: string;
  link: string;
  status: string;
  externalReference: string;
  minutesToExpire: number;
}

interface AsaasIdentificationFieldPayload {
  identificationField?: string;
}

interface AsaasListResponse<T> {
  data?: T[];
}

interface AsaasPixQrCodePayload {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
}

interface AsaasCommercialInfoPayload {
  companyName?: string;
  cpfCnpj?: string;
}

interface AsaasWalletPayload {
  id?: string;
  walletId?: string;
}

export interface AsaasPaymentProviderOptions {
  config: AsaasPaymentConfig;
  fetch?: PaymentFetch;
  now?: () => Date;
}

export class AsaasPaymentProvider implements PaymentProvider {
  readonly id = "ASAAS" as const;
  readonly supportedMethods = ["PIX", "CREDIT_CARD", "BOLETO"] as const;

  private readonly config: AsaasPaymentConfig;
  private readonly fetchImpl: PaymentFetch;
  private readonly now: () => Date;
  private accountIdentityPromise?: Promise<ProviderAccountIdentity>;

  constructor(options: AsaasPaymentProviderOptions) {
    this.config = options.config;
    const runtimeFetch = globalThis.fetch;
    if (!options.fetch && typeof runtimeFetch !== "function") {
      throw new PaymentValidationError(
        "Fetch não está disponível; injete um cliente HTTP para a Asaas."
      );
    }
    this.fetchImpl =
      options.fetch ?? runtimeFetch.bind(globalThis);
    this.now = options.now ?? (() => new Date());
  }

  mapStatus(rawStatus: string) {
    return mapAsaasPaymentStatus(rawStatus);
  }

  async assertAccountIdentity(): Promise<ProviderAccountIdentity> {
    if (!this.accountIdentityPromise) {
      this.accountIdentityPromise = this.verifyAccountIdentity().catch((error) => {
        this.accountIdentityPromise = undefined;
        throw error;
      });
    }
    return this.accountIdentityPromise;
  }

  private async verifyAccountIdentity(): Promise<ProviderAccountIdentity> {
    const [commercialInfo, walletsPayload] = await Promise.all([
      this.request<AsaasCommercialInfoPayload>(
        "verify_account_identity",
        "/myAccount/commercialInfo/",
        { method: "GET" }
      ),
      this.request<AsaasWalletPayload[] | AsaasListResponse<AsaasWalletPayload>>(
        "verify_account_identity",
        "/wallets/",
        { method: "GET" }
      ),
    ]);
    const wallets = Array.isArray(walletsPayload)
      ? walletsPayload
      : walletsPayload.data ?? [];
    const actualName = normalizeLegalName(commercialInfo.companyName);
    const actualDocument = digits(commercialInfo.cpfCnpj ?? "");
    const expected = this.config.expectedAccount;
    const walletMatches = wallets.some(
      (wallet) => (wallet.id ?? wallet.walletId) === expected.walletId
    );

    if (
      actualName !== normalizeLegalName(expected.legalName) ||
      actualDocument !== expected.cpfCnpj ||
      !walletMatches
    ) {
      throw new PaymentProviderError({
        operation: "verify_account_identity",
        message: "A conta Asaas autenticada nÃ£o corresponde Ã  conta financeira autorizada da KA Bijoux.",
      });
    }

    return Object.freeze({
      provider: "ASAAS" as const,
      environment: this.config.environment,
      accountId: expected.walletId,
      legalName: expected.legalName,
      cpfCnpj: expected.cpfCnpj,
    });
  }

  async findOrCreateCustomer(
    customer: PaymentCustomerInput
  ): Promise<ProviderCustomer> {
    const input = normalizeCustomer(customer);
    await this.assertAccountIdentity();

    if (input.persistedExternalCustomerId) {
      const persisted = await this.request<AsaasCustomerPayload>(
        "get_customer",
        `/customers/${encodeURIComponent(input.persistedExternalCustomerId)}`,
        { method: "GET" }
      );
      assertCustomerIdentity(persisted, input);
      return toProviderCustomer(persisted, input, false);
    }

    // CPF/CNPJ is the stable fiscal identity in Asaas. Legacy customers may
    // predate externalReference; creating another record for the same document
    // makes the gateway reject the checkout.
    const query = new URLSearchParams({ cpfCnpj: input.cpfCnpj, limit: "100" });
    const listed = await this.request<AsaasListResponse<AsaasCustomerPayload>>(
      "find_customer",
      `/customers?${query.toString()}`,
      { method: "GET" }
    );
    const matches = (listed.data ?? []).filter(
      (candidate) =>
        !candidate.deleted && digits(candidate.cpfCnpj ?? "") === input.cpfCnpj
    );

    if (matches.length > 1) {
      throw new PaymentProviderError({
        operation: "find_customer",
        message:
          "Mais de um cliente Asaas corresponde à mesma referência e documento.",
      });
    }
    if (matches.length === 1) {
      const current = matches[0];
      if (current.externalReference !== input.internalId) {
        const adopted = await this.request<AsaasCustomerPayload>(
          "update_customer",
          `/customers/${encodeURIComponent(current.id)}`,
          {
            method: "PUT",
            body: JSON.stringify({
              externalReference: input.internalId,
              notificationDisabled: true,
            }),
          }
        );
        assertCustomerIdentity(adopted, input);
        return toProviderCustomer(adopted, input, false);
      }
      return toProviderCustomer(current, input, false);
    }

    const created = await this.request<AsaasCustomerPayload>(
      "create_customer",
      "/customers",
      {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          cpfCnpj: input.cpfCnpj,
          email: input.email || undefined,
          mobilePhone: input.phone || undefined,
          externalReference: input.internalId,
          notificationDisabled: true,
        }),
      }
    );
    assertCustomerIdentity(created, input);
    return toProviderCustomer(created, input, true);
  }

  async createPixPayment(
    request: CreatePixPaymentRequest
  ): Promise<CreatePixPaymentResult> {
    const orderId = requiredText(request.orderId, "orderId");
    const orderNumber = requiredText(request.orderNumber, "orderNumber");
    const amount = normalizeMoney(request.amount, "amount");
    const dueDate = normalizeDueDate(request.dueDate, this.now());
    const description = request.description?.trim() ||
      `Pedido KA Bijoux #${orderNumber}`;
    if (description.length > 500) {
      throw new PaymentValidationError(
        "A descrição da cobrança deve ter no máximo 500 caracteres."
      );
    }

    const customer = await this.findOrCreateCustomer(request.customer);
    const existing = await this.findPaymentByExternalReference(
      orderId,
      customer.externalCustomerId
    );

    let payment: AsaasPaymentPayload;
    let reusedExistingPayment = false;
    if (existing) {
      assertExistingPaymentMatches(existing, {
        orderId,
        amount,
        externalCustomerId: customer.externalCustomerId,
      });
      payment = existing;
      reusedExistingPayment = true;
    } else {
      payment = await this.request<AsaasPaymentPayload>(
        "create_payment",
        "/payments",
        {
          method: "POST",
          body: JSON.stringify({
            customer: customer.externalCustomerId,
            billingType: "PIX",
            value: amount,
            dueDate,
            description,
            externalReference: orderId,
          }),
        }
      );
      assertExistingPaymentMatches(payment, {
        orderId,
        amount,
        externalCustomerId: customer.externalCustomerId,
      });
    }

    const pix = await this.getPixQrCode(payment.id);
    const normalized = normalizePayment(payment);
    if (normalized.method !== "PIX" || normalized.externalReference !== orderId) {
      throw new PaymentProviderError({
        operation: "create_payment",
        message: "A cobrança retornada pela Asaas não corresponde ao Pix solicitado.",
      });
    }

    return {
      ...normalized,
      method: "PIX",
      externalReference: orderId,
      pix,
      customerCreated: customer.created,
      reusedExistingPayment,
    };
  }

  async createCreditCardCheckout(
    request: CreateCreditCardCheckoutRequest
  ): Promise<CreateCreditCardCheckoutResult> {
    const orderId = requiredText(request.orderId, "orderId");
    const amount = normalizeMoney(request.amount, "amount");
    const installmentCount = normalizeInstallmentCount(
      request.installmentCount,
      request.maxInstallmentCount
    );
    const minutesToExpire = normalizeInteger(
      request.minutesToExpire,
      "minutesToExpire",
      10,
      1440
    );
    // Mantemos a validação integral do contrato recebido do checkout, mas
    // usamos a Fatura hospedada oficial. Assim, nenhum dado do cartão passa
    // pelo aplicativo ou pelo backend da KA Bijoux.
    normalizeCallback(request.callback);
    normalizeCheckoutItems(request.items, amount);
    const customer = await this.findOrCreateCustomer(request.customer);
    const existing = await this.findCardPaymentByExternalReference(
      orderId,
      customer.externalCustomerId,
      amount,
      installmentCount
    );

    let payment = existing;
    const reusedExistingPayment = Boolean(existing);
    if (!payment) {
      const dueDate = new Date(
        this.now().getTime() + Math.max(minutesToExpire, 24 * 60) * 60_000
      ).toISOString().slice(0, 10);
      payment = await this.request<AsaasPaymentPayload>(
        "create_payment",
        "/payments",
        {
          method: "POST",
          body: JSON.stringify({
            customer: customer.externalCustomerId,
            billingType: "CREDIT_CARD",
            dueDate,
            description: `Pedido KA Bijoux #${requiredText(request.orderNumber, "orderNumber")}`,
            externalReference: orderId,
            ...(installmentCount > 1
              ? { installmentCount, totalValue: amount }
              : { value: amount }),
          }),
        }
      );
    }
    assertCardPaymentMatches(payment, {
      orderId,
      amount,
      externalCustomerId: customer.externalCustomerId,
      installmentCount,
    });
    const invoiceUrl = requiredHttpsUrl(payment.invoiceUrl, "invoiceUrl");
    const expiresAt = new Date(
      this.now().getTime() + minutesToExpire * 60_000
    ).toISOString();
    return {
      provider: "ASAAS",
      method: "CREDIT_CARD",
      externalCheckoutId: null,
      externalPaymentId: requiredText(payment.id, "id da cobrança"),
      externalCustomerId: customer.externalCustomerId,
      externalReference: orderId,
      checkoutUrl: invoiceUrl,
      status: "PENDING",
      rawStatus: requiredText(payment.status, "status da cobrança").toUpperCase(),
      amount,
      installmentCount,
      installmentValue: Math.floor(toCents(amount) / installmentCount) / 100,
      expiresAt,
      reusedExistingCheckout: reusedExistingPayment,
    };
  }

  async createBoletoPayment(
    request: CreateBoletoPaymentRequest
  ): Promise<CreateBoletoPaymentResult> {
    const orderId = requiredText(request.orderId, "orderId");
    const orderNumber = requiredText(request.orderNumber, "orderNumber");
    const amount = normalizeMoney(request.amount, "amount");
    const dueDate = normalizeDueDate(request.dueDate, this.now());
    const description =
      request.description?.trim() || `Pedido KA Bijoux #${orderNumber}`;
    const customer = await this.findOrCreateCustomer(request.customer);
    const existing = await this.findPaymentByExternalReference(
      orderId,
      customer.externalCustomerId,
      "BOLETO"
    );

    let payment: AsaasPaymentPayload;
    let reusedExistingPayment = false;
    if (existing) {
      assertExistingPaymentMatches(existing, {
        orderId,
        amount,
        externalCustomerId: customer.externalCustomerId,
        billingType: "BOLETO",
      });
      payment = existing;
      reusedExistingPayment = true;
    } else {
      payment = await this.request<AsaasPaymentPayload>(
        "create_payment",
        "/payments",
        {
          method: "POST",
          body: JSON.stringify({
            customer: customer.externalCustomerId,
            billingType: "BOLETO",
            value: amount,
            dueDate,
            description,
            externalReference: orderId,
            daysAfterDueDateToRegistrationCancellation: 0,
          }),
        }
      );
      assertExistingPaymentMatches(payment, {
        orderId,
        amount,
        externalCustomerId: customer.externalCustomerId,
        billingType: "BOLETO",
      });
    }

    const identification = await this.request<AsaasIdentificationFieldPayload>(
      "get_boleto_identification_field",
      `/payments/${encodeURIComponent(payment.id)}/identificationField`,
      { method: "GET" }
    );
    const normalized = normalizePayment(payment);
    const bankSlipUrl = requiredHttpsUrl(
      payment.bankSlipUrl ?? payment.invoiceUrl,
      "URL do boleto"
    );
    return {
      ...normalized,
      method: "BOLETO",
      externalReference: orderId,
      bankSlip: {
        bankSlipUrl,
        identificationField:
          typeof identification.identificationField === "string"
            ? identification.identificationField
            : null,
        dueDate,
      },
      customerCreated: customer.created,
      reusedExistingPayment,
    };
  }

  async getPayment(externalPaymentId: string): Promise<ProviderPayment> {
    await this.assertAccountIdentity();
    const id = requiredText(externalPaymentId, "externalPaymentId");
    const payment = await this.request<AsaasPaymentPayload>(
      "get_payment",
      `/payments/${encodeURIComponent(id)}`,
      { method: "GET" }
    );
    return normalizePayment(payment);
  }

  async cancelPayment(
    externalPaymentId: string
  ): Promise<CancelPaymentResult> {
    await this.assertAccountIdentity();
    const id = requiredText(externalPaymentId, "externalPaymentId");
    const result = await this.request<{ id?: string; deleted?: boolean }>(
      "cancel_payment",
      `/payments/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (result.deleted !== true || (result.id && result.id !== id)) {
      throw new PaymentProviderError({
        operation: "cancel_payment",
        message: "A Asaas não confirmou a exclusão da cobrança.",
      });
    }
    return {
      provider: "ASAAS",
      externalPaymentId: id,
      status: "CANCELED",
      deleted: true,
      alreadyCanceled: false,
    };
  }

  async refundPayment(
    request: RefundPaymentRequest
  ): Promise<RefundPaymentResult> {
    await this.assertAccountIdentity();
    const id = requiredText(request.externalPaymentId, "externalPaymentId");
    const body: { value?: number; description?: string } = {};
    if (request.amount !== undefined) {
      body.value = normalizeMoney(request.amount, "amount");
    }
    if (request.description !== undefined) {
      const description = requiredText(request.description, "description");
      if (description.length > 500) {
        throw new PaymentValidationError(
          "A descrição do estorno deve ter no máximo 500 caracteres."
        );
      }
      body.description = description;
    }

    if (request.method === "BOLETO") {
      await this.request<unknown>(
        "refund_payment",
        `/payments/${encodeURIComponent(id)}/bankSlip/refund`,
        { method: "POST", body: JSON.stringify({}) }
      );
    } else {
      await this.request<unknown>(
        "refund_payment",
        `/payments/${encodeURIComponent(id)}/refund`,
        { method: "POST", body: JSON.stringify(body) }
      );
    }
    const payment = await this.getPayment(id);
    return {
      provider: "ASAAS",
      externalPaymentId: id,
      status: payment.status,
      rawStatus: payment.rawStatus,
      amount: payment.amount,
    };
  }

  interpretWebhook(payload: unknown): PaymentWebhookEvent {
    const root = asRecord(payload, "Payload do webhook inválido.");
    const externalEventId = requiredText(root.id, "id do evento");
    const eventType = requiredText(root.event, "tipo do evento").toUpperCase();
    if (eventType.startsWith("CHECKOUT_")) {
      const checkout = asRecord(
        root.checkout,
        "Checkout ausente no webhook Asaas."
      );
      const externalCheckoutId = requiredText(
        checkout.id,
        "id do checkout"
      );
      const rawStatus =
        typeof checkout.status === "string"
          ? checkout.status.trim().toUpperCase()
          : eventType.replace("CHECKOUT_", "");
      return {
        provider: "ASAAS",
        externalEventId,
        eventType,
        externalPaymentId: externalCheckoutId,
        occurredAt:
          typeof root.dateCreated === "string" ? root.dateCreated : null,
        status:
          eventType === "CHECKOUT_PAID"
            ? "PAID"
            : eventType === "CHECKOUT_EXPIRED"
              ? "EXPIRED"
              : eventType === "CHECKOUT_CANCELED"
                ? "CANCELED"
                : "PENDING",
        rawPaymentStatus: rawStatus || null,
      };
    }
    const payment = asRecord(
      root.payment,
      "Pagamento ausente no webhook Asaas."
    );
    const externalPaymentId = requiredText(
      payment.id,
      "id do pagamento"
    );
    const rawPaymentStatus =
      typeof payment.status === "string" && payment.status.trim()
        ? payment.status.trim().toUpperCase()
        : null;
    const occurredAt =
      typeof root.dateCreated === "string" && root.dateCreated.trim()
        ? root.dateCreated
        : null;

    return {
      provider: "ASAAS",
      externalEventId,
      eventType,
      externalPaymentId,
      occurredAt,
      status: mapAsaasEventStatus(eventType, rawPaymentStatus),
      rawPaymentStatus,
    };
  }

  private async findPaymentByExternalReference(
    orderId: string,
    externalCustomerId: string,
    billingType: "PIX" | "BOLETO" = "PIX"
  ): Promise<AsaasPaymentPayload | null> {
    const query = new URLSearchParams({
      externalReference: orderId,
      customer: externalCustomerId,
      billingType,
      limit: "100",
    });
    const listed = await this.request<AsaasListResponse<AsaasPaymentPayload>>(
      "find_payment",
      `/payments?${query.toString()}`,
      { method: "GET" }
    );
    const matches = (listed.data ?? []).filter(
      (payment) =>
        !payment.deleted &&
        payment.externalReference === orderId &&
        payment.customer === externalCustomerId &&
        payment.billingType === billingType
    );
    if (matches.length > 1) {
      throw new PaymentProviderError({
        operation: "find_payment",
        message: "Mais de uma cobrança Asaas foi encontrada para o mesmo pedido.",
      });
    }
    return matches[0] ?? null;
  }

  private async findCardPaymentByExternalReference(
    orderId: string,
    externalCustomerId: string,
    amount: number,
    installmentCount: number
  ): Promise<AsaasPaymentPayload | null> {
    const query = new URLSearchParams({
      externalReference: orderId,
      customer: externalCustomerId,
      billingType: "CREDIT_CARD",
      limit: "100",
    });
    const listed = await this.request<AsaasListResponse<AsaasPaymentPayload>>(
      "find_payment",
      `/payments?${query.toString()}`,
      { method: "GET" }
    );
    const matches = (listed.data ?? []).filter(
      (payment) =>
        !payment.deleted &&
        payment.externalReference === orderId &&
        payment.customer === externalCustomerId &&
        payment.billingType === "CREDIT_CARD"
    );
    if (matches.length === 0) return null;

    // Um parcelamento pode retornar uma cobrança por parcela. Mais de um
    // agrupamento, porém, indicaria criação duplicada e deve falhar fechado.
    const groups = new Set(
      matches.map((payment) => payment.installment || payment.id)
    );
    if (groups.size > 1) {
      throw new PaymentProviderError({
        operation: "find_payment",
        message: "Mais de uma cobrança de cartão foi encontrada para o mesmo pedido.",
      });
    }
    const first = matches
      .slice()
      .sort(
        (left, right) =>
          Number(left.installmentNumber ?? 1) - Number(right.installmentNumber ?? 1)
      )[0];
    assertCardPaymentMatches(first, {
      orderId,
      amount,
      externalCustomerId,
      installmentCount,
    });
    return first;
  }

  private async getPixQrCode(
    externalPaymentId: string
  ): Promise<PixPaymentData> {
    const id = requiredText(externalPaymentId, "externalPaymentId");
    let qr: AsaasPixQrCodePayload;
    try {
      qr = await this.request<AsaasPixQrCodePayload>(
        "get_pix_qr_code",
        `/payments/${encodeURIComponent(id)}/pixQrCode`,
        { method: "GET" }
      );
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        throw new PaymentProviderError({
          message: error.message,
          operation: error.operation,
          statusCode: error.statusCode,
          providerCode: error.providerCode,
          endpoint: error.endpoint,
          correlationId: error.correlationId,
          externalResourceId: id,
          retryable: error.retryable,
        });
      }
      throw error;
    }
    return {
      copyAndPaste: requiredText(qr.payload, "payload Pix"),
      qrCodeBase64: requiredText(qr.encodedImage, "imagem do QR Code Pix"),
      expirationAt: requiredText(qr.expirationDate, "expiração do QR Code Pix"),
    };
  }

  private async request<T>(
    operation: PaymentProviderOperation,
    path: string,
    init: RequestInit
  ): Promise<T> {
    const correlationId = randomUUID();
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/json");
    headers.set("User-Agent", this.config.userAgent);
    headers.set("access_token", this.config.apiKey);
    headers.set("X-Correlation-Id", correlationId);

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      ASAAS_REQUEST_TIMEOUT_MS
    );
    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
      const payload = await readResponsePayload(response);
      if (!response.ok) {
        const providerError = extractProviderError(payload);
        throw new PaymentProviderError({
          operation,
          statusCode: response.status,
          providerCode: providerError.code,
          message: providerError.message,
          endpoint: `${init.method ?? "GET"} ${path}`,
          correlationId,
          retryable: response.status === 429 || response.status >= 500,
        });
      }
      return payload as T;
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      throw new PaymentProviderError({
        operation,
        message: "Falha de comunicação com a Asaas.",
        endpoint: `${init.method ?? "GET"} ${path}`,
        correlationId,
        retryable: true,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeLegalName(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR")
    : "";
}

function normalizeCustomer(
  customer: PaymentCustomerInput
): Required<
  Pick<PaymentCustomerInput, "internalId" | "name" | "cpfCnpj">
> &
  Pick<
    PaymentCustomerInput,
    "persistedExternalCustomerId" | "email" | "phone"
  > {
  const cpfCnpj = digits(customer.cpfCnpj);
  if (!isValidCpfCnpj(cpfCnpj)) {
    throw new PaymentValidationError("CPF/CNPJ inválido para o cliente Asaas.");
  }
  const email = customer.email?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PaymentValidationError("E-mail inválido para o cliente Asaas.");
  }
  return {
    internalId: requiredText(customer.internalId, "internalId do cliente"),
    persistedExternalCustomerId:
      customer.persistedExternalCustomerId?.trim() || null,
    name: requiredText(customer.name, "nome do cliente"),
    cpfCnpj,
    email,
    phone: customer.phone ? digits(customer.phone) || null : null,
  };
}

function assertCustomerIdentity(
  candidate: AsaasCustomerPayload,
  expected: ReturnType<typeof normalizeCustomer>
): void {
  if (
    !candidate.id ||
    candidate.deleted ||
    candidate.externalReference !== expected.internalId ||
    digits(candidate.cpfCnpj ?? "") !== expected.cpfCnpj
  ) {
    throw new PaymentProviderError({
      operation: "get_customer",
      message: "Cliente Asaas divergente do cliente interno.",
    });
  }
}

function toProviderCustomer(
  customer: AsaasCustomerPayload,
  expected: ReturnType<typeof normalizeCustomer>,
  created: boolean
): ProviderCustomer {
  return {
    provider: "ASAAS",
    externalCustomerId: requiredText(customer.id, "id do cliente Asaas"),
    externalReference: expected.internalId,
    cpfCnpj: expected.cpfCnpj,
    created,
  };
}

function assertExistingPaymentMatches(
  payment: AsaasPaymentPayload,
  expected: {
    orderId: string;
    amount: number;
    externalCustomerId: string;
    billingType?: "PIX" | "BOLETO";
  }
): void {
  if (
    !payment.id ||
    payment.deleted ||
    payment.externalReference !== expected.orderId ||
    payment.customer !== expected.externalCustomerId ||
    payment.billingType !== (expected.billingType ?? "PIX") ||
    toCents(payment.value) !== toCents(expected.amount)
  ) {
    throw new PaymentProviderError({
      operation: "find_payment",
      message: "Cobrança Asaas divergente do pedido interno.",
    });
  }
}

function assertCardPaymentMatches(
  payment: AsaasPaymentPayload,
  expected: {
    orderId: string;
    amount: number;
    externalCustomerId: string;
    installmentCount: number;
  }
): void {
  const returnedTotal =
    expected.installmentCount > 1
      ? Number(payment.totalValue ?? Number(payment.value) * expected.installmentCount)
      : Number(payment.value);
  if (
    !payment.id ||
    payment.deleted ||
    payment.externalReference !== expected.orderId ||
    payment.customer !== expected.externalCustomerId ||
    payment.billingType !== "CREDIT_CARD" ||
    toCents(returnedTotal) !== toCents(expected.amount) ||
    (expected.installmentCount > 1 &&
      Number(payment.installmentCount ?? expected.installmentCount) !==
        expected.installmentCount)
  ) {
    throw new PaymentProviderError({
      operation: "find_payment",
      externalResourceId: payment.id,
      message: "A cobrança de cartão encontrada diverge do pedido interno.",
    });
  }
}

function normalizePayment(payment: AsaasPaymentPayload): ProviderPayment {
  return {
    provider: "ASAAS",
    externalPaymentId: requiredText(payment.id, "id da cobrança Asaas"),
    externalCustomerId: requiredText(
      payment.customer,
      "id do cliente da cobrança"
    ),
    externalReference:
      typeof payment.externalReference === "string"
        ? payment.externalReference
        : null,
    method: mapBillingType(payment.billingType),
    status: mapAsaasPaymentStatus(payment.status),
    rawStatus: requiredText(payment.status, "status da cobrança").toUpperCase(),
    amount: normalizeMoney(
      payment.billingType === "CREDIT_CARD" && payment.totalValue
        ? payment.totalValue
        : payment.value,
      "valor da cobrança"
    ),
    dueDate: typeof payment.dueDate === "string" ? payment.dueDate : null,
    invoiceUrl:
      typeof payment.invoiceUrl === "string" ? payment.invoiceUrl : null,
  };
}

function mapBillingType(value: string): ProviderPaymentMethod {
  switch (value?.toUpperCase()) {
    case "PIX":
    case "CREDIT_CARD":
    case "BOLETO":
      return value.toUpperCase() as ProviderPaymentMethod;
    default:
      throw new PaymentValidationError("Modalidade Asaas não suportada.");
  }
}

function normalizeInstallmentCount(value: number, configuredMax: number): number {
  const max = normalizeInteger(configuredMax, "maxInstallmentCount", 1, 3);
  return normalizeInteger(value, "installmentCount", 1, max);
}

function normalizeInteger(
  value: number,
  field: string,
  min: number,
  max: number
): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new PaymentValidationError(`${field} deve estar entre ${min} e ${max}.`);
  }
  return value;
}

function normalizeCallback(
  callback: CreateCreditCardCheckoutRequest["callback"]
) {
  return {
    successUrl: requiredHttpsUrl(callback.successUrl, "successUrl"),
    cancelUrl: requiredHttpsUrl(callback.cancelUrl, "cancelUrl"),
    expiredUrl: requiredHttpsUrl(callback.expiredUrl, "expiredUrl"),
  };
}

function requiredHttpsUrl(value: unknown, field: string): string {
  const text = requiredText(value, field);
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    throw new PaymentValidationError(`${field} deve ser uma URL válida.`);
  }
  if (parsed.protocol !== "https:") {
    throw new PaymentValidationError(`${field} deve usar HTTPS.`);
  }
  return parsed.toString();
}

function normalizeCheckoutItems(
  values: CreateCreditCardCheckoutRequest["items"],
  expectedAmount: number
) {
  if (!Array.isArray(values) || values.length === 0 || values.length > 100) {
    throw new PaymentValidationError("O checkout deve conter de 1 a 100 itens.");
  }
  const items = values.map((item) => ({
    externalReference: requiredText(
      item.externalReference,
      "referência do item"
    ).slice(0, 200),
    name: requiredText(item.name, "nome do item").slice(0, 200),
    description: item.description?.trim().slice(0, 500) || undefined,
    quantity: normalizeInteger(item.quantity, "quantidade do item", 1, 999),
    value: normalizeMoney(item.value, "valor do item"),
  }));
  const itemCents = items.reduce(
    (sum, item) => sum + toCents(item.value) * item.quantity,
    0
  );
  if (itemCents !== toCents(expectedAmount)) {
    throw new PaymentValidationError(
      "A soma dos itens do checkout diverge do total do pedido."
    );
  }
  return items;
}

function assertCheckoutMatches(
  checkout: AsaasCheckoutPayload,
  orderId: string
): void {
  if (
    !checkout.id ||
    checkout.externalReference !== orderId ||
    !checkout.link ||
    !["ACTIVE", "PAID"].includes(String(checkout.status).toUpperCase())
  ) {
    throw new PaymentProviderError({
      operation: "find_checkout",
      message: "Checkout Asaas divergente do pedido interno.",
    });
  }
  requiredHttpsUrl(checkout.link, "link do checkout");
}

function normalizeCheckoutResult(
  checkout: AsaasCheckoutPayload,
  amount: number,
  installmentCount: number,
  reusedExistingCheckout: boolean,
  now: Date
): CreateCreditCardCheckoutResult {
  const minutes = normalizeInteger(
    Number(checkout.minutesToExpire),
    "minutesToExpire retornado",
    10,
    1440
  );
  const expiresAt = new Date(now.getTime() + minutes * 60_000).toISOString();
  return {
    provider: "ASAAS",
    method: "CREDIT_CARD",
    externalCheckoutId: requiredText(checkout.id, "id do checkout"),
    externalPaymentId: null,
    externalCustomerId: null,
    externalReference: requiredText(
      checkout.externalReference,
      "referência do checkout"
    ),
    checkoutUrl: requiredHttpsUrl(checkout.link, "link do checkout"),
    status: "PENDING",
    rawStatus: requiredText(checkout.status, "status do checkout").toUpperCase(),
    amount,
    installmentCount,
    installmentValue: Math.floor(toCents(amount) / installmentCount) / 100,
    expiresAt,
    reusedExistingCheckout,
  };
}

function normalizeMoney(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new PaymentValidationError(`${field} deve ser um valor positivo.`);
  }
  const cents = toCents(value);
  if (Math.abs(value * 100 - cents) > 1e-7) {
    throw new PaymentValidationError(`${field} deve ter no máximo duas casas decimais.`);
  }
  return cents / 100;
}

function toCents(value: number): number {
  return Math.round(Number(value) * 100);
}

function normalizeDueDate(value: Date | string, now: Date): string {
  const formatted =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : requiredText(value, "dueDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
    throw new PaymentValidationError("dueDate deve usar o formato YYYY-MM-DD.");
  }
  const parsed = new Date(`${formatted}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== formatted) {
    throw new PaymentValidationError("dueDate inválida.");
  }
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  if (parsed.getTime() < today.getTime()) {
    throw new PaymentValidationError("dueDate não pode estar no passado.");
  }
  return formatted;
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new PaymentValidationError(`${field} é obrigatório.`);
  }
  return value.trim();
}

function asRecord(value: unknown, message: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PaymentValidationError(message);
  }
  return value as UnknownRecord;
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCpfCnpj(value: string): boolean {
  const document = digits(value);
  if (!/^\d{11}$|^\d{14}$/.test(document) || /^(\d)\1+$/.test(document)) {
    return false;
  }
  return document.length === 11
    ? isValidCpf(document)
    : isValidCnpj(document);
}

function isValidCpf(cpf: string): boolean {
  const calculate = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(cpf[i]) * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calculate(9) === Number(cpf[9]) && calculate(10) === Number(cpf[10]);
}

function isValidCnpj(cnpj: string): boolean {
  const calculate = (length: 12 | 13) => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce(
      (total, weight, index) => total + Number(cnpj[index]) * weight,
      0
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calculate(12) === Number(cnpj[12]) &&
    calculate(13) === Number(cnpj[13]);
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new PaymentProviderError({
      operation: "get_payment",
      statusCode: response.status,
      message: "A Asaas retornou uma resposta inválida.",
      retryable: response.status >= 500,
    });
  }
}

function extractProviderError(payload: unknown): {
  code?: string;
  message: string;
} {
  if (payload && typeof payload === "object") {
    const errors = (payload as UnknownRecord).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0];
      if (first && typeof first === "object") {
        const item = first as UnknownRecord;
        const code = typeof item.code === "string" ? item.code.slice(0, 100) : undefined;
        const description =
          typeof item.description === "string"
            ? item.description.slice(0, 500)
            : "A Asaas rejeitou a operação.";
        return { code, message: description };
      }
    }
  }
  return { message: "A Asaas rejeitou a operação." };
}
