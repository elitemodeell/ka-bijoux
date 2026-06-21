export type CatalogLine = "normal" | "adult";

export type ProductLineSource = {
  name?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  subcategorySlug?: string | null;
  subcategoryName?: string | null;
};

const ADULT_CATEGORY_SLUG = "sex-shop";

export function normalizeCatalogText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isAdultProductName(name: string | null | undefined) {
  const normalizedName = normalizeCatalogText(name);
  if (!normalizedName) return false;

  if (isStrongAdultProductName(normalizedName)) return true;

  return /\b(sexy|sex shop)\b/.test(normalizedName);
}

export function isStrongAdultProductName(name: string | null | undefined) {
  const normalizedName = normalizeCatalogText(name);
  if (!normalizedName) return false;

  if (
    /\b(intimo|intima|lubrificante|vibrador|bullet|peniano|masturbador|algema|dedeira|tesao|pocao|garganta profunda|virginite|anosex|egg|pau de cavalo|duramais|dessensibilizante|excitante|anestesico|beijavel|plug anal|retardante)\b/.test(
      normalizedName
    )
  ) {
    return true;
  }

  if (
    /\bgel\b/.test(normalizedName) &&
    /\b(excitant|sensual|massageador|massagem|comestivel|anestesico|dessensibilizante|esquenta|esfria|beijavel|anal|intimo|sex|sexy|masculino)\b/.test(
      normalizedName
    )
  ) {
    return true;
  }

  return /\bpomada\b/.test(normalizedName) && /\b(massageadora|canela|tubarao)\b/.test(normalizedName);
}

export function isAdultCatalogProduct(source: ProductLineSource) {
  const categorySlug = normalizeCatalogText(source.categorySlug).replace(/\s+/g, "-");
  const subcategorySlug = normalizeCatalogText(source.subcategorySlug).replace(/\s+/g, "-");
  const categoryName = normalizeCatalogText(source.categoryName);

  if (categorySlug === ADULT_CATEGORY_SLUG || subcategorySlug.startsWith(`${ADULT_CATEGORY_SLUG}-`)) {
    return true;
  }

  if (categoryName === "sex shop" || categoryName === "linha adulto" || categoryName === "adulto") {
    return true;
  }

  if (categorySlug && categorySlug !== ADULT_CATEGORY_SLUG) {
    return isStrongAdultProductName(source.name);
  }

  return isAdultProductName(source.name);
}

export function getProductCatalogLine(source: ProductLineSource): CatalogLine {
  return isAdultCatalogProduct(source) ? "adult" : "normal";
}

export function matchesCatalogLine(source: ProductLineSource, line?: CatalogLine | "all" | null) {
  return !line || line === "all" || getProductCatalogLine(source) === line;
}
