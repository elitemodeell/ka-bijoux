import { createHash } from "node:crypto";

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "CHECKOUT_INVALID"
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

export interface CatalogCartItem {
  id: string;
  productId: string;
  variationId: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    active: boolean;
    price: unknown;
    promotionalPrice: unknown | null;
    stock: number;
  };
  variation: {
    id: string;
    productId: string;
    name: string;
    value: string;
    active: boolean;
    stock: number;
    priceModifier: unknown;
  } | null;
}

export interface PricedCheckoutItem {
  cartItemId: string;
  productId: string;
  variationId: string | null;
  productName: string;
  variationName: string | null;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
}

export interface CouponSnapshot {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: unknown;
  minOrderValue: unknown | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: Date | null;
}

function decimalToCents(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw new CheckoutError("Preço inválido no catálogo.", 409, "INVALID_CATALOG_PRICE");
  }
  return Math.round((amount + Number.EPSILON) * 100);
}

export function centsToDecimal(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export function priceCart(items: CatalogCartItem[]): PricedCheckoutItem[] {
  if (items.length === 0) {
    throw new CheckoutError("Carrinho vazio.", 400, "EMPTY_CART");
  }

  const requestedByStockUnit = new Map<string, number>();
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new CheckoutError("Quantidade inválida no carrinho.", 409, "INVALID_QUANTITY");
    }
    const stockKey = `${item.productId}:${item.variationId ?? "__base__"}`;
    requestedByStockUnit.set(
      stockKey,
      (requestedByStockUnit.get(stockKey) ?? 0) + item.quantity
    );
  }

  return items.map((item) => {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new CheckoutError("Quantidade inválida no carrinho.", 409, "INVALID_QUANTITY");
    }
    if (!item.product.active) {
      throw new CheckoutError(
        `O produto "${item.product.name}" não está mais disponível.`,
        409,
        "INACTIVE_PRODUCT"
      );
    }

    let stock = item.product.stock;
    let modifierCents = 0;
    let variationName: string | null = null;

    if (item.variationId) {
      if (!item.variation || item.variation.id !== item.variationId) {
        throw new CheckoutError(
          `A variação de "${item.product.name}" não existe mais.`,
          409,
          "VARIATION_NOT_FOUND"
        );
      }
      if (item.variation.productId !== item.productId || !item.variation.active) {
        throw new CheckoutError(
          `A variação de "${item.product.name}" não está disponível.`,
          409,
          "INACTIVE_VARIATION"
        );
      }
      stock = item.variation.stock;
      modifierCents = decimalToCents(item.variation.priceModifier);
      variationName = `${item.variation.name}: ${item.variation.value}`;
    }

    const stockKey = `${item.productId}:${item.variationId ?? "__base__"}`;
    const requestedQuantity = requestedByStockUnit.get(stockKey) ?? item.quantity;
    if (stock < requestedQuantity) {
      throw new CheckoutError(
        `Produto "${item.product.name}" sem estoque suficiente.`,
        409,
        "INSUFFICIENT_STOCK"
      );
    }

    const baseValue =
      item.product.promotionalPrice === null
        ? item.product.price
        : item.product.promotionalPrice;
    const unitPriceCents = decimalToCents(baseValue) + modifierCents;
    if (unitPriceCents < 0) {
      throw new CheckoutError("Preço inválido no catálogo.", 409, "INVALID_CATALOG_PRICE");
    }

    return {
      cartItemId: item.id,
      productId: item.productId,
      variationId: item.variationId,
      productName: item.product.name,
      variationName,
      quantity: item.quantity,
      unitPriceCents,
      totalPriceCents: unitPriceCents * item.quantity,
    };
  });
}

export function calculateCouponDiscountCents(
  subtotalCents: number,
  coupon: CouponSnapshot | null,
  now = new Date()
): number {
  if (!coupon) return 0;
  if (!coupon.active || (coupon.expiresAt && coupon.expiresAt.getTime() <= now.getTime())) {
    throw new CheckoutError("Cupom inválido ou expirado.", 422, "INVALID_COUPON");
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new CheckoutError("Cupom esgotado.", 422, "COUPON_EXHAUSTED");
  }

  const minimumCents =
    coupon.minOrderValue === null ? 0 : decimalToCents(coupon.minOrderValue);
  if (subtotalCents < minimumCents) {
    throw new CheckoutError(
      "O valor mínimo para usar este cupom não foi atingido.",
      422,
      "COUPON_MINIMUM_NOT_MET"
    );
  }

  const value = Number(coupon.discountValue);
  if (!Number.isFinite(value) || value <= 0) {
    throw new CheckoutError("Cupom inválido.", 422, "INVALID_COUPON");
  }

  const discount =
    coupon.discountType === "PERCENTAGE"
      ? Math.round(subtotalCents * (Math.min(value, 100) / 100))
      : decimalToCents(coupon.discountValue);
  return Math.min(subtotalCents, Math.max(0, discount));
}

export interface CheckoutHashInput {
  customerId: string;
  addressId?: string | null;
  shippingType: string;
  shippingOptionId?: string | null;
  couponCode?: string | null;
  notes?: string | null;
  paymentMethod?: "PIX" | "CREDIT_CARD" | "BOLETO";
  installmentCount?: number;
  items: Array<{ productId: string; variationId?: string | null; quantity: number }>;
}

export function createCheckoutRequestHash(input: CheckoutHashInput): string {
  const canonical = {
    customerId: input.customerId,
    addressId: input.addressId ?? null,
    shippingType: input.shippingType,
    shippingOptionId: input.shippingOptionId ?? null,
    couponCode: input.couponCode?.trim().toUpperCase() || null,
    notes: input.notes?.trim() || null,
    paymentMethod: input.paymentMethod ?? "PIX",
    installmentCount: input.installmentCount ?? 1,
    items: input.items
      .map((item) => ({
        productId: item.productId,
        variationId: item.variationId ?? null,
        quantity: item.quantity,
      }))
      .sort((left, right) =>
        `${left.productId}:${left.variationId ?? ""}`.localeCompare(
          `${right.productId}:${right.variationId ?? ""}`
        )
      ),
  };

  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
