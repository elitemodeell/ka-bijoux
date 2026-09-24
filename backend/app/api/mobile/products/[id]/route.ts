import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { googlePlayProductWhere, toGooglePlayPublicData } from "@/lib/google-play-distribution";
import { apiError, apiSuccess } from "@/lib/utils";

const detailInclude = Prisma.validator<Prisma.ProductInclude>()({
  category: true,
  subcategory: true,
  images: { orderBy: { order: "asc" } },
  variations: { where: { active: true }, orderBy: { order: "asc" } },
});

function serialize<T extends {
  price: unknown;
  promotionalPrice: unknown;
}>(product: T) {
  return {
    ...product,
    price: Number(product.price),
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
        images: { orderBy: { order: "asc" }, take: 1 },
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
