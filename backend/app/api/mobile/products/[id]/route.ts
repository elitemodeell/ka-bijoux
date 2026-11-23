import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { googlePlayProductWhere, toGooglePlayPublicData } from "@/lib/google-play-distribution";
import { apiError, apiSuccess } from "@/lib/utils";
import { belongsToCatalogGallery, isQuarantinedCatalogPhoto, visibleCatalogPhotos } from "@/lib/catalog-photo";
import { catalogGalleryForPurchase, catalogPurchaseBlocked } from "@/lib/catalog-purchase-mode";
import { linkedCatalogOptions } from "@/lib/linked-catalog-options";

const detailInclude = Prisma.validator<Prisma.ProductInclude>()({
  category: true,
  subcategory: true,
  images: { where: visibleCatalogPhotos, orderBy: { order: "asc" } },
  variations: { where: { active: true }, orderBy: { order: "asc" } },
});

function serialize<T extends {
  price: unknown;
  id: string;
  promotionalPrice: unknown;
  stock: number;
  sharedVariationStock: boolean;
  purchaseMode: string | null;
  images: { url: string }[];
  variations: { id: string; priceModifier: unknown; stock: number; imageUrl: string | null }[];
}>(product: T) {
  const images = product.images.filter(({ url }) => !isQuarantinedCatalogPhoto(url, product.id));
  const purchaseReviewRequired = catalogPurchaseBlocked(product.purchaseMode, product.variations.length);
  return {
    ...product,
    price: Number(product.price),
    purchaseReviewRequired,
    stock: purchaseReviewRequired ? 0 : product.stock,
    images: catalogGalleryForPurchase(images, purchaseReviewRequired),
    variations: (purchaseReviewRequired ? [] : product.variations).map((variation) => ({
      ...variation,
      imageUrl: variation.imageUrl && belongsToCatalogGallery(variation.imageUrl, product.id, variation.id)
        ? variation.imageUrl
        : null,
      stock: product.sharedVariationStock ? product.stock : variation.stock,
      priceModifier: Number(variation.priceModifier),
    })),
    promotionalPrice: product.promotionalPrice
      ? Number(product.promotionalPrice)
      : null,
  };
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const product = await prisma.product.findFirst({
      where: googlePlayProductWhere({
        OR: [{ id: params.id }, { slug: params.id }],
      }),
      include: detailInclude,
    });

    if (!product) return apiError("Produto não encontrado.", 404);

    const related = await prisma.product.findMany({
      where: googlePlayProductWhere({
        categoryId: product.categoryId,
        id: { not: product.id },
      }),
      include: {
        category: true,
        subcategory: true,
        images: { where: visibleCatalogPhotos, orderBy: { order: "asc" }, take: 1 },
        variations: { where: { active: true }, orderBy: { order: "asc" } },
      },
      take: 6,
    });

    const linkedOptions = await linkedCatalogOptions(product.id, googlePlayProductWhere({}));
    return apiSuccess(toGooglePlayPublicData({
      product: { ...serialize(product), linkedOptions },
      related: related.map(serialize),
    }));
  } catch {
    return apiError("Erro ao buscar produto.", 500);
  }
}
