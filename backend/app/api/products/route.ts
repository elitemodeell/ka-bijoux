export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { Prisma, ProductEnrichmentStatus, ProductImportSource } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError, paginate, slugify } from "@/lib/utils";

const productInclude = {
  category: true,
  subcategory: true,
  images: { orderBy: { order: "asc" as const } },
  variations: { where: { active: true } },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 20);
    const category = searchParams.get("category") ?? searchParams.get("cat");
    const subcategory = searchParams.get("subcategory");
    const search = searchParams.get("q");
    const featured = searchParams.get("featured") === "true";
    const isNew = searchParams.get("new") === "true";
    const promo = searchParams.get("promo") === "true";
    const sort = searchParams.get("sort") ?? searchParams.get("ordem") ?? "createdAt";
    const exactPrice = searchParams.get("price");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    const where: Prisma.ProductWhereInput = { active: true };
    if (category) where.category = { slug: category };
    if (subcategory) where.subcategory = { slug: subcategory };
    if (featured) where.featured = true;
    if (isNew) where.isNew = true;
    if (promo) where.promotionalPrice = { not: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }
    if (exactPrice && exactPrice !== "all") {
      where.price = { equals: Number(exactPrice) };
    } else if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price_asc" || sort === "menor-preco"
        ? { price: "asc" }
        : sort === "price_desc" || sort === "maior-preco"
          ? { price: "desc" }
          : sort === "best_sellers" || sort === "mais-vendidos"
            ? { soldCount: "desc" }
            : { createdAt: "desc" };

    const { skip, take } = paginate(page, pageSize);

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, include: productInclude, orderBy, skip, take }),
      prisma.product.count({ where }),
    ]);

    return apiSuccess({
      products,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch {
    return apiError("Erro ao buscar produtos.", 500);
  }
}

const imageSchema = z.object({
  url: z.string().min(1),
  alt: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

const variationSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  stock: z.number().int().min(0).default(0),
  priceModifier: z.number().default(0),
  active: z.boolean().default(true),
});

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(3),
  brand: z.string().trim().optional().nullable(),
  ean: z.string().trim().optional().nullable(),
  benefits: z.string().trim().optional().nullable(),
  howToUse: z.string().trim().optional().nullable(),
  composition: z.string().trim().optional().nullable(),
  careInstructions: z.string().trim().optional().nullable(),
  packageContents: z.string().trim().optional().nullable(),
  price: z.number().positive(),
  promotionalPrice: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0),
  minStock: z.number().int().min(0).default(5),
  weight: z.number().positive(),
  height: z.number().positive(),
  width: z.number().positive(),
  length: z.number().positive(),
  categoryId: z.string(),
  subcategoryId: z.string().optional().nullable(),
  sku: z.string().trim().optional().nullable(),
  blingId: z.string().trim().optional().nullable(),
  importSource: z.nativeEnum(ProductImportSource).optional(),
  enrichmentStatus: z.nativeEnum(ProductEnrichmentStatus).optional(),
  featured: z.boolean().default(false),
  isNew: z.boolean().default(true),
  active: z.boolean().default(true),
  images: z.array(imageSchema).default([]),
  variations: z.array(variationSchema).default([]),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const data = createSchema.parse(body);

    const slug = slugify(data.name);
    const existing = await prisma.product.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;
    const importSource = data.importSource ?? (data.blingId ? ProductImportSource.BLING : ProductImportSource.MANUAL);

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: finalSlug,
        description: data.description,
        brand: data.brand || null,
        ean: data.ean || null,
        benefits: data.benefits || null,
        howToUse: data.howToUse || null,
        composition: data.composition || null,
        careInstructions: data.careInstructions || null,
        packageContents: data.packageContents || null,
        price: data.price,
        promotionalPrice: data.promotionalPrice,
        stock: data.stock,
        minStock: data.minStock,
        weight: data.weight,
        height: data.height,
        width: data.width,
        length: data.length,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId || null,
        sku: data.sku || null,
        blingId: data.blingId || null,
        importSource,
        enrichmentStatus:
          data.enrichmentStatus ??
          (importSource === ProductImportSource.BLING
            ? ProductEnrichmentStatus.PENDING_RESEARCH
            : ProductEnrichmentStatus.NOT_REQUIRED),
        importedAt: importSource === ProductImportSource.BLING ? new Date() : null,
        featured: data.featured,
        isNew: data.isNew,
        active: data.active,
        images: data.images.length
          ? {
              create: data.images.map((image, index) => ({
                url: image.url,
                alt: image.alt || data.name,
                order: image.order ?? index,
              })),
            }
          : undefined,
        variations: data.variations.length
          ? {
              create: data.variations.map((variation) => ({
                name: variation.name,
                value: variation.value,
                stock: variation.stock,
                priceModifier: variation.priceModifier,
                active: variation.active,
              })),
            }
          : undefined,
      },
      include: productInclude,
    });

    return apiSuccess(product, 201);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro ao criar produto.", 500);
  }
}
