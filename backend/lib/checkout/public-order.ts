type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" ? (value as JsonObject) : null;
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function paymentArtifactsAreTrusted(payment: JsonObject): boolean {
  const expectedAccountId = process.env.ASAAS_EXPECTED_WALLET_ID?.trim();
  const configuredEnvironment = process.env.ASAAS_ENVIRONMENT?.trim();
  const expectedEnvironment =
    configuredEnvironment === "production"
      ? "PRODUCTION"
      : configuredEnvironment === "sandbox"
        ? "SANDBOX"
        : null;
  return Boolean(
    expectedAccountId &&
      expectedEnvironment &&
      payment.provider === "ASAAS" &&
      payment.providerAccountId === expectedAccountId &&
      payment.environment === expectedEnvironment
  );
}

export function toPublicOrder(orderValue: unknown) {
  const order = asObject(orderValue);
  if (!order) return orderValue;

  const payment = asObject(order.payment);
  const exposePaymentArtifacts = payment
    ? paymentArtifactsAreTrusted(payment)
    : false;
  const customer = asObject(order.customer);
  const items = Array.isArray(order.items) ? order.items : null;
  const {
    checkoutIdempotencyKey: _idempotencyKey,
    checkoutRequestHash: _requestHash,
    payment: _payment,
    customer: _customer,
    ...safeOrder
  } = order;

  return {
    ...safeOrder,
    subtotal: numberValue(order.subtotal),
    shippingPrice: numberValue(order.shippingPrice),
    discount: numberValue(order.discount),
    total: numberValue(order.total),
    items: items
      ? items.map((itemValue) => {
          const item = asObject(itemValue) ?? {};
          return {
            ...item,
            unitPrice: numberValue(item.unitPrice),
            totalPrice: numberValue(item.totalPrice),
          };
        })
      : order.items,
    customer: customer
      ? {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        }
      : undefined,
    payment: payment
      ? {
          id: payment.id,
          method: payment.method,
          status: payment.status,
          provider: payment.provider,
          amount: numberValue(payment.amount),
          installmentCount: payment.installmentCount,
          installmentValue: numberValue(payment.installmentValue),
          checkoutUrl: exposePaymentArtifacts ? payment.checkoutUrl : null,
          checkoutExpiration: payment.checkoutExpiration,
          boletoUrl: exposePaymentArtifacts ? payment.boletoUrl : null,
          boletoDigitableLine: exposePaymentArtifacts
            ? payment.boletoDigitableLine
            : null,
          boletoExpiration: payment.boletoExpiration,
          pixCode: exposePaymentArtifacts ? payment.pixCode : null,
          pixQrCode: exposePaymentArtifacts ? payment.pixQrCode : null,
          pixExpiration: payment.pixExpiration,
          paidAt: payment.paidAt,
          refundedAt: payment.refundedAt,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        }
      : null,
  };
}
