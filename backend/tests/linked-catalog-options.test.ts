import { describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: { findMany } } }));

import { linkedCatalogOptionLabel, linkedCatalogOptions } from "@/lib/linked-catalog-options";
import groups from "@/data/linked-catalog-options.json";

const [light, dark] = groups[0].options.map(({ id, sku, label, photo }, index) => ({
  id, sku, label, slug: sku, stock: index ? 0 : 2, purchaseMode: null,
  price: 12, promotionalPrice: index ? null : 10,
  _count: { variations: 0 }, images: [{ url: photo }],
}));

describe("linked catalog options", () => {
  it("keeps each option on its own product, image and availability", async () => {
    findMany.mockResolvedValue([light, dark]);
    const options = await linkedCatalogOptions(light.id);
    expect(options).toEqual([
      { id: light.id, label: light.label, slug: light.slug, available: true, imageUrl: light.images[0].url, price: 10 },
      { id: dark.id, label: dark.label, slug: dark.slug, available: false, imageUrl: dark.images[0].url, price: 12 },
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

  it("keeps the confirmed option available by text when its photo is no longer attached", async () => {
    findMany.mockResolvedValue([light, { ...dark, images: light.images }]);
    expect(await linkedCatalogOptions(light.id)).toMatchObject([
      { id: light.id, imageUrl: light.images[0].url },
      { id: dark.id, imageUrl: null, available: false },
    ]);
  });

  it("never offers an option for sale without its confirmed photo, even with positive stock", async () => {
    findMany.mockResolvedValue([light, { ...dark, stock: 8, images: [] }]);
    expect(await linkedCatalogOptions(light.id)).toMatchObject([
      { id: light.id, imageUrl: light.images[0].url, available: true },
      { id: dark.id, imageUrl: null, available: false },
    ]);
  });

  it("uses an approved replacement cover stored under the exact product", async () => {
    const url = `https://sxohqngzypmxtmuulfoa.supabase.co/storage/v1/object/public/products/catalog/products/${light.id}/gallery/approved.webp`;
    findMany.mockResolvedValue([{ ...light, images: [{ url }, ...light.images] }, dark]);
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
