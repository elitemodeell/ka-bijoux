export type CatalogLine = "normal" | "adult";

export type ProductLineSource = {
  name?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  subcategorySlug?: string | null;
  subcategoryName?: string | null;
};

const ADULT_CATEGORY_SLUG = "sex-shop";
const NON_ADULT_NAME_PATTERN =
  /\b(infantil|crianca|criancas|anti acne|acne|sobrancelha|glitter|orbis|bolinha de gel|bolinha d gel|esfoliante|pedras vulcanicas)\b/;

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
  if (NON_ADULT_NAME_PATTERN.test(normalizedName)) return false;

  if (isStrongAdultProductName(normalizedName)) return true;

  return /\b(sexy|sex shop)\b/.test(normalizedName);
}

export function isStrongAdultProductName(name: string | null | undefined) {
  const normalizedName = normalizeCatalogText(name);
  if (!normalizedName) return false;
  if (NON_ADULT_NAME_PATTERN.test(normalizedName)) return false;

  if (
    /\b(intimo|intima|lub|lubrificante|calcinha|vibrador|bullet|peniano|masturbador|algema|dedeira|tesao|pocao|garganta profunda|virginite|anosex|egg|pau de cavalo|duramais|dessensibilizante|excitante|anestesico|beijavel|plug|retardante|protese|dildo|escroto|mydick|chicote|tapa mamilo|chuca|duelo|dados sexy|jogo do prazer|perfume de calcinha)\b/.test(
      normalizedName
    )
  ) {
    return true;
  }

  if (
    /\bgel\b/.test(normalizedName) &&
    /\b(bala|ice|hot|excitant|sensual|massageador|massagem|comestivel|anestesico|dessensibilizante|esquenta|esfria|beijavel|anal|intimo|sex|sexy|masculino|qy|kgel|k med|kmed|babbaloo|sempre virgem|rapidinha|amoxsex|metioulate|rivosex|napepex|dando uma|come anel|ku loko|beijo grego|misterzao|durateson|yummy|sedenta|carrosel|lamb|for sexy|bumbum|nabucetao|mete ficha|vamos ser feliz|fofatoba|pirocaxona|pirocadura|janumete|kama sutra|cavalo)\b/.test(
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
