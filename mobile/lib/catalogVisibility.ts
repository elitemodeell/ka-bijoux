export type CatalogCategoryForVisibility = {
  slug: string;
  mobileProductCount?: number | null;
  productCountWithImage?: number | null;
  _count?: { products?: number | null } | null;
};

const KNOWN_EMPTY_ON_MOBILE = new Set([
  "relogios",
  "oculos",
  "pijamas",
  "roupa-infantil",
  "brinquedos",
  "cintos",
  "acessorios-inverno",
]);

export function getMobileProductCount(category: CatalogCategoryForVisibility) {
  return Number(
    category.mobileProductCount ??
      category.productCountWithImage ??
      category._count?.products ??
      0
  );
}

export function hasMobileProducts(category: CatalogCategoryForVisibility) {
  const count = getMobileProductCount(category);
  if (category.mobileProductCount == null && KNOWN_EMPTY_ON_MOBILE.has(category.slug)) {
    return false;
  }
  return count > 0;
}

export function getVisibleMobileCategories<T extends CatalogCategoryForVisibility>(
  categories: T[],
  options: { includeAdult?: boolean; limit?: number } = {}
) {
  const filtered = categories.filter((category) => {
    if (!options.includeAdult && category.slug === "sex-shop") return false;
    return hasMobileProducts(category);
  });

  return typeof options.limit === "number" ? filtered.slice(0, options.limit) : filtered;
}
