import {
  CATALOG_CATEGORIES,
  getCategoryBySlug,
  getPublicCategoryName,
} from "@/lib/catalog";
import { STATIC_SEX_SHOP_CATALOG } from "@/lib/static-sex-shop-catalog";
import blingRows from "@/data/produtos-bling.json";
import imageMapping from "@/data/mapeamento-imagens-produtos.json";
import uploadImageFiles from "@/data/bling-image-files.json";
import productContentOverrides from "@/data/product-content-overrides.json";
import {
  getProductCatalogLine,
  isAdultCatalogProduct,
  isAdultProductName,
  type CatalogLine,
} from "@/lib/product-line";

export type ProductCardMedia = { url: string; alt?: string | null };

export type ProductCardVariation = {
  id: string;
  name: string;
  value: string;
  imageUrl?: string | null;
  stock: number;
  isDefault: boolean;
  order: number;
};

export type ProductCardProduct = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  promotionalPrice?: number | null;
  promo?: number | null;
  badge?: string | null;
  image?: string | null;
  images?: ProductCardMedia[];
  slug?: string;
  stock?: number;
  sku?: string | null;
  blingId?: string | null;
  category?: { name: string; slug?: string } | null;
  subcategory?: { name: string; slug?: string } | null;
  sourceOrder?: number;
  priceSource?: "BLING" | "DATABASE" | "LOCAL";
  imageSource?: "BLING" | "MARKETPLACE" | "DATABASE" | "STATIC" | "NONE";
  catalogLine?: CatalogLine;
  isAdult?: boolean;
  variations?: ProductCardVariation[];
};

export type BlingCatalogProduct = ProductCardProduct & {
  id: string;
  blingId: string;
  name: string;
  slug: string;
  sku: string | null;
  ean: string | null;
  price: number;
  stock: number;
  image: string | null;
  images: ProductCardMedia[];
  active: boolean;
  rawStatus: string;
  category: { name: string; slug: string };
  subcategory: { name: string; slug: string } | null;
  searchText: string;
  staticSlug?: string | null;
  staticLongDescription?: string | null;
  staticHowToUse?: string | null;
  staticDetails?: string[];
  catalogLine: CatalogLine;
  isAdult: boolean;
};

export type CatalogFilters = {
  categorySlug?: string | null;
  subcategorySlug?: string | null;
  selectedPrice?: string | null;
  exactPrice?: string | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  promo?: boolean;
  onlyNew?: boolean;
  featured?: boolean;
  query?: string | null;
  sort?: string | null;
  limit?: number;
  skip?: number;
  requireImage?: boolean;
  catalogLine?: CatalogLine | "all";
};

type CsvRow = Record<string, string>;

type ImageIndexEntry = {
  src?: string | null;
  nome?: string | null;
  id?: string | null;
  sku?: string | null;
  normalizedName: string;
};

type ImageMatch = {
  url: string;
  source: "BLING" | "MARKETPLACE" | "STATIC" | "NONE";
  reason: string;
};

type CatalogCache = {
  products: BlingCatalogProduct[];
  byBlingId: Map<string, BlingCatalogProduct>;
  bySku: Map<string, BlingCatalogProduct>;
  bySlug: Map<string, BlingCatalogProduct>;
  byName: Map<string, BlingCatalogProduct>;
  totals: {
    total: number;
    active: number;
    withImage: number;
    withoutImage: number;
    visible: number;
    sexShopVisible: number;
  };
};

type ProductContentOverride = {
  blingId?: string | null;
  sku?: string | null;
  name?: string | null;
  displayName?: string | null;
  isAdult?: boolean;
  categoryName?: string | null;
  subcategoryName?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  details?: string[];
  imageFile?: string | null;
  galleryImages?: string[];
  variations?: ProductContentVariation[];
  variants?: ProductContentVariation[];
  benefits?: string | null;
  howToUse?: string | null;
  composition?: string | null;
  careInstructions?: string | null;
  packageContents?: string | null;
  seoSlug?: string | null;
  seoKeywords?: string[];
};

type ProductContentVariation = {
  label: string;
  slug?: string;
  color?: string;
  active?: boolean;
  sku?: string;
  imageFile?: string;
  images?: string[];
};

const TECHNICAL_PENDING_DESCRIPTION =
  "Produto KA Bijoux com nome, preco e estoque sincronizados pela Bling. Informacoes tecnicas pendentes de revisao manual.";

let catalogCache: CatalogCache | null = null;
const contentOverrides = Array.isArray(productContentOverrides)
  ? (productContentOverrides as ProductContentOverride[])
  : (Object.values(productContentOverrides) as ProductContentOverride[]);

export function getBlingProductCards(filters: CatalogFilters = {}) {
  const products = getBlingCatalogProducts(filters);
  const skip = Math.max(0, filters.skip ?? 0);
  const limit = filters.limit ?? products.length;
  return products.slice(skip, skip + limit).map(toProductCard);
}

export function getBlingCatalogProducts(filters: CatalogFilters = {}) {
  const requireImage = filters.requireImage ?? false;
  const normalizedQuery = normalizeSearch(filters.query ?? "");
  const selectedPrice = filters.selectedPrice ?? filters.exactPrice ?? null;
  const minPrice = toOptionalNumber(filters.minPrice);
  const maxPrice = toOptionalNumber(filters.maxPrice);

  const products = getCatalogCache().products.filter((product) => {
    if (!product.active || product.stock <= 0) return false;
    if (filters.catalogLine && filters.catalogLine !== "all" && product.catalogLine !== filters.catalogLine) return false;
    if (requireImage && !product.image) return false;
    if (filters.categorySlug && product.category.slug !== filters.categorySlug) return false;
    if (filters.subcategorySlug && product.subcategory?.slug !== filters.subcategorySlug) return false;
    if (selectedPrice && selectedPrice !== "all" && Number(product.price) !== Number(selectedPrice)) return false;
    if (minPrice !== null && product.price < minPrice) return false;
    if (maxPrice !== null && product.price > maxPrice) return false;
    if (filters.promo) return false;
    if (normalizedQuery && !product.searchText.includes(normalizedQuery)) return false;
    return true;
  });

  return sortCatalogProducts(products, filters.sort);
}

export function getBlingProductBySlug(slug: string) {
  return getCatalogCache().bySlug.get(slug) ?? null;
}

export function findBlingProductForSource(product: {
  blingId?: string | null;
  sku?: string | null;
  slug?: string | null;
  name?: string | null;
}) {
  const cache = getCatalogCache();
  const blingId = product.blingId ? String(product.blingId).trim() : "";
  if (blingId && cache.byBlingId.has(blingId)) return cache.byBlingId.get(blingId) ?? null;

  const sku = product.sku ? String(product.sku).trim() : "";
  if (sku && cache.bySku.has(sku)) return cache.bySku.get(sku) ?? null;

  const slug = product.slug ? String(product.slug).trim() : "";
  if (slug && cache.bySlug.has(slug)) return cache.bySlug.get(slug) ?? null;

  const name = normalizeSearch(product.name ?? "");
  if (name && cache.byName.has(name)) return cache.byName.get(name) ?? null;

  return null;
}

export function getBlingCatalogStats() {
  return getCatalogCache().totals;
}

export function toProductCard(product: BlingCatalogProduct): ProductCardProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    promotionalPrice: null,
    promo: null,
    badge: product.badge,
    stock: product.stock,
    sku: product.sku,
    blingId: product.blingId,
    category: product.category,
    subcategory: product.subcategory,
    image: product.image,
    images: product.images,
    sourceOrder: product.sourceOrder,
    priceSource: "BLING",
    imageSource: product.imageSource,
    catalogLine: product.catalogLine,
    isAdult: product.isAdult,
  };
}

export function getProductIdentityKeys(product: {
  id?: string | null;
  blingId?: string | null;
  sku?: string | null;
  slug?: string | null;
  name?: string | null;
}) {
  return [
    product.blingId ? `bling:${product.blingId}` : null,
    product.sku ? `sku:${product.sku}` : null,
    product.slug ? `slug:${product.slug}` : null,
    product.name ? `name:${normalizeSearch(product.name)}` : null,
  ].filter((value): value is string => Boolean(value));
}

export function getCanonicalProductSlug(product: {
  blingId?: string | null;
  sku?: string | null;
  slug?: string | null;
  name?: string | null;
}) {
  return findBlingProductForSource(product)?.slug ?? product.slug?.trim() ?? null;
}

export function dedupeProductCards(products: ProductCardProduct[]) {
  const seen = new Set<string>();
  const result: ProductCardProduct[] = [];

  for (const product of products) {
    const catalogProduct = findBlingProductForSource(product);
    const canonicalProduct = {
      ...product,
      id: catalogProduct?.id ?? product.id,
      blingId: catalogProduct?.blingId ?? product.blingId,
      sku: catalogProduct?.sku ?? product.sku,
      slug: catalogProduct?.slug ?? product.slug,
      catalogLine: catalogProduct?.catalogLine ?? product.catalogLine,
      isAdult: catalogProduct?.isAdult ?? product.isAdult,
    };
    const keys = getProductIdentityKeys(canonicalProduct);
    if (keys.some((key) => seen.has(key))) continue;
    keys.forEach((key) => seen.add(key));
    result.push(canonicalProduct);
  }

  return result;
}

function getCatalogCache(): CatalogCache {
  if (catalogCache) return catalogCache;

  const rows = Array.isArray(blingRows) ? (blingRows as CsvRow[]) : [];
  const imageIndex = buildImageIndex();
  const usedSlugs = new Set<string>();

  const products = rows
    .map(normalizeBlingRow)
    .filter((row) => row.id && row.name)
    .map((row, index) => buildCatalogProduct(row, index, imageIndex, usedSlugs));

  const byBlingId = new Map<string, BlingCatalogProduct>();
  const bySku = new Map<string, BlingCatalogProduct>();
  const bySlug = new Map<string, BlingCatalogProduct>();
  const byName = new Map<string, BlingCatalogProduct>();

  for (const product of products) {
    byBlingId.set(product.blingId, product);
    if (product.sku) bySku.set(product.sku, product);
    bySlug.set(product.slug, product);
    const nameSlug = slugify(product.name);
    if (nameSlug && !bySlug.has(nameSlug)) bySlug.set(nameSlug, product);
    byName.set(normalizeSearch(product.name), product);
    const contentOverride = getProductContentOverride(product);
    if (contentOverride?.name) byName.set(normalizeSearch(contentOverride.name), product);
    if (contentOverride?.displayName) byName.set(normalizeSearch(contentOverride.displayName), product);
    if (product.staticSlug) bySlug.set(product.staticSlug, product);
  }

  catalogCache = {
    products,
    byBlingId,
    bySku,
    bySlug,
    byName,
    totals: {
      total: products.length,
      active: products.filter((product) => product.active && product.stock > 0).length,
      withImage: products.filter((product) => Boolean(product.image)).length,
      withoutImage: products.filter((product) => !product.image).length,
      visible: products.filter((product) => product.active && product.stock > 0 && product.image).length,
      sexShopVisible: products.filter(
        (product) => product.active && product.stock > 0 && product.image && product.category.slug === "sex-shop"
      ).length,
    },
  };

  return catalogCache;
}

function buildCatalogProduct(
  row: ReturnType<typeof normalizeBlingRow>,
  index: number,
  imageIndex: ReturnType<typeof buildImageIndex>,
  usedSlugs: Set<string>
): BlingCatalogProduct {
  const staticProduct = findStaticProduct(row);
  const category = inferCategory(row.name, row.category);
  const categoryDef = getCategoryBySlug(category.categorySlug);
  const subcategoryDef =
    categoryDef?.subcategories?.find((item) => item.slug === category.subcategorySlug) ?? null;
  const contentOverride = getProductContentOverride({
    blingId: row.id,
    sku: row.sku,
    name: row.name,
  });
  const imageMatch = resolveImage(row, imageIndex, contentOverride?.imageFile ?? staticProduct?.imageFile);
  const baseSlug = contentOverride?.seoSlug ?? staticProduct?.slug ?? slugify(row.name) ?? `produto-${row.id}`;
  const slug = uniqueSlug(baseSlug, row.id, usedSlugs);
  const displayName = contentOverride?.displayName ?? row.name;
  const description = contentOverride?.shortDescription ?? staticProduct?.shortDescription ?? TECHNICAL_PENDING_DESCRIPTION;
  const categoryName = contentOverride?.categoryName ?? (categoryDef ? getPublicCategoryName(categoryDef) : "KA Bijoux");
  const subcategoryName = contentOverride?.subcategoryName ?? subcategoryDef?.name ?? null;
  const searchText = normalizeSearch(
    [
      row.name,
      displayName,
      row.sku,
      row.id,
      row.category,
      category.categorySlug,
      category.subcategorySlug,
      categoryName,
      subcategoryName,
      staticProduct?.slug,
      contentOverride?.shortDescription,
      contentOverride?.longDescription,
      ...(contentOverride?.details ?? []),
      ...(contentOverride?.seoKeywords ?? []),
    ]
      .filter(Boolean)
      .join(" ")
  );
  const catalogLine = getProductCatalogLine({
    name: row.name,
    categorySlug: category.categorySlug,
    categoryName: row.category,
    subcategorySlug: category.subcategorySlug,
  });

  return {
    id: `bling-${row.id}`,
    blingId: row.id,
    name: displayName,
    slug,
    sku: row.sku || null,
    ean: row.ean || null,
    description,
    price: row.price,
    promotionalPrice: null,
    promo: null,
    badge: index < 24 ? "Novo" : null,
    stock: row.stock,
    active: row.status === "A",
    rawStatus: row.status,
    category: { name: categoryName, slug: category.categorySlug },
    subcategory: category.subcategorySlug
      ? { name: subcategoryName ?? category.subcategorySlug, slug: category.subcategorySlug }
      : null,
    image: imageMatch.url || null,
    images: imageMatch.url ? [{ url: imageMatch.url, alt: row.name }] : [],
    imageSource: imageMatch.source,
    sourceOrder: index,
    priceSource: "BLING",
    searchText,
    staticSlug: staticProduct?.slug ?? null,
    staticLongDescription: staticProduct?.longDescription ?? null,
    staticHowToUse: staticProduct?.howToUse ?? null,
    staticDetails: staticProduct?.details ?? [],
    catalogLine,
    isAdult: contentOverride?.isAdult ?? catalogLine === "adult",
  };
}

function getProductContentOverride(product: {
  blingId?: string | null;
  sku?: string | null;
  name?: string | null;
}) {
  const blingId = product.blingId ? String(product.blingId).trim() : "";
  const sku = product.sku ? String(product.sku).trim() : "";
  const normalizedName = normalizeSearch(product.name ?? "");

  return (
    (blingId ? contentOverrides.find((item) => String(item.blingId ?? "").trim() === blingId) : null) ??
    (sku ? contentOverrides.find((item) => String(item.sku ?? "").trim() === sku) : null) ??
    (normalizedName ? contentOverrides.find((item) => normalizeSearch(item.name ?? "") === normalizedName) : null) ??
    null
  );
}

function normalizeBlingRow(row: CsvRow) {
  return {
    id: normalizeCell(row.id),
    name: normalizeSpaces(row.nome || row.name || row.descricao || ""),
    sku: normalizeCell(row.codigo || row.sku || row.code || ""),
    ean: normalizeCell(row.ean || row.gtin || row.codigoBarras || ""),
    price: Number(String(row.preco ?? row.price ?? "0").replace(",", ".")) || 0,
    status: normalizeCell(row.situacao || row.status || "I").toUpperCase() || "I",
    stock: Math.max(0, Number.parseInt(String(row.estoque ?? row.stock ?? "0"), 10) || 0),
    category: normalizeSpaces(row.categoria || row.category || ""),
    imageUrl: extractBlingImageUrl(row),
  };
}

function extractBlingImageUrl(row: CsvRow) {
  const keys = [
    "imagem",
    "imagens",
    "image",
    "images",
    "imageUrl",
    "urlImagem",
    "url_imagem",
    "foto",
    "fotos",
    "midia",
    "media",
    "mediaUrl",
    "anexo",
    "anexos",
  ];

  for (const key of keys) {
    const value = normalizeCell(row[key] ?? row[key.toLowerCase()] ?? "");
    if (!value) continue;
    const first = value.split(/[|,]/).map((item) => item.trim()).find(Boolean);
    if (!first) continue;
    if (/^https?:\/\//i.test(first) || first.startsWith("/")) return first;
    if (/\.(png|jpe?g|webp)$/i.test(first)) return `/uploads/products/${first}`;
  }

  return "";
}

function buildImageIndex() {
  const mapping = Array.isArray(imageMapping) ? imageMapping : [];
  const imageFiles = Array.isArray(uploadImageFiles) ? uploadImageFiles.map(String) : [];
  const byId = new Map<string, ImageIndexEntry>();
  const bySku = new Map<string, ImageIndexEntry>();
  const semantic: ImageIndexEntry[] = [];

  for (const item of mapping) {
    const entry: ImageIndexEntry = {
      src: item.src ? String(item.src) : null,
      nome: item.nome ? String(item.nome) : null,
      id: item.id ? String(item.id) : null,
      sku: item.sku ? String(item.sku) : null,
      normalizedName: normalizeSearch(`${item.nome ?? ""} ${item.src ?? ""}`),
    };

    if (entry.id) byId.set(entry.id, entry);
    if (entry.sku) bySku.set(entry.sku, entry);
    semantic.push(entry);
  }

  for (const fileName of imageFiles) {
    if (!/\.(png|jpe?g|webp)$/i.test(fileName)) continue;
    if (semantic.some((entry) => entry.nome === fileName)) continue;
    semantic.push({
      src: null,
      nome: fileName,
      id: null,
      sku: null,
      normalizedName: normalizeSearch(fileName.replace(/\.[^.]+$/, "")),
    });
  }

  return { byId, bySku, semantic };
}

function resolveImage(
  row: ReturnType<typeof normalizeBlingRow>,
  imageIndex: ReturnType<typeof buildImageIndex>,
  staticImageFile?: string
): ImageMatch {
  if (row.imageUrl) {
    return { url: row.imageUrl, source: "BLING", reason: "bling_image_field" };
  }

  if (imageIndex.byId.has(row.id)) {
    return imageMatchToUrl(imageIndex.byId.get(row.id), "MARKETPLACE", "bling_id");
  }

  if (row.sku && imageIndex.bySku.has(row.sku)) {
    return imageMatchToUrl(imageIndex.bySku.get(row.sku), "MARKETPLACE", "sku");
  }

  if (staticImageFile && uploadFileExists(staticImageFile)) {
    return { url: `/uploads/products/${staticImageFile}`, source: "STATIC", reason: "static_catalog_sku" };
  }

  const productTokens = tokenize(row.name);
  let best: { item: ImageIndexEntry; score: number } | null = null;

  for (const item of imageIndex.semantic) {
    const score = similarityScore(productTokens, tokenize(item.nome || item.src || ""));
    if (!best || score > best.score) best = { item, score };
  }

  if (best && best.score >= 0.62) {
    return imageMatchToUrl(best.item, "MARKETPLACE", `nome_parecido_${best.score.toFixed(2)}`);
  }

  return { url: "", source: "NONE", reason: "sem_imagem" };
}

function imageMatchToUrl(
  item: ImageIndexEntry | undefined,
  source: "MARKETPLACE" | "STATIC",
  reason: string
): ImageMatch {
  if (!item) return { url: "", source: "NONE", reason: "sem_imagem" };
  const fileName = item.nome || item.src || "";
  if (!fileName) return { url: "", source: "NONE", reason: "sem_imagem" };

  if (uploadFileExists(fileName)) {
    return { url: `/uploads/products/${fileName}`, source, reason };
  }

  return { url: "", source: "NONE", reason: "arquivo_nao_encontrado" };
}

function findStaticProduct(row: ReturnType<typeof normalizeBlingRow>) {
  const staticProducts = Array.from(STATIC_SEX_SHOP_CATALOG.values());

  if (row.sku) {
    const bySku = staticProducts.find((product) => product.sku === row.sku);
    if (bySku) return bySku;
  }

  const normalizedName = normalizeSearch(row.name);
  return staticProducts.find((product) => normalizeSearch(product.name) === normalizedName) ?? null;
}

function inferCategory(name: string, blingCategory?: string) {
  const fromBling = mapBlingCategory(blingCategory);
  if (isAdultCatalogProduct({ name, categoryName: blingCategory, categorySlug: fromBling?.categorySlug })) {
    const normalizedName = normalizeSearch(name);
    return { categorySlug: "sex-shop", subcategorySlug: inferAdultSubcategory(normalizedName) };
  }

  if (fromBling) return fromBling;

  const n = normalizeSearch(name);

  if (/\b(case|capinha|capa|iphone|ip\s*\d+|pelicula|carregador|fone|cabo)\b/.test(n)) {
    return { categorySlug: "capinhas-acessorios-celular", subcategorySlug: null };
  }

  if (/\b(cachecol|gorro|luva|inverno|touca)\b/.test(n)) {
    return { categorySlug: "acessorios-inverno", subcategorySlug: null };
  }

  if (/\b(oculos|oculo)\b/.test(n)) {
    return { categorySlug: "oculos", subcategorySlug: "oculos-adulto" };
  }

  if (/\b(bolsa|necessaire|carteira|porta joia|porta joias)\b/.test(n)) {
    return { categorySlug: "bolsas-necessaires", subcategorySlug: null };
  }

  if (isAdultProductName(n)) {
    return { categorySlug: "sex-shop", subcategorySlug: inferAdultSubcategory(n) };
  }

  if (/\b(brinco|colar|pulseira|bracelete|broche|anel|biju|missanga|pingente|argola)\b/.test(n)) {
    return { categorySlug: "bijuterias", subcategorySlug: null };
  }

  if (/\b(make|maquiagem|batom|rimel|mascara|gloss|sombra|base|corretivo|blush|delineador|sobrancelha)\b/.test(n)) {
    return { categorySlug: "maquiagem", subcategorySlug: null };
  }

  if (/\b(perfume|colonia|body splash|hidratante|sabonete|shampoo|condicionador|capilar|pomada modeladora)\b/.test(n)) {
    return { categorySlug: "perfumaria", subcategorySlug: null };
  }

  if (/\b(pijama|camisola|lingerie|calcinha|sutia|body)\b/.test(n)) {
    return { categorySlug: "lingerie", subcategorySlug: null };
  }

  if (/\b(pet|coleira|guia)\b/.test(n)) {
    return { categorySlug: "pet", subcategorySlug: null };
  }

  if (/\b(caderno|caneta|lapis|papel|estojo)\b/.test(n)) {
    return { categorySlug: "papelaria", subcategorySlug: null };
  }

  if (/\b(brinquedo|boneca|bola|carrinho|jogo)\b/.test(n)) {
    return { categorySlug: "brinquedos", subcategorySlug: null };
  }

  if (/\b(decor|quadro|porta retrato|flor|vaso)\b/.test(n)) {
    return { categorySlug: "decoracao", subcategorySlug: null };
  }

  return { categorySlug: "bijuterias", subcategorySlug: null };
}

function mapBlingCategory(value?: string) {
  const normalized = normalizeSearch(value ?? "");
  if (!normalized) return null;

  const aliases: Record<string, { categorySlug: string; subcategorySlug: string | null }> = {
    "sex shop": { categorySlug: "sex-shop", subcategorySlug: null },
    adulto: { categorySlug: "sex-shop", subcategorySlug: null },
    "linha adulto": { categorySlug: "sex-shop", subcategorySlug: null },
    bijuterias: { categorySlug: "bijuterias", subcategorySlug: null },
    bijoux: { categorySlug: "bijuterias", subcategorySlug: null },
    "capinhas e acessorios de celular": { categorySlug: "capinhas-acessorios-celular", subcategorySlug: null },
    capinhas: { categorySlug: "capinhas-acessorios-celular", subcategorySlug: null },
    oculos: { categorySlug: "oculos", subcategorySlug: "oculos-adulto" },
    lingerie: { categorySlug: "lingerie", subcategorySlug: null },
    maquiagem: { categorySlug: "maquiagem", subcategorySlug: null },
    perfumaria: { categorySlug: "perfumaria", subcategorySlug: null },
    papelaria: { categorySlug: "papelaria", subcategorySlug: null },
    brinquedos: { categorySlug: "brinquedos", subcategorySlug: null },
  };

  if (aliases[normalized]) return aliases[normalized];

  const category = CATALOG_CATEGORIES.find((item) => {
    const terms = [item.name, item.publicName, item.slug].map(normalizeSearch);
    return terms.some((term) => term && (term === normalized || normalized.includes(term)));
  });

  return category ? { categorySlug: category.slug, subcategorySlug: null } : null;
}

function inferAdultSubcategory(n: string) {
  if (/\b(desodorante)\b/.test(n)) return "sex-shop-desodorantes";
  if (/\b(jogo|roleta|baralho|duelo|seducao)\b/.test(n)) return "sex-shop-jogos";
  if (/\b(protese|dildo|escroto|mydick)\b/.test(n)) return "sex-shop-proteses";
  if (/\b(plug|algema|tapa|mamilo|adesivo|chicote|colar|mascara|cinta|castidade)\b/.test(n)) return "sex-shop-acessorios";
  if (/\b(vibrador|bullet|sugador|golfinho|magic rose)\b/.test(n)) return "sex-shop-vibradores";
  if (/\b(anel|peniano|dedeira)\b/.test(n)) return "sex-shop-aneis";
  if (/\b(masturbador|egg)\b/.test(n)) return "sex-shop-masturbadores";
  if (/\b(lub|lubrificante|k med|k-med)\b/.test(n)) return "sex-shop-lubrificantes";
  if (/\b(tesao|pocao|bala)\b/.test(n)) return "sex-shop-balas-liquidas";
  return "sex-shop-geis-e-cremes";
}

function sortCatalogProducts(products: BlingCatalogProduct[], sort?: string | null) {
  const sorted = [...products];

  if (sort === "price_asc" || sort === "menor-preco") {
    return sorted.sort((a, b) => a.price - b.price || (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0));
  }

  if (sort === "price_desc" || sort === "maior-preco") {
    return sorted.sort((a, b) => b.price - a.price || (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0));
  }

  if (sort === "best_sellers" || sort === "mais-vendidos") {
    return sorted.sort((a, b) => b.stock - a.stock || (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0));
  }

  return sorted.sort((a, b) => (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0));
}

function uniqueSlug(baseSlug: string, id: string, usedSlugs: Set<string>) {
  const base = baseSlug || `produto-${id}`;
  let slug = base;
  if (usedSlugs.has(slug)) slug = `${base}-${id}`;
  usedSlugs.add(slug);
  return slug;
}

function uploadFileExists(fileName: string) {
  return (uploadImageFiles as string[]).includes(fileName);
}

function similarityScore(aTokens: string[], bTokens: string[]) {
  if (!aTokens.length || !bTokens.length) return 0;
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  let common = 0;
  for (const token of Array.from(a)) {
    if (b.has(token)) common += 1;
  }
  return common / Math.max(a.size, 3);
}

function tokenize(value: string) {
  const stopwords = new Set(["de", "da", "do", "das", "dos", "com", "cor", "para", "e", "a", "o", "em", "ml", "g"]);
  return normalizeSearch(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !stopwords.has(token));
}

function slugify(value: string) {
  return normalizeSearch(value)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSpaces(value: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeCell(value: string | number | null | undefined) {
  return normalizeSpaces(String(value ?? ""));
}

function normalizeSearch(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toOptionalNumber(value?: string | null) {
  if (!value) return null;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}
