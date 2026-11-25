import type { Prisma } from "@prisma/client";
import groups from "@/data/linked-catalog-options.json";
import { isKaCatalogAsset, officialDatabaseGallery } from "@/lib/catalog-photo";
import { catalogPurchaseBlocked } from "@/lib/catalog-purchase-mode";
import { prisma } from "@/lib/prisma";
import { getValidPromotionalPrice } from "@/lib/store-rules";
import { findBlingProductForSource } from "@/lib/bling-catalog";

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
      id: true, sku: true, blingId: true, slug: true, stock: true, price: true, promotionalPrice: true, purchaseMode: true,
      category: { select: { slug: true } },
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
    const isAdult = product.category?.slug === "sex-shop";
    const bling = isAdult ? null : findBlingProductForSource({
      blingId: product.blingId,
      sku: product.sku,
      slug: product.slug,
    });
    if (!isAdult) {
      const promotionalPrice = Number(product.promotionalPrice ?? 0);
      if (!/^310400\d{7}$/.test(sku) || !bling || bling.sku !== sku || !bling.active ||
          Number(product.stock) <= 0 || Number(bling.stock) <= 0 ||
          Math.round(Number(product.price) * 100) !== Math.round(Number(bling.price) * 100) ||
          (promotionalPrice > 0 && promotionalPrice < Number(product.price)) || !imageUrl) return [];
    }
    const price = isAdult
      ? getValidPromotionalPrice(Number(product.price), product.promotionalPrice?.toString()) ?? Number(product.price)
      : Number(bling?.price ?? product.price);
    return [{
      id, label, slug: product.slug, available: isAdult || (product.stock > 0 && Number(bling?.stock ?? 0) > 0 && Boolean(imageUrl)),
      imageUrl,
      price,
    }];
  });
  return options.length > 1 && options.some(({ id }) => id === productId) ? options : [];
}
