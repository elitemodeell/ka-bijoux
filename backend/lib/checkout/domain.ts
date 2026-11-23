import { createHash } from "node:crypto";
import { catalogPurchaseBlocked, catalogReviewMessage } from "@/lib/catalog-purchase-mode";

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
  selectedPhotoUrl?: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku?: string | null;
    active: boolean;
    price: unknown;
    promotionalPrice: unknown | null;
    stock: number;
    sharedVariationStock?: boolean;
    purchaseMode?: string | null;
    _count?: { variations: number };
  };
  variation: {
    id: string;
    productId: string;
    name: string;
    value: string;
    sku: string | null;
    active: boolean;
    stock: number;
    priceModifier: unknown;
  } | null;
}

export interface PricedCheckoutItem {
  cartItemId: string;
  productId: string;
  variationId: string | null;
  selectedPhotoUrl?: string | null;
  usesProductStock: boolean;
  productName: string;
  variationName: string | null;
  sku: string | null;
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

function stockUnit(item: CatalogCartItem) {
  const variation = item.product.sharedVariationStock ? null : item.variationId;
  return JSON.stringify([item.productId, variation]);
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
    const stockKey = stockUnit(item);
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

    if (catalogPurchaseBlocked(item.product.purchaseMode, item.product._count?.variations ?? 0)) {
      throw new CheckoutError(catalogReviewMessage, 409, "CATALOG_REVIEW_REQUIRED");
    }
    let stock = item.product.stock;
    let modifierCents = 0;
    let variationName: string | null = null;

    if (!item.variationId && item.product._count?.variations) {
      throw new CheckoutError("Selecione uma variação do produto.", 422, "VARIATION_REQUIRED");
    }

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
      if (!item.product.sharedVariationStock) stock = item.variation.stock;
      if (!item.variation.sku?.trim()) {
        throw new CheckoutError("Esta opção está temporariamente indisponível.", 409, "VARIATION_SKU_REQUIRED");
      }
      modifierCents = decimalToCents(item.variation.priceModifier);
      variationName = `${item.variation.name}: ${item.variation.value}`;
    }

    const stockKey = stockUnit(item);
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
      selectedPhotoUrl: item.selectedPhotoUrl,
      usesProductStock: Boolean(item.variationId && item.product.sharedVariationStock),
      productName: item.product.name,
      variationName,
      sku: (item.variationId ? item.variation?.sku : item.product.sku) ?? null,
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
  items: Array<{ productId: string; variationId?: string | null; selectedPhotoUrl?: string | null; quantity: number }>;
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
        ...(item.selectedPhotoUrl ? { selectedPhotoUrl: item.selectedPhotoUrl } : {}),
        quantity: item.quantity,
      }))
      .sort((left, right) =>
        `${left.productId}:${left.variationId ?? ""}`.localeCompare(
          `${right.productId}:${right.variationId ?? ""}`
        ) || (left.selectedPhotoUrl ?? "").localeCompare(right.selectedPhotoUrl ?? "")
      ),
  };

  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
