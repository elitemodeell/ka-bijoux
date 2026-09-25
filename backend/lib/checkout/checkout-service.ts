import {
  OrderStatus,
  PaymentMethod,
  PaymentEnvironment,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  ShippingType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateShipping, SHIPPING_OPTION_IDS } from "@/lib/shipping";
import { generateOrderNumber } from "@/lib/utils";
import { isValidCpf, normalizeCpf } from "./cpf";
import { loadAsaasFeatureConfig } from "@/lib/payments/config";
import {
  CreateBoletoPaymentResult,
  CreateCreditCardCheckoutResult,
  PaymentProviderError,
  ProviderAccountIdentity,
} from "@/lib/payments/types";
import {
  calculateCouponDiscountCents,
  centsToDecimal,
  CheckoutError,
  createCheckoutRequestHash,
  priceCart,
} from "./domain";
import { isGooglePlayEligibleRecord } from "@/lib/google-play-distribution";

export interface CheckoutInput {
  addressId?: string;
  shippingType: ShippingType;
  shippingOptionId?: string;
  couponCode?: string;
  notes?: string;
  idempotencyKey: string;
  paymentMethod?: "PIX" | "CREDIT_CARD" | "BOLETO";
  installmentCount?: number;
}

export interface CheckoutExecutionOptions {
  distribution: "WEB_FULL" | "GOOGLE_PLAY";
}

export interface CheckoutPaymentResult {
  provider: "ASAAS";
  externalPaymentId: string;
  externalCustomerId: string;
  externalReference: string;
  method: "PIX";
  status: string;
  rawStatus: string;
  amount: number;
  dueDate: string | null;
  invoiceUrl: string | null;
  pix: {
    copyAndPaste: string;
    qrCodeBase64: string;
    expirationAt: string;
  };
}

export interface CheckoutPaymentService {
  assertAccountIdentity(): Promise<ProviderAccountIdentity>;
  findOrCreateCustomer(customer: {
    internalId: string;
    persistedExternalCustomerId?: string | null;
    name: string;
    cpfCnpj: string;
    email?: string | null;
    phone?: string | null;
  }): Promise<{
    provider: "ASAAS";
    externalCustomerId: string;
    externalReference: string;
    cpfCnpj: string;
  }>;
  reconcileOrderPayment(orderId: string): Promise<void>;
  createPixPayment(request: {
    orderId: string;
    orderNumber: string;
    amount: number;
    dueDate: Date | string;
    description?: string;
    customer: {
      internalId: string;
      persistedExternalCustomerId?: string | null;
      name: string;
      cpfCnpj: string;
      email?: string | null;
      phone?: string | null;
    };
  }): Promise<CheckoutPaymentResult>;
  createCreditCardCheckout?(request: {
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
    items: Array<{
      externalReference: string;
      name: string;
      description?: string;
      quantity: number;
      value: number;
    }>;
    customer: Parameters<CheckoutPaymentService["findOrCreateCustomer"]>[0];
  }): Promise<CreateCreditCardCheckoutResult>;
  createBoletoPayment?(request: {
    orderId: string;
    orderNumber: string;
    amount: number;
    dueDate: Date | string;
    description?: string;
    customer: Parameters<CheckoutPaymentService["findOrCreateCustomer"]>[0];
  }): Promise<CreateBoletoPaymentResult>;
}

const orderInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: {
    include: {
      product: {
        select: {
          images: { take: 1, orderBy: { order: "asc" } },
          active: true,
          distributionChannels: true,
          playStoreStatus: true,
          contentClassification: true,
          policyReviewStatus: true,
          category: {
            select: {
              active: true,
              distributionChannels: true,
              playStoreStatus: true,
              contentClassification: true,
              policyReviewStatus: true,
            },
          },
        },
      },
    },
  },
  payment: true,
  address: true,
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      cpf: true,
      asaasCustomerId: true,
      asaasAccountId: true,
    },
  },
  statusHistory: { orderBy: { createdAt: "desc" } },
});

export type CheckoutOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type CheckoutDb = Pick<
  Prisma.TransactionClient,
  "address" | "cart" | "coupon" | "customer" | "storeSettings"
>;

function normalizedOptionId(input: CheckoutInput): string | null {
  if (input.shippingOptionId) return input.shippingOptionId;
  if (input.shippingType === ShippingType.RETIRADA) return SHIPPING_OPTION_IDS.pickup;
  if (input.shippingType === ShippingType.MOTOTAXI) return SHIPPING_OPTION_IDS.mototaxi;
  return null;
}

function dueDateFor(days: number, now = new Date()): Date {
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    throw new CheckoutError(
      "Configuração de pagamento indisponível.",
      503,
      "PAYMENT_CONFIG_MISSING"
    );
  }
  const dueDate = new Date(now);
  dueDate.setUTCDate(dueDate.getUTCDate() + days);
  return dueDate;
}

async function getContext(
  db: CheckoutDb,
  customerId: string,
  input: CheckoutInput,
  options: CheckoutExecutionOptions
) {
  const couponCode = input.couponCode?.trim();
  const [customer, cart, settings, address, coupon] = await Promise.all([
    db.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        active: true,
        asaasCustomerId: true,
        asaasAccountId: true,
      },
    }),
    db.cart.findUnique({
      where: { customerId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { take: 1, orderBy: { order: "asc" } },
                category: true,
              },
            },
            variation: true,
          },
        },
      },
    }),
    db.storeSettings.findFirst(),
    input.addressId
      ? db.address.findFirst({ where: { id: input.addressId, customerId } })
      : Promise.resolve(null),
    couponCode
      ? db.coupon.findFirst({
          where: { code: { equals: couponCode, mode: "insensitive" } },
        })
      : Promise.resolve(null),
  ]);

  if (!customer || !customer.active) {
    throw new CheckoutError("Cliente não encontrado.", 401, "CUSTOMER_NOT_FOUND");
  }
  if (!customer.cpf || !isValidCpf(customer.cpf)) {
    throw new CheckoutError(
      "Cadastre um CPF válido no perfil antes de pagar.",
      422,
      "CPF_REQUIRED"
    );
  }
  if (!cart || cart.items.length === 0) {
    throw new CheckoutError("Carrinho vazio.", 400, "EMPTY_CART");
  }
  if (!settings) {
    throw new CheckoutError(
      "Configuração de entrega indisponível.",
      503,
      "SHIPPING_CONFIG_MISSING"
    );
  }
  if (input.addressId && !address) {
    throw new CheckoutError("Endereço inválido.", 403, "ADDRESS_FORBIDDEN");
  }
  if (input.shippingType !== ShippingType.RETIRADA && !address) {
    throw new CheckoutError(
      "Endereço de entrega obrigatório.",
      422,
      "ADDRESS_REQUIRED"
    );
  }
  if (couponCode && !coupon) {
    throw new CheckoutError("Cupom inválido ou expirado.", 422, "INVALID_COUPON");
  }
  if (options.distribution === "GOOGLE_PLAY") {
    const hasUnavailableItem = cart.items.some(
      (item) =>
        !isGooglePlayEligibleRecord(item.product) ||
        !isGooglePlayEligibleRecord(item.product.category)
    );
    if (hasUnavailableItem) {
      throw new CheckoutError(
        "Um item do carrinho não está disponível neste canal.",
        409,
        "CATALOG_ITEM_UNAVAILABLE"
      );
    }
    if (coupon && !isGooglePlayEligibleRecord(coupon)) {
      throw new CheckoutError(
        "Cupom inválido ou indisponível.",
        422,
        "INVALID_COUPON"
      );
    }
  }

  return { customer, cart, settings, address, coupon };
}

function shippingContextSignature(context: Awaited<ReturnType<typeof getContext>>): string {
  return JSON.stringify({
    addressZipCode: context.address?.zipCode.replace(/\D/g, "") ?? null,
    settings: {
      id: context.settings.id,
      updatedAt: context.settings.updatedAt.toISOString(),
      correiosEnabled: context.settings.correiosEnabled,
      mototaxiEnabled: context.settings.mototaxiEnabled,
      storePickupEnabled: context.settings.storePickupEnabled,
      mototaxiPrice: String(context.settings.mototaxiPrice),
      storeZipCode: context.settings.storeZipCode,
      shippingPackageWeight: String(context.settings.shippingPackageWeight ?? ""),
      shippingPackageHeight: String(context.settings.shippingPackageHeight ?? ""),
      shippingPackageWidth: String(context.settings.shippingPackageWidth ?? ""),
      shippingPackageLength: String(context.settings.shippingPackageLength ?? ""),
      shippingHandlingDays: context.settings.shippingHandlingDays,
    },
    items: context.cart.items
      .map((item) => ({
        id: item.id,
        productId: item.productId,
        variationId: item.variationId,
        quantity: item.quantity,
        weight: String(item.product.weight),
        height: String(item.product.height),
        width: String(item.product.width),
        length: String(item.product.length),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  });
}

function requestHash(
  customerId: string,
  input: CheckoutInput,
  items: Array<{ productId: string; variationId: string | null; quantity: number }>
) {
  return createCheckoutRequestHash({
    customerId,
    addressId: input.addressId,
    shippingType: input.shippingType,
    shippingOptionId: normalizedOptionId(input),
    couponCode: input.couponCode,
    notes: input.notes,
    paymentMethod: input.paymentMethod ?? "PIX",
    installmentCount: input.installmentCount ?? 1,
    items,
  });
}

function assertIdempotentMatch(
  order: CheckoutOrder,
  customerId: string,
  input: CheckoutInput
) {
  const retryHash = requestHash(customerId, input, order.items);
  if (
    order.customerId !== customerId ||
    !order.checkoutRequestHash ||
    order.checkoutRequestHash !== retryHash
  ) {
    // A mesma resposta evita revelar se a chave pertence a outro cliente.
    throw new CheckoutError(
      "Chave de idempotência já utilizada com outra solicitação.",
      409,
      "IDEMPOTENCY_CONFLICT"
    );
  }
}

function paymentCustomerInput(
  customer: CheckoutOrder["customer"],
  externalCustomerId?: string | null,
  accountId?: string
) {
  const cpf = customer.cpf;
  if (!cpf || !isValidCpf(cpf)) {
    throw new CheckoutError(
      "Cadastre um CPF válido no perfil antes de pagar.",
      422,
      "CPF_REQUIRED"
    );
  }
  return {
    internalId: customer.id,
    persistedExternalCustomerId:
      externalCustomerId ??
      (accountId && customer.asaasAccountId === accountId
        ? customer.asaasCustomerId
        : null),
    name: customer.name,
    cpfCnpj: normalizeCpf(cpf),
    email: customer.email,
    phone: customer.phone,
  };
}

async function loadCurrentPaymentCustomer(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      cpf: true,
      active: true,
      asaasCustomerId: true,
      asaasAccountId: true,
    },
  });
  if (!customer || !customer.active) {
    throw new CheckoutError("Cliente não encontrado.", 401, "CUSTOMER_NOT_FOUND");
  }
  return customer;
}

async function waitForExternalCustomer(
  customerId: string,
  accountId: string
): Promise<string | null> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { asaasCustomerId: true, asaasAccountId: true },
    });
    if (current?.asaasCustomerId && current.asaasAccountId === accountId) {
      return current.asaasCustomerId;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
}

async function ensureExternalCustomer(
  order: CheckoutOrder,
  paymentService: CheckoutPaymentService,
  accountId: string
): Promise<string> {
  if (
    order.customer.asaasCustomerId &&
    order.customer.asaasAccountId === accountId
  ) {
    return order.customer.asaasCustomerId;
  }

  const claimedAt = new Date();
  const staleBefore = new Date(claimedAt.getTime() - 120_000);
  const claimed = await prisma.customer.updateMany({
    where: {
      id: order.customerId,
      OR: [
        { asaasCreationClaimedAt: null },
        { asaasCreationClaimedAt: { lt: staleBefore } },
      ],
    },
    data: {
      asaasCreationClaimedAt: claimedAt,
      asaasCreationAttemptCount: { increment: 1 },
    },
  });

  if (claimed.count !== 1) {
    const winner = await waitForExternalCustomer(order.customerId, accountId);
    if (winner) return winner;
    throw new CheckoutError(
      "O cadastro de pagamento já está sendo preparado. Tente novamente em instantes.",
      409,
      "PAYMENT_CUSTOMER_IN_PROGRESS"
    );
  }

  try {
    // Releitura após adquirir o claim: uma alteração concorrente de CPF só pode
    // ocorrer antes do claim e, portanto, este é o snapshot autoritativo.
    const currentCustomer = await loadCurrentPaymentCustomer(order.customerId);
    const currentInput = paymentCustomerInput(currentCustomer, null, accountId);
    const external = await paymentService.findOrCreateCustomer(currentInput);
    if (
      external.provider !== "ASAAS" ||
      external.externalReference !== order.customerId ||
      normalizeCpf(external.cpfCnpj) !== currentInput.cpfCnpj ||
      !external.externalCustomerId
    ) {
      throw new CheckoutError(
        "O provedor retornou um cadastro de cliente divergente.",
        502,
        "PAYMENT_CUSTOMER_MISMATCH"
      );
    }

    const persisted = await prisma.customer.updateMany({
      where: { id: order.customerId, asaasCreationClaimedAt: claimedAt },
      data: {
        asaasCustomerId: external.externalCustomerId,
        asaasAccountId: accountId,
        asaasCreationClaimedAt: null,
      },
    });
    if (persisted.count === 0) {
      const winner = await prisma.customer.findUnique({
        where: { id: order.customerId },
        select: { asaasCustomerId: true, asaasAccountId: true },
      });
      if (
        winner?.asaasCustomerId !== external.externalCustomerId ||
        winner.asaasAccountId !== accountId
      ) {
        throw new CheckoutError(
          "Conflito ao vincular o cliente ao provedor de pagamento.",
          409,
          "PAYMENT_CUSTOMER_LINK_CONFLICT"
        );
      }
    }
    return external.externalCustomerId;
  } catch (error) {
    await prisma.customer.updateMany({
      where: {
        id: order.customerId,
        asaasCreationClaimedAt: claimedAt,
      },
      data: { asaasCreationClaimedAt: null },
    });
    throw error;
  }
}

async function markPaymentFailure(orderId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { orderId, externalPaymentId: null },
        data: { status: PaymentStatus.FALHA, creationClaimedAt: null },
      });
      const changed = await tx.order.updateMany({
        where: {
          id: orderId,
          status: { in: [OrderStatus.PAGAMENTO_PENDENTE, OrderStatus.FALHA_NO_PAGAMENTO] },
        },
        data: { status: OrderStatus.FALHA_NO_PAGAMENTO },
      });
      if (changed.count > 0) {
        const last = await tx.orderStatusHistory.findFirst({
          where: { orderId },
          orderBy: { createdAt: "desc" },
        });
        if (last?.status !== OrderStatus.FALHA_NO_PAGAMENTO) {
          await tx.orderStatusHistory.create({
            data: {
              orderId,
              status: OrderStatus.FALHA_NO_PAGAMENTO,
              note: "Não foi possível gerar a cobrança Pix; nova tentativa permitida.",
            },
          });
        }
      }
    });
  } catch (error) {
    console.error("Falha ao registrar indisponibilidade do pagamento:", error);
  }
}

function safePaymentError(error: unknown) {
  if (error instanceof PaymentProviderError) {
    return {
      name: error.name,
      operation: error.operation,
      statusCode: error.statusCode ?? null,
      providerCode: error.providerCode ?? null,
      retryable: error.retryable,
    };
  }
  return { name: error instanceof Error ? error.name : "UnknownError" };
}

async function waitForLinkedPayment(orderId: string): Promise<CheckoutOrder | null> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = await prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (
      current?.payment?.externalPaymentId ||
      current?.payment?.externalCheckoutId
    ) {
      return current;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
}

async function claimPaymentCreation(order: CheckoutOrder): Promise<CheckoutOrder | null> {
  if (!order.payment || order.payment.externalPaymentId) return null;

  const now = new Date();
  const staleBefore = new Date(now.getTime() - 120_000);
  const updated = await prisma.payment.updateMany({
    where: {
      id: order.payment.id,
      externalPaymentId: null,
      OR:
        order.payment.method === PaymentMethod.CARTAO_CREDITO
          ? [{ creationClaimedAt: null }]
          : [
              { creationClaimedAt: null },
              { creationClaimedAt: { lt: staleBefore } },
            ],
    },
    data: {
      status: PaymentStatus.AGUARDANDO,
      creationClaimedAt: now,
      creationAttemptCount: { increment: 1 },
    },
  });

  if (updated.count !== 1) {
    const completed = await waitForLinkedPayment(order.id);
    if (completed) return completed;
    throw new CheckoutError(
      "A cobrança deste pedido já está sendo gerada. Tente novamente em instantes.",
      409,
      "PAYMENT_IN_PROGRESS"
    );
  }
  return null;
}

async function reconcileLinkedPayment(
  order: CheckoutOrder,
  paymentService: CheckoutPaymentService
): Promise<CheckoutOrder> {
  try {
    await paymentService.reconcileOrderPayment(order.id);
  } catch (error) {
    console.error(
      "Não foi possível reconciliar a cobrança Pix vinculada:",
      error instanceof Error ? error.name : "erro desconhecido"
    );
    throw new CheckoutError(
      "Não foi possível confirmar o estado atual do Pix. Tente novamente com a mesma solicitação.",
      503,
      "PAYMENT_RECONCILIATION_UNAVAILABLE"
    );
  }

  const reconciled = await prisma.order.findUnique({
    where: { id: order.id },
    include: orderInclude,
  });
  if (!reconciled) {
    throw new CheckoutError("Pedido não encontrado.", 404, "ORDER_NOT_FOUND");
  }
  return reconciled;
}

async function ensurePixPayment(
  order: CheckoutOrder,
  paymentService: CheckoutPaymentService,
  account: ProviderAccountIdentity
): Promise<CheckoutOrder> {
  if (order.payment?.externalPaymentId && order.payment.pixCode) {
    return reconcileLinkedPayment(order, paymentService);
  }
  if (!order.payment) {
    throw new CheckoutError("Pagamento local não encontrado.", 500, "LOCAL_PAYMENT_MISSING");
  }
  if (!order.customer.cpf || !isValidCpf(order.customer.cpf)) {
    throw new CheckoutError(
      "Cadastre um CPF válido no perfil antes de pagar com Pix.",
      422,
      "CPF_REQUIRED"
    );
  }

  const linkedByAnotherRequest = await claimPaymentCreation(order);
  if (linkedByAnotherRequest) return reconcileLinkedPayment(linkedByAnotherRequest, paymentService);

  let result: CheckoutPaymentResult;
  let externalCustomerId: string;
  try {
    externalCustomerId = await ensureExternalCustomer(
      order,
      paymentService,
      account.accountId
    );
    const currentCustomer = await loadCurrentPaymentCustomer(order.customerId);
    result = await paymentService.createPixPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.total),
      dueDate: dueDateFor(Number(process.env.PAYMENT_PIX_DUE_DAYS)),
      description: `Pedido ${order.orderNumber}`,
      customer: paymentCustomerInput(
        currentCustomer,
        externalCustomerId,
        account.accountId
      ),
    });
  } catch (error) {
    await markPaymentFailure(order.id);
    if (error instanceof CheckoutError) throw error;
    console.error(
      "Não foi possível criar/reconciliar a cobrança Pix:",
      safePaymentError(error)
    );
    throw new CheckoutError(
      "Não foi possível gerar o Pix agora. Tente novamente com o mesmo pedido.",
      503,
      "PAYMENT_UNAVAILABLE"
    );
  }

  if (
    result.provider !== "ASAAS" ||
    result.method !== "PIX" ||
    result.externalReference !== order.id ||
    Math.round(result.amount * 100) !== Math.round(Number(order.total) * 100) ||
    !result.externalPaymentId ||
    !result.externalCustomerId ||
    !result.pix.copyAndPaste ||
    !result.pix.qrCodeBase64 ||
    !result.pix.expirationAt ||
    Number.isNaN(new Date(result.pix.expirationAt).getTime())
  ) {
    await markPaymentFailure(order.id);
    throw new CheckoutError(
      "A cobrança retornou dados divergentes e não foi vinculada ao pedido.",
      502,
      "PAYMENT_MISMATCH"
    );
  }

  if (
    result.externalCustomerId !== externalCustomerId
  ) {
    await markPaymentFailure(order.id);
    throw new CheckoutError(
      "A cobrança retornou um cliente divergente e não foi vinculada ao pedido.",
      502,
      "PAYMENT_CUSTOMER_MISMATCH"
    );
  }

  await prisma.$transaction(async (tx) => {
    const linked = await tx.payment.updateMany({
      where: {
        orderId: order.id,
        OR: [
          { externalPaymentId: null },
          { externalPaymentId: result.externalPaymentId },
        ],
      },
      data: {
        provider: PaymentProvider.ASAAS,
        method: PaymentMethod.PIX,
        status: PaymentStatus.AGUARDANDO,
        amount: order.total,
        gatewayId: result.externalPaymentId,
        externalPaymentId: result.externalPaymentId,
        externalCustomerId: result.externalCustomerId,
        providerAccountId: account.accountId,
        externalReference: order.id,
        idempotencyKey: `${order.id}:PIX`,
        environment:
          account.environment === "production"
            ? PaymentEnvironment.PRODUCTION
            : PaymentEnvironment.SANDBOX,
        lastProviderStatus: result.rawStatus,
        creationClaimedAt: null,
        pixCode: result.pix.copyAndPaste,
        pixQrCode: result.pix.qrCodeBase64,
        pixExpiration: new Date(result.pix.expirationAt),
        gatewayData: result.invoiceUrl ? { invoiceUrl: result.invoiceUrl } : undefined,
      },
    });

    if (linked.count === 0) {
      const winner = await tx.payment.findUnique({ where: { orderId: order.id } });
      if (winner?.externalPaymentId !== result.externalPaymentId) {
        throw new CheckoutError(
          "Conflito ao vincular a cobrança ao pedido.",
          409,
          "PAYMENT_LINK_CONFLICT"
        );
      }
    }

    await tx.customer.updateMany({
      where: { id: order.customerId, asaasAccountId: account.accountId },
      data: {
        asaasCustomerId: result.externalCustomerId,
        asaasAccountId: account.accountId,
      },
    });

    const statusChanged = await tx.order.updateMany({
      where: {
        id: order.id,
        status: { in: [OrderStatus.PAGAMENTO_PENDENTE, OrderStatus.FALHA_NO_PAGAMENTO] },
      },
      data: { status: OrderStatus.AGUARDANDO_PAGAMENTO },
    });
    if (statusChanged.count > 0) {
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.AGUARDANDO_PAGAMENTO,
          note: "Cobrança Pix gerada.",
        },
      });
    }
  });

  const updated = await prisma.order.findUnique({ where: { id: order.id }, include: orderInclude });
  if (!updated) throw new CheckoutError("Pedido não encontrado.", 404, "ORDER_NOT_FOUND");
  return reconcileLinkedPayment(updated, paymentService);
}

async function ensureCreditCardCheckout(
  order: CheckoutOrder,
  paymentService: CheckoutPaymentService,
  account: ProviderAccountIdentity
): Promise<CheckoutOrder> {
  if (order.payment?.externalCheckoutId && order.payment.checkoutUrl) {
    return order;
  }
  if (!order.payment || !paymentService.createCreditCardCheckout) {
    throw new CheckoutError(
      "Pagamento por cartão indisponível.",
      503,
      "PAYMENT_METHOD_UNAVAILABLE"
    );
  }
  const linkedByAnotherRequest = await claimPaymentCreation(order);
  if (linkedByAnotherRequest) return linkedByAnotherRequest;

  const features = loadAsaasFeatureConfig();
  const installments = order.payment.installmentCount;
  const base = features.checkoutReturnUrl;
  let result: CreateCreditCardCheckoutResult;
  try {
    const currentCustomer = await loadCurrentPaymentCustomer(order.customerId);
    result = await paymentService.createCreditCardCheckout({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.total),
      installmentCount: installments,
      maxInstallmentCount: features.maxInstallments,
      minutesToExpire: features.checkoutMinutesToExpire,
      callback: {
        successUrl: `${base}/pagamento/retorno?status=success&orderId=${encodeURIComponent(order.id)}`,
        cancelUrl: `${base}/pagamento/retorno?status=cancel&orderId=${encodeURIComponent(order.id)}`,
        expiredUrl: `${base}/pagamento/retorno?status=expired&orderId=${encodeURIComponent(order.id)}`,
      },
      items: [
        {
          externalReference: order.id,
          name: `Pedido ${order.orderNumber}`,
          description: "Compra KA Bijoux",
          quantity: 1,
          value: Number(order.total),
        },
      ],
      customer: paymentCustomerInput(currentCustomer, null, account.accountId),
    });
  } catch (error) {
    // O Checkout hospedado não expõe uma chave idempotente de criação. Em falha
    // de rede/5xx, o servidor pode ter criado o checkout sem devolver seu ID.
    // Mantemos a trava local nesse caso para impedir uma segunda cobrança; a
    // recuperação deve ocorrer por webhook/reconciliação ou intervenção segura.
    if (!(error instanceof PaymentProviderError && error.retryable)) {
      await markPaymentFailure(order.id);
    }
    if (error instanceof CheckoutError) throw error;
    console.error(
      "Não foi possível criar o checkout hospedado:",
      error instanceof Error ? error.name : "erro desconhecido"
    );
    throw new CheckoutError(
      "Não foi possível abrir o pagamento por cartão agora. Tente novamente com o mesmo pedido.",
      503,
      "PAYMENT_UNAVAILABLE"
    );
  }

  if (
    result.provider !== "ASAAS" ||
    result.method !== "CREDIT_CARD" ||
    result.externalReference !== order.id ||
    Math.round(result.amount * 100) !== Math.round(Number(order.total) * 100) ||
    result.installmentCount !== installments ||
    !result.externalCheckoutId ||
    !result.checkoutUrl.startsWith("https://")
  ) {
    await markPaymentFailure(order.id);
    throw new CheckoutError(
      "O checkout retornou dados divergentes e não foi vinculado ao pedido.",
      502,
      "PAYMENT_MISMATCH"
    );
  }

  await prisma.$transaction(async (tx) => {
    const linked = await tx.payment.updateMany({
      where: {
        orderId: order.id,
        OR: [
          { externalCheckoutId: null },
          { externalCheckoutId: result.externalCheckoutId },
        ],
      },
      data: {
        provider: PaymentProvider.ASAAS,
        method: PaymentMethod.CARTAO_CREDITO,
        status: PaymentStatus.AGUARDANDO,
        amount: order.total,
        externalCheckoutId: result.externalCheckoutId,
        providerAccountId: account.accountId,
        externalReference: order.id,
        idempotencyKey: `${order.id}:CREDIT_CARD`,
        environment:
          account.environment === "production"
            ? PaymentEnvironment.PRODUCTION
            : PaymentEnvironment.SANDBOX,
        installmentCount: result.installmentCount,
        installmentValue: result.installmentValue,
        lastProviderStatus: result.rawStatus,
        checkoutUrl: result.checkoutUrl,
        checkoutExpiration: new Date(result.expiresAt),
        creationClaimedAt: null,
      },
    });
    if (linked.count !== 1) {
      throw new CheckoutError(
        "Conflito ao vincular o checkout ao pedido.",
        409,
        "PAYMENT_LINK_CONFLICT"
      );
    }
    await setOrderAwaitingPayment(tx, order.id, "Checkout de cartão gerado.");
  });

  const updated = await prisma.order.findUnique({
    where: { id: order.id },
    include: orderInclude,
  });
  if (!updated) throw new CheckoutError("Pedido não encontrado.", 404, "ORDER_NOT_FOUND");
  return updated;
}

async function ensureBoletoPayment(
  order: CheckoutOrder,
  paymentService: CheckoutPaymentService,
  account: ProviderAccountIdentity
): Promise<CheckoutOrder> {
  if (order.payment?.externalPaymentId && order.payment.boletoUrl) {
    return reconcileLinkedPayment(order, paymentService);
  }
  if (!order.payment || !paymentService.createBoletoPayment) {
    throw new CheckoutError(
      "Pagamento por boleto indisponível.",
      503,
      "PAYMENT_METHOD_UNAVAILABLE"
    );
  }
  const linkedByAnotherRequest = await claimPaymentCreation(order);
  if (linkedByAnotherRequest) return reconcileLinkedPayment(linkedByAnotherRequest, paymentService);

  const features = loadAsaasFeatureConfig();
  let result: CreateBoletoPaymentResult;
  try {
    const externalCustomerId = await ensureExternalCustomer(
      order,
      paymentService,
      account.accountId
    );
    const currentCustomer = await loadCurrentPaymentCustomer(order.customerId);
    result = await paymentService.createBoletoPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.total),
      dueDate: dueDateFor(features.boletoDueDays),
      description: `Pedido ${order.orderNumber}`,
      customer: paymentCustomerInput(
        currentCustomer,
        externalCustomerId,
        account.accountId
      ),
    });
  } catch (error) {
    await markPaymentFailure(order.id);
    if (error instanceof CheckoutError) throw error;
    console.error(
      "Não foi possível criar o boleto:",
      error instanceof Error ? error.name : "erro desconhecido"
    );
    throw new CheckoutError(
      "Não foi possível gerar o boleto agora. Tente novamente com o mesmo pedido.",
      503,
      "PAYMENT_UNAVAILABLE"
    );
  }

  if (
    result.provider !== "ASAAS" ||
    result.method !== "BOLETO" ||
    result.externalReference !== order.id ||
    Math.round(result.amount * 100) !== Math.round(Number(order.total) * 100) ||
    !result.externalPaymentId ||
    !result.externalCustomerId ||
    !result.bankSlip.bankSlipUrl.startsWith("https://")
  ) {
    await markPaymentFailure(order.id);
    throw new CheckoutError(
      "O boleto retornou dados divergentes e não foi vinculado ao pedido.",
      502,
      "PAYMENT_MISMATCH"
    );
  }

  await prisma.$transaction(async (tx) => {
    const linked = await tx.payment.updateMany({
      where: {
        orderId: order.id,
        OR: [
          { externalPaymentId: null },
          { externalPaymentId: result.externalPaymentId },
        ],
      },
      data: {
        provider: PaymentProvider.ASAAS,
        method: PaymentMethod.BOLETO,
        status: PaymentStatus.AGUARDANDO,
        amount: order.total,
        gatewayId: result.externalPaymentId,
        externalPaymentId: result.externalPaymentId,
        externalCustomerId: result.externalCustomerId,
        providerAccountId: account.accountId,
        externalReference: order.id,
        idempotencyKey: `${order.id}:BOLETO`,
        environment:
          account.environment === "production"
            ? PaymentEnvironment.PRODUCTION
            : PaymentEnvironment.SANDBOX,
        lastProviderStatus: result.rawStatus,
        boletoUrl: result.bankSlip.bankSlipUrl,
        boletoDigitableLine: result.bankSlip.identificationField,
        boletoExpiration: new Date(`${result.bankSlip.dueDate}T23:59:59.999Z`),
        creationClaimedAt: null,
      },
    });
    if (linked.count !== 1) {
      throw new CheckoutError(
        "Conflito ao vincular o boleto ao pedido.",
        409,
        "PAYMENT_LINK_CONFLICT"
      );
    }
    await tx.customer.updateMany({
      where: { id: order.customerId, asaasAccountId: account.accountId },
      data: {
        asaasCustomerId: result.externalCustomerId,
        asaasAccountId: account.accountId,
      },
    });
    await setOrderAwaitingPayment(tx, order.id, "Boleto gerado.");
  });

  const updated = await prisma.order.findUnique({
    where: { id: order.id },
    include: orderInclude,
  });
  if (!updated) throw new CheckoutError("Pedido não encontrado.", 404, "ORDER_NOT_FOUND");
  return reconcileLinkedPayment(updated, paymentService);
}

async function setOrderAwaitingPayment(
  tx: Prisma.TransactionClient,
  orderId: string,
  note: string
) {
  const changed = await tx.order.updateMany({
    where: {
      id: orderId,
      status: {
        in: [OrderStatus.PAGAMENTO_PENDENTE, OrderStatus.FALHA_NO_PAGAMENTO],
      },
    },
    data: { status: OrderStatus.AGUARDANDO_PAGAMENTO },
  });
  if (changed.count > 0) {
    await tx.orderStatusHistory.create({
      data: { orderId, status: OrderStatus.AGUARDANDO_PAGAMENTO, note },
    });
  }
}

function hasExternalPaymentArtifact(payment: CheckoutOrder["payment"]): boolean {
  return Boolean(
    payment &&
      (payment.externalPaymentId ||
        payment.externalCheckoutId ||
        payment.gatewayId ||
        payment.pixCode ||
        payment.pixQrCode ||
        payment.checkoutUrl ||
        payment.boletoUrl ||
        payment.boletoDigitableLine)
  );
}

function assertStoredPaymentAccount(
  payment: CheckoutOrder["payment"],
  account: ProviderAccountIdentity
) {
  if (!hasExternalPaymentArtifact(payment)) return;
  const expectedEnvironment =
    account.environment === "production"
      ? PaymentEnvironment.PRODUCTION
      : PaymentEnvironment.SANDBOX;
  if (
    payment?.provider !== PaymentProvider.ASAAS ||
    payment.providerAccountId !== account.accountId ||
    payment.environment !== expectedEnvironment
  ) {
    throw new CheckoutError(
      "A cobranÃ§a existente pertence a outra configuraÃ§Ã£o financeira e nÃ£o pode ser reutilizada.",
      409,
      "PAYMENT_ACCOUNT_MISMATCH"
    );
  }
}

async function ensurePayment(
  order: CheckoutOrder,
  paymentService: CheckoutPaymentService
) {
  let account: ProviderAccountIdentity;
  try {
    account = await paymentService.assertAccountIdentity();
  } catch (error) {
    console.error(
      "Conta financeira Asaas nÃ£o autorizada ou indisponÃ­vel:",
      safePaymentError(error)
    );
    throw new CheckoutError(
      "Pagamentos temporariamente indisponÃ­veis por validaÃ§Ã£o da conta financeira.",
      503,
      "PAYMENT_ACCOUNT_UNAVAILABLE"
    );
  }
  assertStoredPaymentAccount(order.payment, account);

  switch (order.payment?.method) {
    case PaymentMethod.CARTAO_CREDITO:
      return ensureCreditCardCheckout(order, paymentService, account);
    case PaymentMethod.BOLETO:
      return ensureBoletoPayment(order, paymentService, account);
    case PaymentMethod.PIX:
    default:
      return ensurePixPayment(order, paymentService, account);
  }
}

async function findExisting(idempotencyKey: string) {
  return prisma.order.findUnique({
    where: { checkoutIdempotencyKey: idempotencyKey },
    include: orderInclude,
  });
}

export async function createOrResumeCheckout(
  customerId: string,
  input: CheckoutInput,
  paymentService: CheckoutPaymentService,
  options: CheckoutExecutionOptions = { distribution: "WEB_FULL" }
): Promise<CheckoutOrder> {
  const requestedMethod = input.paymentMethod ?? "PIX";
  const requestedInstallments = input.installmentCount ?? 1;
  if (
    requestedMethod !== "PIX" &&
    requestedMethod !== "CREDIT_CARD" &&
    requestedMethod !== "BOLETO"
  ) {
    throw new CheckoutError(
      "Método de pagamento inválido.",
      422,
      "PAYMENT_METHOD_INVALID"
    );
  }
  if (
    (requestedMethod !== "CREDIT_CARD" && requestedInstallments !== 1) ||
    !Number.isInteger(requestedInstallments) ||
    requestedInstallments < 1
  ) {
    throw new CheckoutError(
      "Quantidade de parcelas inválida.",
      422,
      "INSTALLMENT_COUNT_INVALID"
    );
  }
  if (requestedMethod !== "PIX") {
    const features = loadAsaasFeatureConfig();
    if (!features.enabledMethods[requestedMethod]) {
      throw new CheckoutError(
        "Método de pagamento indisponível.",
        422,
        "PAYMENT_METHOD_DISABLED"
      );
    }
    if (
      requestedMethod === "CREDIT_CARD" &&
      requestedInstallments > features.maxInstallments
    ) {
      throw new CheckoutError(
        `O cartão permite no máximo ${features.maxInstallments} parcelas.`,
        422,
        "INSTALLMENT_COUNT_INVALID"
      );
    }
  }

  const existing = await findExisting(input.idempotencyKey);
  if (existing) {
    assertIdempotentMatch(existing, customerId, input);
    if (
      options.distribution === "GOOGLE_PLAY" &&
      existing.items.some(
        (item) =>
          !isGooglePlayEligibleRecord(item.product) ||
          !isGooglePlayEligibleRecord(item.product.category)
      )
    ) {
      throw new CheckoutError(
        "O pedido não está disponível neste canal.",
        409,
        "CATALOG_ITEM_UNAVAILABLE"
      );
    }
    return ensurePayment(existing, paymentService);
  }

  const prepared = await getContext(prisma, customerId, input, options);
  const preparedSignature = shippingContextSignature(prepared);
  const priced = priceCart(prepared.cart.items);
  const subtotalCents = priced.reduce((sum, item) => sum + item.totalPriceCents, 0);
  calculateCouponDiscountCents(subtotalCents, prepared.coupon);

  const zipCode = prepared.address?.zipCode ?? "";
  const shippingOptions = await calculateShipping(
    zipCode,
    prepared.cart.items.map((item) => ({
      weight: Number(item.product.weight),
      height: Number(item.product.height),
      width: Number(item.product.width),
      length: Number(item.product.length),
      quantity: item.quantity,
      declaredValue: (priced.find((pricedItem) => pricedItem.cartItemId === item.id)?.unitPriceCents ?? 0) / 100,
    })),
    {
      correiosEnabled: prepared.settings.correiosEnabled,
      mototaxiEnabled: prepared.settings.mototaxiEnabled,
      storePickupEnabled: prepared.settings.storePickupEnabled,
      mototaxiPrice: Number(prepared.settings.mototaxiPrice),
      storeAddress: prepared.settings.storeAddress,
      storeCity: prepared.settings.storeCity,
      storeState: prepared.settings.storeState,
      storeZipCode: prepared.settings.storeZipCode,
      packageWeight: prepared.settings.shippingPackageWeight ? Number(prepared.settings.shippingPackageWeight) : null,
      packageHeight: prepared.settings.shippingPackageHeight ? Number(prepared.settings.shippingPackageHeight) : null,
      packageWidth: prepared.settings.shippingPackageWidth ? Number(prepared.settings.shippingPackageWidth) : null,
      packageLength: prepared.settings.shippingPackageLength ? Number(prepared.settings.shippingPackageLength) : null,
      handlingDays: prepared.settings.shippingHandlingDays,
    },
    prepared.address ? { city: prepared.address.city, state: prepared.address.state } : undefined
  );

  const requestedOptionId = normalizedOptionId(input);
  if (!requestedOptionId) {
    throw new CheckoutError(
      "Identifique a opção de frete selecionada.",
      422,
      "SHIPPING_OPTION_REQUIRED"
    );
  }
  const selectedShipping = shippingOptions.find(
    (option) =>
      option.id === requestedOptionId &&
      option.type === input.shippingType &&
      option.available
  );
  if (!selectedShipping) {
    throw new CheckoutError(
      "A opção de entrega selecionada não está disponível. Calcule o frete novamente.",
      409,
      "SHIPPING_OPTION_UNAVAILABLE"
    );
  }

  let created: CheckoutOrder;
  try {
    created = await prisma.$transaction(
      async (tx) => {
        const current = await getContext(tx, customerId, input, options);
        if (shippingContextSignature(current) !== preparedSignature) {
          throw new CheckoutError(
            "O carrinho ou a entrega mudou. Calcule o frete novamente.",
            409,
            "SHIPPING_QUOTE_STALE"
          );
        }

        const currentItems = priceCart(current.cart.items);
        const currentSubtotalCents = currentItems.reduce(
          (sum, item) => sum + item.totalPriceCents,
          0
        );
        const discountCents = calculateCouponDiscountCents(
          currentSubtotalCents,
          current.coupon
        );
        const shippingCents = Math.round(selectedShipping.price * 100);
        const totalCents = currentSubtotalCents + shippingCents - discountCents;
        if (totalCents <= 0) {
          throw new CheckoutError(
            "O total do pedido deve ser positivo para gerar o Pix.",
            422,
            "NON_POSITIVE_ORDER_TOTAL"
          );
        }
        const hash = requestHash(customerId, input, currentItems);

        const raced = await tx.order.findUnique({
          where: { checkoutIdempotencyKey: input.idempotencyKey },
          select: { id: true },
        });
        if (raced) {
          throw new CheckoutError(
            "A solicitação já está sendo processada. Tente novamente.",
            409,
            "IDEMPOTENCY_RACE"
          );
        }

        if (current.coupon) {
          const couponUpdated = await tx.coupon.updateMany({
            where: { id: current.coupon.id, usedCount: current.coupon.usedCount },
            data: { usedCount: { increment: 1 } },
          });
          if (couponUpdated.count !== 1) {
            throw new CheckoutError(
              "O cupom foi utilizado simultaneamente. Tente novamente.",
              409,
              "COUPON_CONFLICT"
            );
          }
        }

        const order = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            status: OrderStatus.PAGAMENTO_PENDENTE,
            customerId,
            addressId: input.addressId ?? null,
            shippingStreet: current.address?.street ?? null,
            shippingNumber: current.address?.number ?? null,
            shippingComplement: current.address?.complement ?? null,
            shippingNeighborhood: current.address?.neighborhood ?? null,
            shippingCity: current.address?.city ?? null,
            shippingState: current.address?.state ?? null,
            shippingZipCode: current.address?.zipCode ?? null,
            recipientName: current.address?.recipientName ?? current.customer.name ?? null,
            recipientPhone: current.address?.recipientPhone ?? current.customer.phone ?? null,
            shippingOptionId: selectedShipping.id,
            shippingServiceName: selectedShipping.name,
            shippingEstimatedDays: selectedShipping.estimatedDays ?? null,
            shippingQuotedAt: new Date(),
            couponId: current.coupon?.id,
            shippingType: input.shippingType,
            shippingPrice: centsToDecimal(shippingCents),
            subtotal: centsToDecimal(currentSubtotalCents),
            discount: centsToDecimal(discountCents),
            total: centsToDecimal(totalCents),
            notes: input.notes?.trim() || null,
            checkoutIdempotencyKey: input.idempotencyKey,
            checkoutRequestHash: hash,
            items: {
              create: currentItems.map((item) => {
                const source = current.cart.items.find(
                  (cartItem) => cartItem.id === item.cartItemId
                )!;
                return {
                  productId: item.productId,
                  variationId: item.variationId,
                  productName: item.productName,
                  productImage: source.product.images[0]?.url,
                  variationName: item.variationName,
                  quantity: item.quantity,
                  unitPrice: centsToDecimal(item.unitPriceCents),
                  totalPrice: centsToDecimal(item.totalPriceCents),
                };
              }),
            },
            payment: {
              create: {
                provider: PaymentProvider.ASAAS,
                method:
                  requestedMethod === "CREDIT_CARD"
                    ? PaymentMethod.CARTAO_CREDITO
                    : requestedMethod === "BOLETO"
                      ? PaymentMethod.BOLETO
                      : PaymentMethod.PIX,
                status: PaymentStatus.AGUARDANDO,
                amount: centsToDecimal(totalCents),
                externalReference: null,
                idempotencyKey: null,
                installmentCount: requestedInstallments,
              },
            },
            statusHistory: {
              create: {
                status: OrderStatus.PAGAMENTO_PENDENTE,
                note: "Pedido criado; geração da cobrança pendente.",
              },
            },
          },
          include: orderInclude,
        });

        await tx.cartItem.deleteMany({
          where: {
            cartId: current.cart.id,
            id: { in: currentItems.map((item) => item.cartItemId) },
          },
        });

        return order;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    const winner = await findExisting(input.idempotencyKey);
    if (winner) {
      assertIdempotentMatch(winner, customerId, input);
      created = winner;
    } else {
      throw error;
    }
  }

  return ensurePayment(created, paymentService);
}
