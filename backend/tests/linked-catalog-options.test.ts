import { describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: { findMany } } }));

import { linkedCatalogOptions } from "@/lib/linked-catalog-options";
import groups from "@/data/linked-catalog-options.json";

const [light, dark] = groups[0].options.map(({ id, sku, label, photo }, index) => ({
  id, sku, label, slug: sku, stock: index ? 0 : 2, purchaseMode: null,
  _count: { variations: 0 }, images: [{ url: photo }],
}));

describe("linked catalog options", () => {
  it("keeps each option on its own product, image and availability", async () => {
    findMany.mockResolvedValue([light, dark]);
    const options = await linkedCatalogOptions(light.id);
    expect(options).toEqual([
      { id: light.id, label: light.label, slug: light.slug, available: true, imageUrl: light.images[0].url },
      { id: dark.id, label: dark.label, slug: dark.slug, available: false, imageUrl: dark.images[0].url },
    ]);
  });

  it("does not expose a sibling with a changed SKU or outside the channel", async () => {
    findMany.mockResolvedValueOnce([light, { ...dark, sku: "wrong" }]).mockResolvedValueOnce([light]);
    expect(await linkedCatalogOptions(light.id)).toEqual([]);
    expect(await linkedCatalogOptions(light.id, { active: true })).toEqual([]);
  });

  it("does not show an option if its confirmed photo is no longer attached", async () => {
    findMany.mockResolvedValue([light, { ...dark, images: light.images }]);
    expect(await linkedCatalogOptions(light.id)).toEqual([]);
  });
});
