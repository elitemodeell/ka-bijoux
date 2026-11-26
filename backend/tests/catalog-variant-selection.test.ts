import { beforeEach, describe, expect, it, vi } from "vitest";

const { findBlingProductForSource } = vi.hoisted(() => ({ findBlingProductForSource: vi.fn() }));
vi.mock("@/lib/bling-catalog", () => ({ findBlingProductForSource }));
vi.mock("@/lib/catalog-photo", () => ({ isOfficialCatalogPhoto: (url: string | null | undefined) => Boolean(url) }));

import { catalogVariantsForSelection } from "@/lib/catalog-storefront-eligibility";

const candidate = {
  id: "family-1",
  price: 10,
  stock: 7,
  sharedVariationStock: false,
  variations: [
    { id: "red", name: "Cor", value: "Vermelho", sku: "3104000005582", stock: 2, priceModifier: 0, imageUrl: "/red.webp" },
    { id: "blue", name: "Cor", value: "Azul", sku: "3104000005583", stock: 5, priceModifier: 0, imageUrl: null },
    { id: "black", name: "Cor", value: "Preto", sku: "3104000005584", stock: 0, priceModifier: 0, imageUrl: "/black.webp" },
  ],
};

describe("catalog selector options", () => {
  beforeEach(() => {
    findBlingProductForSource.mockImplementation(({ sku }: { sku: string }) => ({
      sku,
      active: true,
      price: sku.endsWith("5582") ? 10 : 12,
      stock: sku.endsWith("5584") ? 0 : 5,
    }));
  });

  it("keeps active Bling SKUs in stable order and marks photo or stock gaps unavailable", () => {
    expect(catalogVariantsForSelection(candidate)).toMatchObject([
      { id: "red", value: "Vermelho", priceModifier: 0, stock: 2, available: true, imageUrl: "/red.webp" },
      { id: "blue", value: "Azul", priceModifier: 2, stock: 5, available: false, imageUrl: null },
      { id: "black", value: "Preto", priceModifier: 2, stock: 0, available: false, imageUrl: "/black.webp" },
    ]);
  });

  it("omits SKUs no longer active in Bling instead of turning them into local options", () => {
    findBlingProductForSource.mockImplementation(({ sku }: { sku: string }) => ({ sku, active: sku !== "3104000005583", price: 10, stock: 4 }));
    expect(catalogVariantsForSelection(candidate).map(({ id }) => id)).toEqual(["red", "black"]);
  });

  it("uses parent inventory only when all child options share one SKU", () => {
    const shared = { ...candidate, stock: 3, sharedVariationStock: true, variations: candidate.variations.map((variation) => ({ ...variation, sku: "3104000005582", stock: 0 })) };
    expect(catalogVariantsForSelection(shared).map(({ stock, available }) => ({ stock, available }))).toEqual([
      { stock: 3, available: true },
      { stock: 3, available: false },
      { stock: 3, available: true },
    ]);
  });
});
