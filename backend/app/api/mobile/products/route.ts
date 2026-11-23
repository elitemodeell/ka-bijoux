import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { catalogSearchAlternatives } from "@/lib/catalog-search";
import { googlePlayProductWhere } from "@/lib/google-play-distribution";
import { apiError, apiSuccess } from "@/lib/utils";
import { isOfficialCatalogPhoto, visibleCatalogPhotos } from "@/lib/catalog-photo";

const cardSelect = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  sku: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  promotionalPrice: true,
  stock: true,
  sharedVariationStock: true,
  assortedColors: true,
  fixedColor: true,
  featured: true,
  isNew: true,
  category: { select: { name: true, slug: true } },
  subcategory: { select: { name: true, slug: true } },
  images: {
    where: visibleCatalogPhotos,
    orderBy: { order: "asc" },
    take: 1,
    select: { url: true, alt: true },
  },
  variations: {
    where: { active: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      sku: true,
      name: true,
      value: true,
      imageUrl: true,
      stock: true,
      isDefault: true,
      order: true,
    },
  },
});

function serializeProduct(product: Prisma.ProductGetPayload<{ select: typeof cardSelect }>) {
  const images = product.images.filter(({ url }) => isOfficialCatalogPhoto(url, product.id, product.sku));
  return {
    ...product,
    images,
    variations: product.variations.map((variation) => ({
      ...variation,
      stock: product.sharedVariationStock ? product.stock : variation.stock,
      imageUrl: variation.imageUrl && isOfficialCatalogPhoto(variation.imageUrl, product.id, variation.sku, variation.id)
        ? variation.imageUrl
        : null,
    })),
    price: Number(product.price),
    promotionalPrice: product.promotionalPrice
      ? Number(product.promotionalPrice)
      : null,
    image: images[0]?.url ?? null,
    promo: product.promotionalPrice ? Number(product.promotionalPrice) : null,
    badge: product.isNew ? "Novo" : product.featured ? "Destaque" : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize") ?? 20) || 20));
    const search = params.get("q")?.trim();
    const category = params.get("category") ?? params.get("cat");
    const subcategory = params.get("subcategory");
    const featured = params.get("featured") === "true";
    const isNew = params.get("new") === "true";
    const promo = params.get("promo") === "true";
    const sort = params.get("sort") ?? params.get("ordem") ?? "createdAt";
    const minPrice = params.get("minPrice");
    const maxPrice = params.get("maxPrice");

    const filters: Prisma.ProductWhereInput = {};
    if (category) filters.category = { slug: category };
    if (subcategory) filters.subcategory = { slug: subcategory };
    if (featured) filters.featured = true;
    if (isNew) filters.isNew = true;
    if (promo) filters.promotionalPrice = { gt: 0, lt: prisma.product.fields.price };
    if (minPrice !== null || maxPrice !== null) {
      const min = minPrice === null ? undefined : Number(minPrice);
      const max = maxPrice === null ? undefined : Number(maxPrice);
      if ((min !== undefined && (!minPrice?.trim() || !Number.isFinite(min) || min < 0)) ||
          (max !== undefined && (!maxPrice?.trim() || !Number.isFinite(max) || max < 0)) ||
          (min !== undefined && max !== undefined && min > max)) {
        return apiError("Faixa de preço inválida.", 422);
      }
      const priceRange = { gte: min, lte: max };
      filters.AND = [{
        OR: [
          { promotionalPrice: { ...priceRange, gt: 0, lt: prisma.product.fields.price } },
          {
            price: priceRange,
            OR: [
              { promotionalPrice: null },
              { promotionalPrice: { lte: 0 } },
              { promotionalPrice: { gte: prisma.product.fields.price } },
            ],
          },
        ],
      }];
    }
    if (params.get("withImage") === "true") filters.images = { some: visibleCatalogPhotos };
    const searchAlternatives = search ? catalogSearchAlternatives(search) : [];
    if (searchAlternatives.length) filters.OR = searchAlternatives;

    const where = googlePlayProductWhere(filters);
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price_asc" || sort === "menor-preco"
        ? { price: "asc" }
        : sort === "price_desc" || sort === "maior-preco"
          ? { price: "desc" }
          : sort === "best_sellers" || sort === "mais-vendidos"
            ? { soldCount: "desc" }
            : { createdAt: "desc" };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: cardSelect,
        orderBy: [orderBy, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const response = apiSuccess({
      products: products.map(serializeProduct),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
    response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return response;
  } catch {
    return apiError("Erro ao buscar produtos.", 500);
  }
}
