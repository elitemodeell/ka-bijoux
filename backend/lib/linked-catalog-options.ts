import type { Prisma } from "@prisma/client";
import groups from "@/data/linked-catalog-options.json";
import { isKaCatalogAsset, officialDatabaseGallery } from "@/lib/catalog-photo";
import { catalogPurchaseBlocked } from "@/lib/catalog-purchase-mode";
import { prisma } from "@/lib/prisma";
import { getValidPromotionalPrice } from "@/lib/store-rules";

const optionsById = new Map(groups.flatMap(({ options }) => options).map((option) => [option.id, option]));
export function linkedCatalogOptionLabel(productId: string, sku?: string | null) {
  const option = optionsById.get(productId);
  return option && option.sku === sku ? option.label : null;
}

export async function linkedCatalogOptions(productId: string, mobileScope?: Prisma.ProductWhereInput) {
  const group = groups.find(({ options }) => options.some((option) => option.id === productId));
  if (!group || (mobileScope && group.webOnly)) return [];

  const products = await prisma.product.findMany({
    where: { AND: [{ id: { in: group.options.map(({ id }) => id) }, active: true }, mobileScope ?? {}] },
    select: {
      id: true, sku: true, slug: true, stock: true, price: true, promotionalPrice: true, purchaseMode: true,
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
    const cover = gallery[0];
    const managedCover = cover && isKaCatalogAsset(cover) && new URL(cover, "https://catalog.invalid").pathname
      .startsWith(`/storage/v1/object/public/products/catalog/products/${id}/gallery/`);
    const imageUrl = managedCover ? cover : gallery.includes(photo) ? photo : null;
    return [{
      id, label, slug: product.slug, available: product.stock > 0 && Boolean(imageUrl),
      imageUrl,
      price: getValidPromotionalPrice(Number(product.price), product.promotionalPrice?.toString()) ?? Number(product.price),
    }];
  });
  return options.length > 1 && options.some(({ id }) => id === productId) ? options : [];
}
