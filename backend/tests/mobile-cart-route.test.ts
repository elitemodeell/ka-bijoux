import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCustomer: vi.fn(),
  sanitizeCart: vi.fn(),
  cartTotals: vi.fn(() => ({ subtotal: 10, total: 10, itemCount: 1 })),
  productFindFirst: vi.fn(),
  cartItemFindFirst: vi.fn(),
  cartItemUpdate: vi.fn(),
  cartItemCreate: vi.fn(),
  cartItemDeleteMany: vi.fn(),
  cartUpsert: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireCustomer: mocks.requireCustomer }));
vi.mock("@/lib/google-play-cart", () => ({
  sanitizeGooglePlayCart: mocks.sanitizeCart,
  googlePlayCartTotals: mocks.cartTotals,
}));
vi.mock("@/lib/google-play-distribution", () => ({
  googlePlayProductWhere: (where: unknown) => where,
  toGooglePlayPublicData: (value: unknown) => value,
}));
vi.mock("@/lib/product-identity", () => ({ buildProductIdentityFilters: (id: string) => [{ id }] }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findFirst: mocks.productFindFirst },
    cartItem: { findFirst: mocks.cartItemFindFirst, update: mocks.cartItemUpdate, create: mocks.cartItemCreate },
    $transaction: async (callback: (tx: unknown) => unknown) => callback({
      cart: { upsert: mocks.cartUpsert },
      cartItem: { findFirst: mocks.cartItemFindFirst, update: mocks.cartItemUpdate, create: mocks.cartItemCreate, deleteMany: mocks.cartItemDeleteMany },
    }),
  },
}));

import { POST } from "@/app/api/mobile/cart/route";

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/mobile/cart", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCustomer.mockResolvedValue({ id: "customer-1" });
  mocks.productFindFirst.mockResolvedValue({ id: "product-1", price: 10, promotionalPrice: null, stock: 5, variations: [] });
  mocks.cartUpsert.mockResolvedValue({ id: "cart-1" });
  mocks.sanitizeCart.mockResolvedValue({ id: "cart-1", items: [] });
});

describe("mobile cart mutations", () => {
  it("increments an existing unique product/variation line exactly once", async () => {
    mocks.cartItemFindFirst.mockResolvedValue({ id: "item-1", quantity: 1 });
    const response = await POST(request({ productId: "product-1", quantity: 1, mode: "INCREMENT" }));
    expect(response.status).toBe(201);
    expect(mocks.sanitizeCart).toHaveBeenCalledTimes(1);
    expect(mocks.cartItemUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ quantity: 2 }) }));
  });

  it("uses SET for Comprar agora instead of accumulating the previous quantity", async () => {
    mocks.cartItemFindFirst.mockResolvedValue({ id: "item-1", quantity: 4 });
    const response = await POST(request({ productId: "product-1", quantity: 2, mode: "SET" }));
    expect(response.status).toBe(201);
    expect(mocks.cartItemUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ quantity: 2 }) }));
  });

  it("uses BUY_NOW to atomically keep only the selected product and quantity", async () => {
    mocks.cartItemFindFirst.mockResolvedValue({ id: "item-1", quantity: 4 });
    const response = await POST(request({ productId: "product-1", quantity: 1, mode: "BUY_NOW" }));
    expect(response.status).toBe(201);
    expect(mocks.cartItemDeleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ cartId: "cart-1" }),
    }));
    expect(mocks.cartItemUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ quantity: 1 }),
    }));
  });

  it("rejects a quantity above server-side stock", async () => {
    mocks.cartItemFindFirst.mockResolvedValue({ id: "item-1", quantity: 5 });
    const response = await POST(request({ productId: "product-1", quantity: 1, mode: "INCREMENT" }));
    expect(response.status).toBe(409);
    expect(mocks.cartItemUpdate).not.toHaveBeenCalled();
  });
});
