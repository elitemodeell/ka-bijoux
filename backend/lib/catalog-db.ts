import type { PrismaClient } from "@prisma/client";
import { CATALOG_CATEGORIES } from "@/lib/catalog";

export async function ensureCatalogCategories(prisma: PrismaClient) {
  const parents = new Map<string, string>();

  for (const category of CATALOG_CATEGORIES) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        order: category.order,
        active: true,
        parentId: null,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        order: category.order,
        active: true,
      },
    });

    parents.set(category.slug, saved.id);
  }

  for (const category of CATALOG_CATEGORIES) {
    const parentId = parents.get(category.slug);
    if (!parentId || !category.subcategories?.length) continue;

    for (const subcategory of category.subcategories) {
      await prisma.category.upsert({
        where: { slug: subcategory.slug },
        update: {
          name: subcategory.name,
          description: subcategory.description,
          order: category.order,
          active: true,
          parentId,
        },
        create: {
          name: subcategory.name,
          slug: subcategory.slug,
          description: subcategory.description,
          order: category.order,
          active: true,
          parentId,
        },
      });
    }
  }
}
