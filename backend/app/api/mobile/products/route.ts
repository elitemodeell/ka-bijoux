import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { googlePlayProductWhere } from "@/lib/google-play-distribution";
import { apiError, apiSuccess } from "@/lib/utils";

const cardSelect = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  promotionalPrice: true,
  stock: true,
  featured: true,
  isNew: true,
  category: { select: { name: true, slug: true } },
  subcategory: { select: { name: true, slug: true } },
  images: {
    orderBy: { order: "asc" },
    take: 1,
    select: { url: true, alt: true },
  },
  variations: {
    where: { active: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
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
  return {
    ...product,
    price: Number(product.price),
    promotionalPrice: product.promotionalPrice
      ? Number(product.promotionalPrice)
      : null,
    image: product.images[0]?.url ?? null,
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

    const filters: Prisma.ProductWhereInput = {};
    if (category) filters.category = { slug: category };
    if (subcategory) filters.subcategory = { slug: subcategory };
    if (featured) filters.featured = true;
    if (isNew) filters.isNew = true;
    if (promo) filters.promotionalPrice = { not: null };
    if (params.get("withImage") === "true") filters.images = { some: {} };
    if (search) {
      filters.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { searchTags: { hasSome: buildSearchTerms(search) } },
      ];
    }

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

function buildSearchTerms(value: string) {
  const original = value.trim();
  const normalized = original
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return Array.from(new Set([original, normalized].filter(Boolean)));
}
