import { Prisma } from "@prisma/client";
import { isOfficialCatalogPhoto, visibleCatalogPhotos } from "@/lib/catalog-photo";
import { catalogPurchaseBlocked } from "@/lib/catalog-purchase-mode";
import { prisma } from "@/lib/prisma";
import { getPublicCategoryName } from "@/lib/catalog";
import {
  findBlingProductForSource,
  isAdultImageUrl,
  type ProductCardProduct,
} from "@/lib/bling-catalog";
import { getProductCatalogLine, matchesCatalogLine } from "@/lib/product-line";
import { googlePlayProductWhere } from "@/lib/google-play-distribution";
import { saleReadyProduct, variationsShareSkuInventory } from "@/lib/catalog-storefront-eligibility";

export interface HomeSections {
  ofertasRelampago: ProductCardProduct[];
  achadinhos: ProductCardProduct[];
  novidades: ProductCardProduct[];
  maisVendidos: ProductCardProduct[];
  paraPresentes: ProductCardProduct[];
  belezaAutocuidado: ProductCardProduct[];
}

const homeProductSelect = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  name: true,
  slug: true,
  price: true,
  promotionalPrice: true,
  stock: true,
  purchaseMode: true,
  sharedVariationStock: true,
  featured: true,
  isNew: true,
  sku: true,
  blingId: true,
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
      priceModifier: true,
    },
  },
});

type FetchPoolOptions = {
  limit: number;
  featured?: boolean;
  isNew?: boolean;
  promo?: boolean;
  sort?: "createdAt" | "best_sellers" | "home_order";
  googlePlay?: boolean;
};

function mergeUniqueProducts(...pools: ProductCardProduct[][]): ProductCardProduct[] {
  const products = new Map<string, ProductCardProduct>();
  for (const product of pools.flat()) {
    if (!products.has(product.id)) products.set(product.id, product);
  }
  return Array.from(products.values());
}

async function fetchPool(filters: FetchPoolOptions): Promise<ProductCardProduct[]> {
  const extra: Prisma.ProductWhereInput = { images: { some: {} } };
  if (filters.featured) extra.featured = true;
  if (filters.isNew) extra.isNew = true;
  if (filters.promo) extra.promotionalPrice = { gt: 0, lt: prisma.product.fields.price };
  if (filters.sort === "home_order") extra.homeSortOrder = { not: null };

  const where = filters.googlePlay
    ? googlePlayProductWhere(extra)
    : {
        AND: [
          { active: true },
          { category: { slug: { not: "sex-shop" } } },
          extra,
        ],
      } satisfies Prisma.ProductWhereInput;

  const products = await prisma.product.findMany({
    where,
    select: homeProductSelect,
    orderBy: [
      filters.sort === "home_order"
        ? { homeSortOrder: "asc" }
        : filters.sort === "best_sellers"
          ? { soldCount: "desc" }
          : { createdAt: "desc" },
      { id: "asc" },
    ],
    take: filters.limit,
  });

  return products
    .map(mapDbProductToCard)
    .filter((product): product is ProductCardProduct => Boolean(product))
    .filter((product) => Boolean(product.image))
    .filter((product) => matchesCatalogLine(toProductLineSource(product), "normal"))
    .flatMap((product) => {
      const sale = saleReadyProduct(product);
      return sale ? [{ ...product, ...sale }] : [];
    });
}

function mapDbProductToCard(
  product: Prisma.ProductGetPayload<{ select: typeof homeProductSelect }>
): ProductCardProduct | null {
  const purchaseReviewRequired = catalogPurchaseBlocked(product.purchaseMode, product.variations.length);
  const bling = findBlingProductForSource({
    blingId: product.blingId,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
  });

  const rawImages = product.images
    .filter(({ url }) => isOfficialCatalogPhoto(url, product.id, product.sku))
    .map((image) => ({ url: image.url, alt: image.alt ?? product.name }));
  const images = rawImages.filter((image) => !isAdultImageUrl(image.url));
  const promotionalPrice = product.promotionalPrice
      ? Number(product.promotionalPrice)
      : null;
  const category = product.category
    ? { name: getPublicCategoryName(product.category), slug: product.category.slug }
    : null;
  const subcategory = product.subcategory
    ? { name: product.subcategory.name, slug: product.subcategory.slug }
    : null;
  const catalogLine = getProductCatalogLine({
    name: product.name,
    categorySlug: category?.slug,
    categoryName: category?.name,
    subcategorySlug: subcategory?.slug,
    subcategoryName: subcategory?.name,
  });
  const sharedSkuInventory = variationsShareSkuInventory(product.sharedVariationStock, product.variations);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    promotionalPrice,
    promo: promotionalPrice,
    badge: product.isNew ? "Novo" : product.featured ? "Destaque" : null,
    stock: purchaseReviewRequired ? 0 : product.stock,
    purchaseReviewRequired,
    requiresOptionSelection: product.purchaseMode === "OPTIONS",
    sku: product.sku,
    blingId: bling?.blingId ?? product.blingId,
    category,
    subcategory,
    images,
    image: images[0]?.url ?? null,
    sourceOrder: 100000,
    priceSource: "DATABASE",
    imageSource: images.length ? "DATABASE" : "NONE",
    catalogLine,
    isAdult: catalogLine === "adult",
    variations: (purchaseReviewRequired ? [] : product.variations).map((variation) => ({
      ...variation,
      stock: sharedSkuInventory ? product.stock : variation.stock,
      priceModifier: Number(variation.priceModifier),
      imageUrl: variation.imageUrl && isOfficialCatalogPhoto(variation.imageUrl, product.id, variation.sku, variation.id) ? variation.imageUrl : null,
    })),
  } satisfies ProductCardProduct;
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

export async function getHomeSections(
  options: { googlePlay?: boolean } = {}
): Promise<HomeSections> {
  const googlePlay = options.googlePlay === true;
  const [main, featured, newProducts, promo, curated] = await Promise.all([
    fetchPool({ limit: 70, googlePlay }),
    fetchPool({ limit: 24, featured: true, sort: "best_sellers", googlePlay }),
    fetchPool({ limit: 24, isNew: true, googlePlay }),
    fetchPool({ limit: 24, promo: true, googlePlay }),
    fetchPool({ limit: 30, sort: "home_order", googlePlay }),
  ]);

  const productPool = mergeUniqueProducts(curated, main, featured, newProducts, promo);
  const usedIds = new Set<string>();

  function takeSection(priority: ProductCardProduct[], amount: number) {
    const result: ProductCardProduct[] = [];
    for (const product of mergeUniqueProducts(priority, productPool)) {
      if (usedIds.has(product.id)) continue;
      result.push(product);
      usedIds.add(product.id);
      if (result.length >= amount) break;
    }
    return result;
  }

  return {
    ofertasRelampago: promo.slice(0, 8),
    achadinhos: takeSection([...curated, ...main], 24),
    novidades: newProducts.slice(0, 8),
    maisVendidos: takeSection([...featured, ...main], 10),
    paraPresentes: takeSection(main, 8),
    belezaAutocuidado: takeSection(main, 8),
  };
}

/** Products that can be safely placed in the admin-managed storefront curation. */
export async function getHomeCurationCandidates(googlePlay = false) {
  const products = await fetchPool({ limit: 1000, sort: "best_sellers", googlePlay });
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    price: product.promotionalPrice ?? product.price,
    stock: product.stock,
    image: product.image,
    category: product.category?.name ?? "",
    categorySlug: product.category?.slug ?? "",
  }));
}
