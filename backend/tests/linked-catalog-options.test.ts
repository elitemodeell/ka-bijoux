import { describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: { findMany } } }));

import { linkedCatalogOptions } from "@/lib/linked-catalog-options";

const light = {
  id: "cmrw6xyqg000hxg38azx01rdv", sku: "3104000005585", slug: "silicone-ip11pro-azul-claro",
  stock: 2, purchaseMode: null, _count: { variations: 0 }, images: [{ url: "/uploads/products/azul-claro.png" }],
};
const dark = {
  id: "cmrwb2570000955o9g7nq7kzo", sku: "3104000005587", slug: "silicone-ip11pro-azul-escuro",
  stock: 0, purchaseMode: null, _count: { variations: 0 }, images: [{ url: "/uploads/products/azul-escuro.png" }],
};

describe("linked catalog options", () => {
  it("keeps each option on its own product, image and availability", async () => {
    findMany.mockResolvedValue([light, dark]);
    const options = await linkedCatalogOptions(light.id);
    expect(options).toEqual([
      { id: light.id, label: "Azul claro", slug: light.slug, available: true, imageUrl: light.images[0].url },
      { id: dark.id, label: "Azul escuro", slug: dark.slug, available: false, imageUrl: dark.images[0].url },
    ]);
  });

  it("does not expose a sibling with a changed SKU or outside the channel", async () => {
    findMany.mockResolvedValueOnce([light, { ...dark, sku: "wrong" }]).mockResolvedValueOnce([light]);
    expect(await linkedCatalogOptions(light.id)).toEqual([]);
    expect(await linkedCatalogOptions(light.id, { active: true })).toEqual([]);
  });
});
