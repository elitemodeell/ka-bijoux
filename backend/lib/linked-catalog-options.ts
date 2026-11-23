import type { Prisma } from "@prisma/client";
import { officialDatabaseGallery } from "@/lib/catalog-photo";
import { catalogPurchaseBlocked } from "@/lib/catalog-purchase-mode";
import { prisma } from "@/lib/prisma";

// Only reviewed links between existing KA Bijoux SKUs. Each SKU keeps its own pricing and inventory.
const groups = [
  [
    { id: "cmrw6xyqg000hxg38azx01rdv", sku: "3104000005585", label: "Azul claro" },
    { id: "cmrwb2570000955o9g7nq7kzo", sku: "3104000005587", label: "Azul escuro" },
    { id: "cmrw6xzpi000mxg38q8ptv0r8", sku: "3104000005583", label: "Vermelho" },
    { id: "cmrw6y08y000txg380h3hm6zx", sku: "3104000005582", label: "Vermelho aberta" },
  ],
  [
    { id: "cmr96n53t005f5zirr0ij0jsg", sku: "3104000005006", label: "Coração cristal" },
    { id: "cmr96n2ap00535zirg5gkkibp", sku: "3104000005008", label: "Coração roxo" },
  ],
];

export async function linkedCatalogOptions(productId: string, scope?: Prisma.ProductWhereInput) {
  const group = groups.find((options) => options.some((option) => option.id === productId));
  if (!group) return [];

  const products = await prisma.product.findMany({
    where: { AND: [{ id: { in: group.map(({ id }) => id) }, active: true }, scope ?? {}] },
    select: {
      id: true, sku: true, slug: true, stock: true, purchaseMode: true,
      _count: { select: { variations: { where: { active: true } } } },
      images: { orderBy: [{ order: "asc" }, { id: "asc" }], select: { url: true } },
    },
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  const options = group.flatMap(({ id, sku, label }) => {
    const product = byId.get(id);
    if (!product || product.sku !== sku || product._count.variations ||
        catalogPurchaseBlocked(product.purchaseMode, product._count.variations)) return [];
    return [{
      id, label, slug: product.slug, available: product.stock > 0,
      imageUrl: officialDatabaseGallery(product.images.map(({ url }) => url), id)[0] ?? null,
    }];
  });
  return options.length > 1 && options.some(({ id }) => id === productId) ? options : [];
}
