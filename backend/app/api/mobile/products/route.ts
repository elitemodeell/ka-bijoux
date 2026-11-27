import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { catalogSearchAlternatives, catalogSearchRank } from "@/lib/catalog-search";
import { googlePlayProductWhere } from "@/lib/google-play-distribution";
import { apiError, apiSuccess } from "@/lib/utils";
import { isOfficialCatalogPhoto, visibleCatalogPhotos } from "@/lib/catalog-photo";
import { catalogPurchaseBlocked } from "@/lib/catalog-purchase-mode";
import { saleReadyProduct, variationsShareSkuInventory } from "@/lib/catalog-storefront-eligibility";

const cardSelect = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  sku: true,
  blingId: true,
  name: true,
  slug: true,
  description: true,
  brand: true,
  ean: true,
  price: true,
  promotionalPrice: true,
  stock: true,
  purchaseMode: true,
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
      priceModifier: true,
      isDefault: true,
      order: true,
    },
  },
});

function serializeProduct(product: Prisma.ProductGetPayload<{ select: typeof cardSelect }>) {
  const { purchaseMode, ...card } = product;
  const purchaseReviewRequired = catalogPurchaseBlocked(purchaseMode, product.variations.length);
  const images = card.images.filter(({ url }) => isOfficialCatalogPhoto(url, card.id, card.sku));
  const sharedSkuInventory = variationsShareSkuInventory(product.sharedVariationStock, card.variations);
  return {
    ...card,
    purchaseReviewRequired,
    stock: purchaseReviewRequired ? 0 : card.stock,
    images,
    variations: (purchaseReviewRequired ? [] : card.variations).map((variation) => ({
      ...variation,
      stock: sharedSkuInventory ? product.stock : variation.stock,
      priceModifier: Number(variation.priceModifier),
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
    const suggestionsOnly = params.get("suggestions") === "true";
    if (suggestionsOnly && (!search || search.length < 3)) {
      return apiSuccess({ products: [], total: 0, page, pageSize, totalPages: 0, hasMoreCandidates: false });
    }
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

    const candidates = [];
    let skip = 0;
    while (true) {
      if (suggestionsOnly && skip >= 100) break;
      const batch = await prisma.product.findMany({
        where,
        select: cardSelect,
        orderBy: [orderBy, { id: "asc" }],
        skip,
        take: suggestionsOnly ? 100 : 500,
      });
      candidates.push(...batch);
      if (batch.length < 500) break;
      skip += batch.length;
      if (!suggestionsOnly && skip >= 20_000) return apiError("CatÃ¡logo excede o limite seguro de leitura.", 503);
    }

    const eligible = candidates.flatMap((product) => {
      const card = serializeProduct(product);
      const sale = saleReadyProduct(card);
      return sale ? [{ ...card, ...sale }] : [];
    });
    if (search) eligible.sort((a, b) => catalogSearchRank(a, search) - catalogSearchRank(b, search));
    const total = eligible.length;
    const products = eligible.slice((page - 1) * pageSize, page * pageSize);

    const response = apiSuccess({
      products,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMoreCandidates: suggestionsOnly && candidates.length >= 100,
    });
    response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return response;
  } catch {
    return apiError("Erro ao buscar produtos.", 500);
  }
}
