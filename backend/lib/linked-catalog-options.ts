import type { Prisma } from "@prisma/client";
import groups from "@/data/linked-catalog-options.json";
import { officialDatabaseGallery } from "@/lib/catalog-photo";
import { catalogPurchaseBlocked } from "@/lib/catalog-purchase-mode";
import { prisma } from "@/lib/prisma";

export async function linkedCatalogOptions(productId: string, mobileScope?: Prisma.ProductWhereInput) {
  const group = groups.find(({ options }) => options.some((option) => option.id === productId));
  if (!group || (mobileScope && group.webOnly)) return [];

  const products = await prisma.product.findMany({
    where: { AND: [{ id: { in: group.options.map(({ id }) => id) }, active: true }, mobileScope ?? {}] },
    select: {
      id: true, sku: true, slug: true, stock: true, purchaseMode: true,
      _count: { select: { variations: { where: { active: true } } } },
      images: { orderBy: [{ order: "asc" }, { id: "asc" }], select: { url: true } },
    },
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  const options = group.options.flatMap(({ id, sku, label, photo }) => {
    const product = byId.get(id);
    if (!product || product.sku !== sku || product._count.variations ||
        catalogPurchaseBlocked(product.purchaseMode, product._count.variations)) return [];
    const gallery = officialDatabaseGallery(product.images.map(({ url }) => url), id, sku);
    if (!gallery.includes(photo)) return [];
    return [{
      id, label, slug: product.slug, available: product.stock > 0,
      imageUrl: photo,
    }];
  });
  return options.length > 1 && options.some(({ id }) => id === productId) ? options : [];
}
