import { describe, expect, it, vi } from "vitest";
import {
  CheckoutError,
  calculateCouponDiscountCents,
  createCheckoutRequestHash,
  priceCart,
  type CatalogCartItem,
  type CouponSnapshot,
} from "@/lib/checkout/domain";
import { isValidCpf, normalizeCpf } from "@/lib/checkout/cpf";
import linkedCatalog from "@/data/linked-catalog-options.json";

function cartItem(): CatalogCartItem {
  return {
    id: "cart-item-1",
    productId: "product-1",
    variationId: null,
    quantity: 2,
    product: {
      id: "product-1",
      name: "Produto seguro",
      active: true,
      price: "19.90",
      promotionalPrice: null,
      stock: 5,
    },
    variation: null,
  };
}

function expectCheckoutCode(action: () => unknown, code: string) {
  try {
    action();
    throw new Error(`Expected CheckoutError ${code}.`);
  } catch (error) {
    expect(error).toBeInstanceOf(CheckoutError);
    expect(error).toMatchObject({ code });
  }
}

it("requires a verified Bling SKU and independent stock for an option at checkout", () => {
  vi.stubEnv("KA_BLING_COMMERCIAL_ENFORCED", "true");
  try {
    const item = cartItem();
    expectCheckoutCode(() => priceCart([item]), "CATALOG_REVIEW_REQUIRED");
    Object.assign(item.product, { sku: "ERP-1", blingId: "100", blingVerifiedSku: "ERP-1" });
    expect(priceCart([item])[0].sku).toBe("ERP-1");
    item.variationId = "local-option";
    item.variation = { id: "local-option", productId: item.productId, sku: "ERP-2", active: true,
      stock: 2, name: "Cor", value: "Azul", priceModifier: 1 };
    expectCheckoutCode(() => priceCart([item]), "CATALOG_REVIEW_REQUIRED");
    Object.assign(item.variation, { blingId: "101", blingVerifiedSku: "ERP-2" });
    expect(priceCart([item])[0]).toMatchObject({ sku: "ERP-2", unitPriceCents: 2090 });
    item.product.sharedVariationStock = true;
    expectCheckoutCode(() => priceCart([item]), "CATALOG_REVIEW_REQUIRED");
  } finally {
    vi.unstubAllEnvs();
  }
});

function coupon(overrides: Partial<CouponSnapshot> = {}): CouponSnapshot {
  return {
    id: "coupon-1",
    code: "TESTE10",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minOrderValue: null,
    maxUses: null,
    usedCount: 0,
    active: true,
    expiresAt: null,
    ...overrides,
  };
}

describe("checkout catalog pricing", () => {
  it("keeps linked products with the same price as two commercial identities", () => {
    const covers = linkedCatalog.find(({ blingParentId }) => blingParentId === 16670012434)!;
    const items = covers.options.slice(0, 2).map(({ id, label, sku }, index) => ({
      ...cartItem(),
      id: `line-${index}`,
      productId: id,
      quantity: 1,
      product: { ...cartItem().product, id, name: label, sku, price: "12.00", stock: index + 1 },
    }));

    expect(priceCart(items).map(({ productId, sku, unitPriceCents }) => ({ productId, sku, unitPriceCents })))
      .toEqual(items.map(({ productId, product }) => ({ productId, sku: product.sku, unitPriceCents: 1200 })));
    items[0].quantity = 2;
    expectCheckoutCode(() => priceCart(items), "INSUFFICIENT_STOCK");
  });

  it("checks combined quantities for options that share a product balance", () => {
    const items = ["white", "black"].map((id) => {
      const item = cartItem();
      item.quantity = 2;
      item.product.sharedVariationStock = true;
      item.product.stock = 3;
      item.variationId = id;
      item.variation = {
        id, productId: item.productId, name: "Cor", value: id, sku: id, active: true, stock: 0, priceModifier: 0,
      };
      return item;
    });
    expectCheckoutCode(() => priceCart(items), "INSUFFICIENT_STOCK");
    items[1].quantity = 1;
    expect(priceCart(items).map(({ variationId, usesProductStock }) => ({ variationId, usesProductStock })))
      .toEqual([{ variationId: "white", usesProductStock: true }, { variationId: "black", usesProductStock: true }]);
  });
  it("rejects an older cart line missing the now-required variation", () => {
    const item = cartItem();
    item.product._count = { variations: 2 };

    expectCheckoutCode(() => priceCart([item]), "VARIATION_REQUIRED");
  });

  it("rejects a selected option without a commercial SKU", () => {
    const item = cartItem();
    item.variationId = "option";
    item.variation = {
      id: "option", productId: item.productId, name: "Artista", value: "Opção A",
      sku: null, active: true, stock: 5, priceModifier: 0,
    };
    expectCheckoutCode(() => priceCart([item]), "VARIATION_SKU_REQUIRED");
  });

  it.each([
    ["Cor", "Rosa"],
    ["Modelo", "Universal B"],
    ["Tamanho", "G"],
    ["Estampa", "Floral"],
    ["Artista", "Opção A"],
    ["Cor e tamanho", "Rosa / G"],
  ])("prices an existing %s option without substituting a different variant", (name, value) => {
    const item = cartItem();
    item.variationId = "option";
    item.variation = {
      id: "option", productId: item.productId, name, value,
      sku: "sku-option", active: true, stock: 2, priceModifier: "1.00",
    };
    expect(priceCart([item])[0]).toMatchObject({
      variationId: "option", variationName: `${name}: ${value}`, unitPriceCents: 2090,
    });
    item.variation.productId = "another-product";
    expectCheckoutCode(() => priceCart([item]), "INACTIVE_VARIATION");
  });

  it("ignores an adulterated client price and uses the current catalog price", () => {
    const item = Object.assign(cartItem(), { clientUnitPrice: 0.01 });

    const [priced] = priceCart([item]);

    expect(priced.unitPriceCents).toBe(1_990);
    expect(priced.totalPriceCents).toBe(3_980);
  });

  it("[06] uses a price changed before checkout instead of a stale cart value", () => {
    const item = Object.assign(cartItem(), { staleUnitPrice: 19.9 });
    item.product.price = "24.50";

    const [priced] = priceCart([item]);

    expect(priced.unitPriceCents).toBe(2_450);
  });

  it("[05] rejects a product disabled before checkout", () => {
    const item = cartItem();
    item.product.active = false;

    expectCheckoutCode(() => priceCart([item]), "INACTIVE_PRODUCT");
  });

  it("[07] rejects a variation disabled before checkout", () => {
    const item = cartItem();
    item.variationId = "variation-1";
    item.variation = {
      id: "variation-1",
      productId: item.productId,
      name: "Cor",
      value: "Rosa",
      sku: "pink-disabled",
      active: false,
      stock: 5,
      priceModifier: 2,
    };

    expectCheckoutCode(() => priceCart([item]), "INACTIVE_VARIATION");
  });

  it("rejects a variation that belongs to a different product", () => {
    const item = cartItem();
    item.variationId = "variation-1";
    item.variation = {
      id: "variation-1",
      productId: "another-product",
      name: "Cor",
      value: "Rosa",
      sku: "pink-other",
      active: true,
      stock: 5,
      priceModifier: 2,
    };

    expectCheckoutCode(() => priceCart([item]), "INACTIVE_VARIATION");
  });

  it("[08] rejects insufficient stock observed before payment", () => {
    const item = cartItem();
    item.product.stock = 1;

    expectCheckoutCode(() => priceCart([item]), "INSUFFICIENT_STOCK");
  });

  it("rejects non-positive or fractional quantities", () => {
    const zero = cartItem();
    zero.quantity = 0;
    const fractional = cartItem();
    fractional.quantity = 1.5;

    expectCheckoutCode(() => priceCart([zero]), "INVALID_QUANTITY");
    expectCheckoutCode(() => priceCart([fractional]), "INVALID_QUANTITY");
  });

  it("uses promotional price and variation modifier from the current catalog", () => {
    const item = cartItem();
    item.quantity = 1;
    item.product.promotionalPrice = "15.00";
    item.variationId = "variation-1";
    item.variation = {
      id: "variation-1",
      productId: item.productId,
      name: "Tamanho",
      value: "G",
      sku: "size-g",
      active: true,
      stock: 2,
      priceModifier: "2.50",
    };

    expect(priceCart([item])[0]).toMatchObject({
      unitPriceCents: 1_750,
      totalPriceCents: 1_750,
      variationName: "Tamanho: G",
    });
  });
});

describe("checkout idempotency fingerprint", () => {
  const base = {
    customerId: "customer-1",
    addressId: "address-1",
    shippingType: "CORREIOS",
    shippingOptionId: "melhor-envio:1",
    couponCode: " teste10 ",
    notes: " entregar na portaria ",
    items: [
      { productId: "product-2", variationId: null, quantity: 1 },
      { productId: "product-1", variationId: "variation-1", quantity: 2 },
    ],
  };

  it("returns the same hash for a retry with semantically identical input", () => {
    const retry = {
      ...base,
      couponCode: "TESTE10",
      notes: "entregar na portaria",
      items: [...base.items].reverse(),
    };

    expect(createCheckoutRequestHash(retry)).toBe(createCheckoutRequestHash(base));
  });

  it("changes the hash when another customer reuses the checkout payload", () => {
    expect(createCheckoutRequestHash({ ...base, customerId: "customer-2" })).not.toBe(
      createCheckoutRequestHash(base)
    );
  });

  it("changes the hash when quantities or shipping selection change", () => {
    const quantityChanged = {
      ...base,
      items: [{ ...base.items[0], quantity: 2 }, base.items[1]],
    };
    const shippingChanged = { ...base, shippingOptionId: "melhor-envio:2" };

    expect(createCheckoutRequestHash(quantityChanged)).not.toBe(createCheckoutRequestHash(base));
    expect(createCheckoutRequestHash(shippingChanged)).not.toBe(createCheckoutRequestHash(base));
  });
});

describe("server-side coupon and customer document rules", () => {
  it("calculates a validated percentage discount in integer cents", () => {
    expect(calculateCouponDiscountCents(10_001, coupon())).toBe(1_000);
  });

  it("never allows a fixed discount to make the order total negative", () => {
    expect(
      calculateCouponDiscountCents(
        1_000,
        coupon({ discountType: "FIXED", discountValue: 999 })
      )
    ).toBe(1_000);
  });

  it("rejects expired and exhausted coupons", () => {
    expectCheckoutCode(
      () => calculateCouponDiscountCents(10_000, coupon({ expiresAt: new Date(0) })),
      "INVALID_COUPON"
    );
    expectCheckoutCode(
      () => calculateCouponDiscountCents(10_000, coupon({ maxUses: 1, usedCount: 1 })),
      "COUPON_EXHAUSTED"
    );
  });

  it("normalizes and validates CPF without accepting repeated digits", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });
});
