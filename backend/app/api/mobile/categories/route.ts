import { prisma } from "@/lib/prisma";
import {
  googlePlayCategoryWhere,
  googlePlayProductWhere,
  toGooglePlayPublicData,
} from "@/lib/google-play-distribution";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: googlePlayCategoryWhere({ parentId: null }),
      orderBy: { order: "asc" },
      include: {
        children: {
          where: googlePlayCategoryWhere(),
          orderBy: { order: "asc" },
        },
      },
    });

    const [categoryCounts, subcategoryCounts] = await Promise.all([
      prisma.product.groupBy({
        by: ["categoryId"],
        where: googlePlayProductWhere({ images: { some: {} } }),
        _count: { _all: true },
      }),
      prisma.product.groupBy({
        by: ["subcategoryId"],
        where: googlePlayProductWhere({
          subcategoryId: { not: null },
          images: { some: {} },
        }),
        _count: { _all: true },
      }),
    ]);

    const byCategory = new Map(
      categoryCounts.map((entry) => [entry.categoryId, entry._count._all])
    );
    const bySubcategory = new Map(
      subcategoryCounts
        .filter((entry) => entry.subcategoryId)
        .map((entry) => [entry.subcategoryId as string, entry._count._all])
    );

    return apiSuccess(
      toGooglePlayPublicData(categories.map((category) => ({
        ...category,
        mobileProductCount: byCategory.get(category.id) ?? 0,
        children: category.children.map((child) => ({
          ...child,
          mobileProductCount: bySubcategory.get(child.id) ?? 0,
        })),
      })))
    );
  } catch {
    return apiError("Erro ao buscar categorias.", 500);
  }
}
