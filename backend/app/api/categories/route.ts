export const revalidate = 300;

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureCatalogCategories } from "@/lib/catalog-db";
import { apiSuccess, apiError, slugify } from "@/lib/utils";

export async function GET() {
  try {
    await ensureCatalogCategories(prisma);

    const categories = await prisma.category.findMany({
      where: { active: true, parentId: null },
      orderBy: { order: "asc" },
      include: {
        children: {
          where: { active: true },
          orderBy: { order: "asc" },
          include: {
            _count: { select: { subcategoryProducts: { where: { active: true } } } },
          },
        },
        _count: { select: { products: { where: { active: true } } } },
      },
    });

    const [categoryCounts, subcategoryCounts] = await Promise.all([
      prisma.product.groupBy({
        by: ["categoryId"],
        where: { active: true, images: { some: {} } },
        _count: { _all: true },
      }),
      prisma.product.groupBy({
        by: ["subcategoryId"],
        where: { active: true, subcategoryId: { not: null }, images: { some: {} } },
        _count: { _all: true },
      }),
    ]);

    const countByCategory = new Map(categoryCounts.map((item) => [item.categoryId, item._count._all]));
    const countBySubcategory = new Map(
      subcategoryCounts
        .filter((item) => item.subcategoryId)
        .map((item) => [item.subcategoryId as string, item._count._all])
    );

    return apiSuccess(
      categories.map((category) => ({
        ...category,
        mobileProductCount: countByCategory.get(category.id) ?? 0,
        children: category.children.map((child) => ({
          ...child,
          mobileProductCount: countBySubcategory.get(child.id) ?? 0,
        })),
      }))
    );
  } catch {
    return apiError("Erro ao buscar categorias.", 500);
  }
}

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  parentId: z.string().optional().nullable(),
  order: z.number().int().default(0),
  active: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const data = createSchema.parse(body);

    const slug = slugify(data.name);
    const category = await prisma.category.create({
      data: {
        ...data,
        imageUrl: data.imageUrl || undefined,
        parentId: data.parentId || undefined,
        slug,
      },
    });

    return apiSuccess(category, 201);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro ao criar categoria.", 500);
  }
}
