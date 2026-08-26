import { Platform } from "react-native";

type CatalogItem = {
  name?: string | null;
  slug?: string | null;
  isAdult?: boolean | null;
  catalogLine?: string | null;
  category?: { slug?: string | null; name?: string | null } | null;
  subcategory?: { slug?: string | null; name?: string | null } | null;
};

export const isIosDistribution = Platform.OS === "ios";

export function isAdultCatalogSlug(value?: string | null) {
  return value === "sex-shop" || Boolean(value?.startsWith("sex-shop-"));
}

export function shouldHideCatalogItemOnIos(item?: CatalogItem | null) {
  if (!isIosDistribution || !item) return false;
  return item.isAdult === true ||
    item.catalogLine === "adult" ||
    isAdultCatalogSlug(item.slug) ||
    isAdultCatalogSlug(item.category?.slug) ||
    isAdultCatalogSlug(item.subcategory?.slug);
}

export function containsRestrictedAdultReferenceOnIos(...values: Array<string | null | undefined>) {
  if (!isIosDistribution) return false;
  const normalized = values
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /sex[ -]?shop|linha adulto|vibrador|protese adulta|masturbador|anel peniano|brinquedo sexual/.test(normalized);
}
