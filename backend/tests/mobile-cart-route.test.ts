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
  cartItemAggregate: vi.fn(),
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
      cartItem: { findFirst: mocks.cartItemFindFirst, update: mocks.cartItemUpdate, create: mocks.cartItemCreate, deleteMany: mocks.cartItemDeleteMany, aggregate: mocks.cartItemAggregate },
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
  mocks.productFindFirst.mockResolvedValue({ id: "product-1", price: 10, promotionalPrice: null, stock: 5, variations: [], images: [{ url: "/fixtures/cover.png" }] });
  mocks.cartUpsert.mockResolvedValue({ id: "cart-1" });
  mocks.cartItemAggregate.mockResolvedValue({ _sum: { quantity: 0 } });
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

  it("rejects the legacy destructive purchase mode without touching the cart", async () => {
    const response = await POST(request({ productId: "product-1", mode: "BUY_NOW" }));
    expect(response.status).toBe(409);
    expect(mocks.cartUpsert).not.toHaveBeenCalled();
    expect(mocks.cartItemDeleteMany).not.toHaveBeenCalled();
  });

  it("rejects a product without an official photo before creating a cart line", async () => {
    mocks.productFindFirst.mockResolvedValue({ id: "product-1", price: 10, stock: 5, variations: [], images: [] });
    const response = await POST(request({ productId: "product-1" }));
    expect(response.status).toBe(409);
    expect(mocks.cartUpsert).not.toHaveBeenCalled();
    expect(mocks.cartItemCreate).not.toHaveBeenCalled();
  });

  it("previews only the latest photo and quantity without writing to the normal cart", async () => {
    const images = ["/fixtures/photo-2.png", "/fixtures/photo-5.png"].map((url) => ({ url }));
    mocks.productFindFirst.mockResolvedValue({ id: "product-1", name: "Fonte", active: true, price: 10, promotionalPrice: null, stock: 5, variations: [], images });
    for (const { url } of images) {
      const response = await POST(request({ productId: "product-1", mode: "DIRECT", selectedPhotoUrl: url, quantity: 1 }));
      expect(response.status).toBe(200);
      expect((await response.json()).data).toMatchObject({ productId: "product-1", quantity: 1, selectedPhotoUrl: url });
    }
    expect(mocks.cartUpsert).not.toHaveBeenCalled();
    expect(mocks.cartItemCreate).not.toHaveBeenCalled();
    expect(mocks.cartItemDeleteMany).not.toHaveBeenCalled();
  });

  it.each([1, 2, 3, 4, 5])("persists gallery photo %i on the unique commercial line", async (index) => {
    const images = [1, 2, 3, 4, 5].map((number) => ({ url: `/fixtures/photo-${number}.png` }));
    const selectedPhotoUrl = images[index - 1].url;
    mocks.productFindFirst.mockResolvedValue({ id: "product-1", price: 10, stock: 5, variations: [], images });
    mocks.cartItemFindFirst.mockResolvedValue({ id: "item-1", quantity: 4 });

    const response = await POST(request({ productId: "product-1", mode: "INCREMENT", selectedPhotoUrl }));

    expect(response.status).toBe(201);
    expect(mocks.cartItemUpdate).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { quantity: 5, unitPrice: 10 },
    });
    expect(mocks.cartItemFindFirst).toHaveBeenCalledWith({
      where: { cartId: "cart-1", productId: "product-1", variationId: null, selectedPhotoUrl },
    });
  });

  it("adds a second photo as a distinct line and counts the first line against the same stock", async () => {
    const photos = ["/fixtures/photo-2.png", "/fixtures/photo-5.png"];
    mocks.productFindFirst.mockResolvedValue({
      id: "product-1", price: 10, stock: 2, variations: [],
      images: photos.map((url) => ({ url })),
    });
    mocks.cartItemFindFirst.mockResolvedValue(null);
    mocks.cartItemAggregate.mockResolvedValueOnce({ _sum: { quantity: 0 } })
      .mockResolvedValueOnce({ _sum: { quantity: 1 } });

    for (const selectedPhotoUrl of photos) {
      expect((await POST(request({ productId: "product-1", mode: "INCREMENT", selectedPhotoUrl }))).status).toBe(201);
    }

    expect(mocks.cartItemCreate.mock.calls.map(([{ data }]) => [data.selectedPhotoUrl, data.quantity]))
      .toEqual(photos.map((photo) => [photo, 1]));
    expect(mocks.cartItemDeleteMany).not.toHaveBeenCalled();
    mocks.cartItemAggregate.mockResolvedValue({ _sum: { quantity: 2 } });
    expect((await POST(request({ productId: "product-1", selectedPhotoUrl: photos[1] }))).status).toBe(409);
  });

  it("rejects a photograph from a different product before mutating the cart", async () => {
    mocks.productFindFirst.mockResolvedValue({ id: "product-1", price: 10, stock: 5, variations: [], images: [] });
    const response = await POST(request({ productId: "product-1", mode: "INCREMENT", selectedPhotoUrl: "/other.png" }));
    expect(response.status).toBe(422);
    expect(mocks.cartItemDeleteMany).not.toHaveBeenCalled();
    expect(mocks.cartItemUpdate).not.toHaveBeenCalled();
  });

  it("rejects a quantity above server-side stock", async () => {
    mocks.cartItemFindFirst.mockResolvedValue({ id: "item-1", quantity: 5 });
    const response = await POST(request({ productId: "product-1", quantity: 1, mode: "INCREMENT" }));
    expect(response.status).toBe(409);
    expect(mocks.cartItemUpdate).not.toHaveBeenCalled();
  });
});
