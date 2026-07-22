export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest } from "next/server";
import { Prisma, ProductEnrichmentStatus, ProductImportSource, ProductPublicationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError, paginate, slugify } from "@/lib/utils";
import { getPublicCategoryName } from "@/lib/catalog";
import {
  dedupeProductCards,
  findBlingProductForSource,
  getCanonicalProductSlug,
  getBlingProductCards,
  getProductIdentityKeys,
  isAdultImageUrl,
  type CatalogFilters,
  type ProductCardProduct,
} from "@/lib/bling-catalog";
import {
  getProductCatalogLine,
  matchesCatalogLine,
  type CatalogLine,
} from "@/lib/product-line";

const productInclude = {
  category: true,
  subcategory: true,
  images: { orderBy: { order: "asc" as const }, take: 1 },
  variations: { where: { active: true }, orderBy: { order: "asc" as const } },
};


const API_FETCH_LIMIT = 1000;
const DB_QUERY_TIMEOUT_MS = 5000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? 20) || 20));
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
    const withImage = searchParams.get("withImage") === "true";
    const catalogLine = getRequestedCatalogLine(searchParams, category, subcategory);
    const filters: CatalogFilters = {
      categorySlug: category,
      subcategorySlug: subcategory,
      query: search,
      featured,
      onlyNew: isNew,
      promo,
      sort,
      exactPrice,
      minPrice,
      maxPrice,
      requireImage: withImage,
      catalogLine,
    };

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
        { searchTags: { has: search } },
      ];
    }
    if (exactPrice && exactPrice !== "all") {
      where.price = { equals: Number(exactPrice) };
    } else if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }
    if (withImage) where.images = { some: {} };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price_asc" || sort === "menor-preco"
        ? { price: "asc" }
        : sort === "price_desc" || sort === "maior-preco"
          ? { price: "desc" }
          : sort === "best_sellers" || sort === "mais-vendidos"
            ? { soldCount: "desc" }
            : { createdAt: "desc" };

    const { skip, take } = paginate(page, pageSize);

    const products = await withTimeout(
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy,
        skip: 0,
        take: API_FETCH_LIMIT,
      }),
      DB_QUERY_TIMEOUT_MS
    );

    const dbProducts = products
      .map((product) => mapDbProductToCard(product))
      .filter((product): product is ProductCardProduct => Boolean(product))
      .filter((product) => !withImage || Boolean(product.image))
      .filter((product) => matchesCatalogLine(toProductLineSource(product), catalogLine));
    const merged = mergeWithBlingCatalog(dbProducts, filters);
    const pageProducts = merged.slice(skip, skip + take);

    return apiSuccess({
      products: pageProducts,
      total: merged.length,
      page,
      pageSize,
      totalPages: Math.ceil(merged.length / pageSize),
    });
  } catch {
    return apiSuccess(getFallbackProducts(req));
  }
}

function getFallbackProducts(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? 20) || 20));
  const { skip, take } = paginate(page, pageSize);
  const filters: CatalogFilters = {
    categorySlug: searchParams.get("category") ?? searchParams.get("cat"),
    subcategorySlug: searchParams.get("subcategory"),
    query: searchParams.get("q"),
    featured: searchParams.get("featured") === "true",
    onlyNew: searchParams.get("new") === "true",
    promo: searchParams.get("promo") === "true",
    sort: searchParams.get("sort") ?? searchParams.get("ordem") ?? "createdAt",
    exactPrice: searchParams.get("price"),
    minPrice: searchParams.get("minPrice"),
    maxPrice: searchParams.get("maxPrice"),
    requireImage: searchParams.get("withImage") === "true",
    catalogLine: getRequestedCatalogLine(
      searchParams,
      searchParams.get("category") ?? searchParams.get("cat"),
      searchParams.get("subcategory")
    ),
  };
  const products = getBlingProductCards(filters);

  return {
    products: products.slice(skip, skip + take),
    total: products.length,
    page,
    pageSize,
    totalPages: Math.ceil(products.length / pageSize),
  };
}

function mapDbProductToCard(product: Prisma.ProductGetPayload<{ include: typeof productInclude }>): ProductCardProduct | null {
  const bling = findBlingProductForSource({
    blingId: product.blingId,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
  });

  if (bling && (!bling.active || bling.stock <= 0)) return null;

  const isAdultCategory = product.category?.slug === "sex-shop";
  const rawDbImages = product.images.map((image) => ({ url: image.url, alt: image.alt ?? product.name }));
  const dbImages = isAdultCategory ? rawDbImages : rawDbImages.filter((i) => !isAdultImageUrl(i.url));
  const blingFallback = isAdultCategory
    ? (bling?.images ?? [])
    : (bling?.images ?? []).filter((i) => !isAdultImageUrl(i.url));
  const images = dbImages.length ? dbImages : blingFallback;
  const promotionalPrice = bling
    ? null
    : product.promotionalPrice
      ? Number(product.promotionalPrice)
      : null;
  const category = product.category
    ? { name: getPublicCategoryName(product.category), slug: product.category.slug }
    : bling?.category ?? null;
  const subcategory = product.subcategory
    ? { name: product.subcategory.name, slug: product.subcategory.slug }
    : bling?.subcategory ?? null;
  const catalogLine = bling?.catalogLine ?? getProductCatalogLine({
    name: bling?.name ?? product.name,
    categorySlug: category?.slug,
    categoryName: category?.name,
    subcategorySlug: subcategory?.slug,
    subcategoryName: subcategory?.name,
  });

  const variations = product.variations?.map((v) => ({
    id: v.id,
    name: v.name,
    value: v.value,
    imageUrl: v.imageUrl ?? null,
    stock: v.stock,
    isDefault: v.isDefault,
    order: v.order,
  })) ?? [];

  return {
    id: product.id,
    name: bling?.name ?? product.name,
    slug: product.slug,
    description: product.description || bling?.description,
    price: bling?.price ?? Number(product.price),
    promotionalPrice,
    promo: promotionalPrice,
    badge: product.isNew ? "Novo" : product.featured ? "Destaque" : bling?.badge ?? null,
    stock: bling?.stock ?? product.stock,
    sku: bling?.sku ?? product.sku,
    blingId: bling?.blingId ?? product.blingId,
    category,
    subcategory,
    images,
    image: images[0]?.url ?? null,
    sourceOrder: bling?.sourceOrder ?? 100000,
    priceSource: bling ? "BLING" : "DATABASE",
    imageSource: dbImages.length ? "DATABASE" : bling?.imageSource ?? "NONE",
    catalogLine,
    isAdult: catalogLine === "adult",
    variations: variations.length > 0 ? variations : undefined,
  } satisfies ProductCardProduct;
}

function mergeWithBlingCatalog(dbProducts: ProductCardProduct[], filters: CatalogFilters) {
  const canonicalDbProducts = dedupeProductCards(dbProducts).filter((product) =>
    matchesCatalogLine(toProductLineSource(product), filters.catalogLine)
  );
  const seen = new Set<string>();
  for (const product of canonicalDbProducts) {
    getProductIdentityKeys(product).forEach((key) => seen.add(key));
  }

  const blingProducts = getBlingProductCards(filters).filter((product) => {
    const keys = getProductIdentityKeys(product);
    return !keys.some((key) => seen.has(key));
  });

  return sortProducts(dedupeProductCards([...canonicalDbProducts, ...blingProducts]), filters.sort).filter((product) =>
    matchesCatalogLine(toProductLineSource(product), filters.catalogLine)
  );
}

function getRequestedCatalogLine(
  searchParams: URLSearchParams,
  category?: string | null,
  subcategory?: string | null
): CatalogLine | "all" {
  const requested = searchParams.get("line");
  if (requested === "adult" || requested === "all") return requested;
  if (requested === "normal") return "normal";
  if (category === "sex-shop" || subcategory?.startsWith("sex-shop-")) return "adult";
  return "normal";
}

function toProductLineSource(product: ProductCardProduct) {
  return {
    name: product.name,
    categorySlug: product.category?.slug,
    categoryName: product.category?.name,
    subcategorySlug: product.subcategory?.slug,
    subcategoryName: product.subcategory?.name,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

function sortProducts(products: ProductCardProduct[], sort?: string | null) {
  if (sort === "price_asc" || sort === "menor-preco") {
    return [...products].sort((a, b) => Number(a.price) - Number(b.price));
  }

  if (sort === "price_desc" || sort === "maior-preco") {
    return [...products].sort((a, b) => Number(b.price) - Number(a.price));
  }

  if (sort === "best_sellers" || sort === "mais-vendidos") {
    return [...products].sort((a, b) => Number(b.stock ?? 0) - Number(a.stock ?? 0));
  }

  return [...products].sort((a, b) => (a.sourceOrder ?? 100000) - (b.sourceOrder ?? 100000));
}

const imageSchema = z.object({
  url: z.string().min(1),
  alt: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

const variationSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  sku: z.string().trim().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  stock: z.number().int().min(0).default(0),
  priceModifier: z.number().default(0),
  isDefault: z.boolean().default(false),
  order: z.number().int().default(0),
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
  publicationStatus: z.nativeEnum(ProductPublicationStatus).optional(),
  searchTags: z.array(z.string().trim()).optional(),
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
        publicationStatus:
          data.publicationStatus ??
          (data.active ? ProductPublicationStatus.PUBLISHED : ProductPublicationStatus.IMPORTED),
        searchTags: data.searchTags ?? [],
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
              create: data.variations.map((variation, i) => ({
                name: variation.name,
                value: variation.value,
                sku: variation.sku || null,
                imageUrl: variation.imageUrl || null,
                stock: variation.stock,
                priceModifier: variation.priceModifier,
                isDefault: variation.isDefault,
                order: variation.order ?? i,
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
