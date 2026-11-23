import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { googlePlayProductWhere, toGooglePlayPublicData } from "@/lib/google-play-distribution";
import { apiError, apiSuccess } from "@/lib/utils";
import { belongsToCatalogGallery, isQuarantinedCatalogPhoto, visibleCatalogPhotos } from "@/lib/catalog-photo";

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
  images: { url: string }[];
  variations: { id: string; priceModifier: unknown; stock: number; imageUrl: string | null }[];
}>(product: T) {
  return {
    ...product,
    price: Number(product.price),
    images: product.images.filter(({ url }) => !isQuarantinedCatalogPhoto(url, product.id)),
    variations: product.variations.map((variation) => ({
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

    return apiSuccess(toGooglePlayPublicData({
      product: serialize(product),
      related: related.map(serialize),
    }));
  } catch {
    return apiError("Erro ao buscar produto.", 500);
  }
}
