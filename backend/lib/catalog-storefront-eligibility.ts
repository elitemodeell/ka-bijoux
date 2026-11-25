import { findBlingProductForSource } from "@/lib/bling-catalog";
import { isOfficialCatalogPhoto } from "@/lib/catalog-photo";

type SaleCandidate = {
  id: string;
  sku?: string | null;
  blingId?: string | null;
  slug?: string | null;
  name?: string | null;
  price: unknown;
  promotionalPrice?: unknown;
  stock?: unknown;
  sharedVariationStock?: boolean;
  purchaseReviewRequired?: boolean;
  requiresOptionSelection?: boolean;
  image?: string | null;
  images?: Array<{ url: string; alt?: string | null }>;
  variations?: Array<{
    id: string;
    sku?: string | null;
    name: string;
    value: string;
    imageUrl?: string | null;
    stock: unknown;
    priceModifier?: unknown;
    isDefault?: boolean;
    order?: number;
  }>;
};

type SaleReadyData<T extends SaleCandidate> = {
  stock: number;
  image: string;
  variations: NonNullable<T["variations"]>;
};

const SKU_PATTERN = /^310400\d{7}$/;

function cents(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

function confirmedBlingProduct(sku: string | null | undefined, blingId?: string | null, slug?: string | null, name?: string | null) {
  if (!sku || !SKU_PATTERN.test(sku)) return null;
  const product = findBlingProductForSource({ sku, blingId, slug, name });
  if (!product || product.sku !== sku || !product.active || product.stock <= 0) return null;
  return product;
}

export function variationsShareSkuInventory(
  sharedVariationStock: boolean | undefined,
  variations: ReadonlyArray<{ sku?: string | null }>,
) {
  const sharedSku = variations[0]?.sku;
  return Boolean(sharedVariationStock && sharedSku && variations.every(({ sku }) => sku === sharedSku));
}

export function saleReadyProduct<T extends SaleCandidate>(candidate: T): SaleReadyData<T> | null {
  if (candidate.purchaseReviewRequired || !candidate.sku || !SKU_PATTERN.test(candidate.sku)) return null;

  const images = (candidate.images ?? []).filter(({ url }) =>
    isOfficialCatalogPhoto(url, candidate.id, candidate.sku),
  );
  if (images.length === 0) return null;
  const basePrice = Number(candidate.price);
  const promotionalPrice = Number(candidate.promotionalPrice ?? 0);
  if (!Number.isFinite(basePrice) || (promotionalPrice > 0 && promotionalPrice < basePrice)) return null;

  const variants = candidate.variations ?? [];
  if (candidate.requiresOptionSelection && variants.length === 0) return null;
  if (variants.length > 0) {
    const eligibleVariants: NonNullable<SaleCandidate["variations"]> = [];
    const sharedSkuInventory = variationsShareSkuInventory(candidate.sharedVariationStock, variants);
    for (const variant of variants) {
      const bling = confirmedBlingProduct(variant.sku);
      if (!bling || !variant.imageUrl ||
          !isOfficialCatalogPhoto(variant.imageUrl, candidate.id, variant.sku, variant.id)) continue;
      const variantPrice = basePrice + Number(variant.priceModifier ?? 0);
      if (cents(variantPrice) !== cents(bling.price)) continue;
      const localStock = Number(sharedSkuInventory ? candidate.stock : variant.stock);
      const sellableStock = Math.min(Math.max(0, Number.isFinite(localStock) ? localStock : 0), Math.max(0, bling.stock));
      if (sellableStock <= 0) continue;
      eligibleVariants.push({ ...variant, stock: sellableStock } as NonNullable<T["variations"]>[number]);
    }
    if (eligibleVariants.length === 0) return null;
    return {
      stock: Math.max(...eligibleVariants.map(({ stock }) => Number(stock))),
      image: images[0].url,
      variations: eligibleVariants as NonNullable<T["variations"]>,
    };
  }

  const bling = confirmedBlingProduct(candidate.sku, candidate.blingId, candidate.slug, candidate.name);
  if (!bling || cents(basePrice) !== cents(bling.price)) return null;
  const localStock = Number(candidate.stock);
  const stock = Math.min(Math.max(0, Number.isFinite(localStock) ? localStock : 0), Math.max(0, bling.stock));
  if (stock <= 0) return null;

  return { stock, image: images[0].url, variations: [] as NonNullable<T["variations"]> };
}
