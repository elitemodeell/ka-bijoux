import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  linkedCatalogOptions: vi.fn(),
  findBlingProductForSource: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { product: { findFirst: mocks.findFirst, findMany: mocks.findMany } },
}));
vi.mock("@/lib/google-play-distribution", () => ({
  googlePlayProductWhere: (where: unknown) => where,
  toGooglePlayPublicData: (value: unknown) => value,
}));
vi.mock("@/lib/linked-catalog-options", () => ({ linkedCatalogOptions: mocks.linkedCatalogOptions }));
vi.mock("@/lib/bling-catalog", () => ({ findBlingProductForSource: mocks.findBlingProductForSource }));

import { GET } from "@/app/api/mobile/products/[id]/route";

const product = {
  id: "product-blue",
  slug: "blue",
  name: "Case blue",
  sku: "3104000005587",
  price: 12,
  promotionalPrice: null,
  stock: 1,
  sharedVariationStock: false,
  purchaseMode: null,
  images: [{ url: "https://cdn.example/case-3104000005587.webp" }],
  variations: [],
  category: null,
  subcategory: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findFirst.mockResolvedValue(product);
  mocks.findMany.mockResolvedValue([]);
  mocks.findBlingProductForSource.mockImplementation(({ sku }: { sku?: string | null }) => ({
    sku,
    active: true,
    price: 12,
    stock: 5,
  }));
});

function request() {
  return new NextRequest("http://localhost/api/mobile/products/product-blue");
}

describe("mobile linked option without confirmed photo", () => {
  it("hides the product until the linked option has an approved official photo", async () => {
    mocks.linkedCatalogOptions.mockResolvedValue([
      { id: product.id, label: "Azul escuro", available: false, imageUrl: null, price: 12 },
    ]);

    const response = await GET(request(), { params: Promise.resolve({ id: product.id }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.data).toBeUndefined();
  });

  it("keeps a linked option purchasable when it has a confirmed official photo", async () => {
    mocks.linkedCatalogOptions.mockResolvedValue([
      { id: product.id, label: "Azul escuro", available: true, imageUrl: "https://cdn.example/confirmed.webp", price: 12 },
    ]);

    const response = await GET(request(), { params: Promise.resolve({ id: product.id }) });
    const body = await response.json();

    expect(body.data.product.stock).toBe(1);
    expect(body.data.product.purchaseReviewRequired).toBe(false);
  });
});
