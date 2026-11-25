import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, findBlingProductForSource } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findBlingProductForSource: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { product: { findMany } } }));
vi.mock("@/lib/bling-catalog", () => ({ findBlingProductForSource }));

import { linkedCatalogOptionLabel, linkedCatalogOptions } from "@/lib/linked-catalog-options";
import groups from "@/data/linked-catalog-options.json";

const [light, dark] = groups[0].options.map(({ id, sku, label, photo }, index) => ({
  id, sku, label, slug: sku, stock: index ? 0 : 2, purchaseMode: null,
  price: 12, promotionalPrice: null,
  _count: { variations: 0 }, images: [{ url: photo }],
}));

describe("linked catalog options", () => {
  beforeEach(() => {
    findBlingProductForSource.mockImplementation(({ sku }: { sku?: string | null }) => ({
      sku,
      active: true,
      price: 12,
      stock: 10,
    }));
  });

  it("keeps each option on its own product, image and availability", async () => {
    findMany.mockResolvedValue([light, { ...dark, stock: 2 }]);
    const options = await linkedCatalogOptions(light.id);
    expect(options).toEqual([
      { id: light.id, label: light.label, slug: light.slug, available: true, imageUrl: light.images[0].url, price: 12 },
      { id: dark.id, label: dark.label, slug: dark.slug, available: true, imageUrl: dark.images[0].url, price: 12 },
    ]);
  });

  it("keeps the order label tied to the exact product and SKU", () => {
    expect(linkedCatalogOptionLabel(light.id, light.sku)).toBe(light.label);
    expect(linkedCatalogOptionLabel(light.id, dark.sku)).toBeNull();
  });

  it("does not expose a sibling with a changed SKU or outside the channel", async () => {
    findMany.mockResolvedValueOnce([light, { ...dark, sku: "wrong" }]).mockResolvedValueOnce([light]);
    expect(await linkedCatalogOptions(light.id)).toEqual([]);
    expect(await linkedCatalogOptions(light.id, { active: true })).toEqual([]);
  });

  it("does not expose a selector when only one linked option is currently sellable", async () => {
    findMany.mockResolvedValue([light, dark]);
    expect(await linkedCatalogOptions(light.id)).toEqual([]);
  });

  it("never offers an option for sale without its confirmed photo, even with positive stock", async () => {
    findMany.mockResolvedValue([light, { ...dark, stock: 8, images: [] }]);
    expect(await linkedCatalogOptions(light.id)).toEqual([]);
  });

  it("uses an approved replacement cover stored under the exact product", async () => {
    const url = `https://sxohqngzypmxtmuulfoa.supabase.co/storage/v1/object/public/products/catalog/products/${light.id}/gallery/approved.webp`;
    findMany.mockResolvedValue([{ ...light, images: [{ url }, ...light.images] }, { ...dark, stock: 2 }]);
    expect(await linkedCatalogOptions(light.id)).toMatchObject([{ id: light.id, imageUrl: url }, { id: dark.id }]);
  });

  it("keeps web-only families out of the mobile selector before querying products", async () => {
    findMany.mockClear();
    const options = groups.filter((group) => group.webOnly).flatMap((group) => group.options);
    expect(options).toHaveLength(12);
    for (const { id } of options) {
      expect(await linkedCatalogOptions(id, {})).toEqual([]);
    }
    expect(findMany).not.toHaveBeenCalled();
  });
});
