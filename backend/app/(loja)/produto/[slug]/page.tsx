import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { Prisma } from "@prisma/client";
import ProductDetailPage from "@/components/loja/ProductDetailPage";
import productContentOverrides from "@/data/product-content-overrides.json";
import {
  getStaticProduct,
  getSubcategoryName,
  getSubcategoryPathSlug,
} from "@/lib/static-sex-shop-catalog";
import { prisma } from "@/lib/prisma";
import {
  dedupeProductCards,
  findBlingProductForSource,
  getCanonicalProductSlug,
  getBlingProductBySlug,
  getBlingProductCards,
  getProductIdentityKeys,
  isAdultImageUrl,
  type BlingCatalogProduct,
  type ProductCardProduct,
} from "@/lib/bling-catalog";
import { getProductCatalogLine, matchesCatalogLine } from "@/lib/product-line";

export const revalidate = 60;

const DETAIL_DB_TIMEOUT_MS = 5000;

type PageProps = {
  params: { slug: string };
};

type ProductLookup = {
  slug: string;
  sku?: string | null;
  blingId?: string | null;
};

const detailProductInclude = {
  category: true,
  subcategory: true,
  images: { orderBy: { order: "asc" as const } },
  variations: { where: { active: true } },
};

type DetailDbRecord = Prisma.ProductGetPayload<{ include: typeof detailProductInclude }>;

type DbProduct = {
  id: string;
  name: string;
  slug: string | null;
  sku: string | null;
  brand: string | null;
  ean: string | null;
  description: string | null;
  benefits: string | null;
  howToUse: string | null;
  composition: string | null;
  careInstructions: string | null;
  packageContents: string | null;
  price: number | string;
  promotionalPrice: number | string | null;
  stock: number;
  weight: number | string;
  height: number | string;
  width: number | string;
  length: number | string;
  featured: boolean;
  isNew: boolean;
  blingId: string | null;
  categoryId: string;
  subcategoryId: string | null;
  category: { name: string; slug: string } | null;
  subcategory: { name: string; slug: string } | null;
  images: { url: string; alt: string | null; order: number }[];
  variations: {
    id: string;
    name: string;
    value: string;
    stock: number;
    priceModifier: number | string;
    active: boolean;
  }[];
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
  benefits?: string | null;
  howToUse?: string | null;
  composition?: string | null;
  careInstructions?: string | null;
  packageContents?: string | null;
  galleryImages?: string[];
  variations?: ProductContentVariation[];
  variants?: ProductContentVariation[];
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

const contentOverrides = Array.isArray(productContentOverrides)
  ? (productContentOverrides as ProductContentOverride[])
  : (Object.values(productContentOverrides) as ProductContentOverride[]);

type RelatedDbProduct = Prisma.ProductGetPayload<{
  include: {
    category: true;
    subcategory: true;
    images: true;
  };
}>;

type StaticRelatedProduct = NonNullable<ReturnType<typeof getStaticProduct>>;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

async function fetchDbProduct(lookup: ProductLookup): Promise<DbProduct | null> {
  try {
    const identityFilters: Prisma.ProductWhereInput[] = [{ slug: lookup.slug }];
    if (lookup.sku) identityFilters.push({ sku: lookup.sku });
    if (lookup.blingId) identityFilters.push({ blingId: lookup.blingId });

    const products = await withTimeout(
      prisma.product.findMany({
        where: {
          active: true,
          OR: identityFilters,
        },
        include: detailProductInclude,
        take: 10,
      }),
      DETAIL_DB_TIMEOUT_MS
    );
    const product = [...products].sort(
      (a, b) => scoreDbCandidate(b, lookup) - scoreDbCandidate(a, lookup)
    )[0];
    if (!product) return null;
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      brand: product.brand,
      ean: product.ean,
      description: product.description,
      benefits: product.benefits,
      howToUse: product.howToUse,
      composition: product.composition,
      careInstructions: product.careInstructions,
      packageContents: product.packageContents,
      price: Number(product.price),
      promotionalPrice: product.promotionalPrice ? Number(product.promotionalPrice) : null,
      stock: product.stock,
      weight: Number(product.weight),
      height: Number(product.height),
      width: Number(product.width),
      length: Number(product.length),
      featured: product.featured,
      isNew: product.isNew,
      blingId: product.blingId,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId,
      category: product.category
        ? { name: product.category.name, slug: product.category.slug }
        : null,
      subcategory: product.subcategory
        ? { name: product.subcategory.name, slug: product.subcategory.slug }
        : null,
      images: product.images.map((img) => ({
        url: img.url,
        alt: img.alt,
        order: img.order,
      })),
      variations: product.variations.map((variation) => ({
        id: variation.id,
        name: variation.name,
        value: variation.value,
        stock: variation.stock,
        priceModifier: Number(variation.priceModifier),
        active: variation.active,
      })),
    };
  } catch {
    return null;
  }
}

function scoreDbCandidate(product: DetailDbRecord, lookup: ProductLookup) {
  let score = 0;
  if (lookup.blingId && product.blingId === lookup.blingId) score += 100;
  if (lookup.sku && product.sku === lookup.sku) score += 80;
  if (product.slug === lookup.slug) score += 5;

  const normalizedDescription = normalizeProductText(product.description ?? "");
  const placeholder = ["revisao", "nao informado", "importado da bling", "informacoes tecnicas pendentes"]
    .some((term) => normalizedDescription.includes(term));
  if (!placeholder && product.description?.trim().length >= 80) {
    score += 30 + Math.min(20, Math.floor(product.description.length / 200));
  }

  [product.benefits, product.howToUse, product.composition, product.careInstructions, product.packageContents]
    .forEach((value) => {
      if (value?.trim()) score += 10;
    });
  if (product.images.length) score += 8;
  if (product.variations.length) score += 4;
  return score;
}

const getCanonicalProduct = cache(async function getCanonicalProduct(slug: string) {
  const blingBySlug = getBlingProductBySlug(slug);
  const staticBySlug = getStaticProduct(slug);
  const staticBlingProduct = staticBySlug
    ? findBlingProductForSource({
        sku: staticBySlug.sku,
        slug: staticBySlug.slug,
        name: staticBySlug.name,
      })
    : null;
  const catalogProduct = blingBySlug ?? staticBlingProduct;
  const dbProduct = await fetchDbProduct({
    slug,
    sku: catalogProduct?.sku ?? staticBySlug?.sku,
    blingId: catalogProduct?.blingId,
  });
  const blingProduct = dbProduct
    ? findBlingProductForSource({
        blingId: dbProduct.blingId,
        sku: dbProduct.sku,
        slug: dbProduct.slug,
        name: dbProduct.name,
      }) ?? catalogProduct
    : catalogProduct;
  const staticProduct =
    (blingProduct?.staticSlug ? getStaticProduct(blingProduct.staticSlug) : null) ??
    staticBySlug;
  const fallbackCanonicalSlug = getCanonicalProductSlug({
    blingId: blingProduct?.blingId,
    sku: blingProduct?.sku ?? staticProduct?.sku,
    slug: blingProduct?.slug ?? staticProduct?.slug ?? slug,
    name: blingProduct?.name ?? staticProduct?.name,
  }) ?? slug;
  const canonicalSlug = dbProduct?.slug?.trim() || fallbackCanonicalSlug;

  return { dbProduct, blingProduct, staticProduct, canonicalSlug };
});

function normalizeProductText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dbProduct, blingProduct, staticProduct } = await getCanonicalProduct(params.slug);

  const name = dbProduct?.name ?? staticProduct?.name ?? blingProduct?.name ?? "Produto";
  const rawDescription =
    dbProduct?.description?.slice(0, 160) ??
    blingProduct?.description ??
    staticProduct?.shortDescription ??
    null;
  const description = getPublicMetadataDescription(rawDescription, name);

  return {
    title: `${name} | KA Bijoux`,
    description,
  };
}

function getPublicMetadataDescription(value: string | null | undefined, productName: string) {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const blocked = ["nao informado", "revisao", "informacoes tecnicas pendentes", "importado da bling"];
  if (value && value.trim().length >= 30 && !blocked.some((term) => normalized.includes(term))) {
    return value.trim().slice(0, 160);
  }
  return `${productName} na KA Bijoux. Compra segura, atendimento cuidadoso e entrega discreta.`;
}

export default async function ProdutoPage({ params }: PageProps) {
  const { dbProduct, blingProduct, staticProduct, canonicalSlug } = await getCanonicalProduct(params.slug);
  if (!dbProduct) notFound();
  if (params.slug !== canonicalSlug) redirect(`/produto/${canonicalSlug}`);

  if (dbProduct) {
    const relatedDbProducts = await prisma.product.findMany({
      where: {
        active: true,
        id: { not: dbProduct.id },
        OR: dbProduct.subcategoryId
          ? [{ subcategoryId: dbProduct.subcategoryId }, { categoryId: dbProduct.categoryId }]
          : [{ categoryId: dbProduct.categoryId }],
      },
      include: {
        category: true,
        subcategory: true,
        images: { orderBy: { order: "asc" }, take: 1 },
      },
      take: 8,
    });

    const subcategoryName = dbProduct.subcategory?.name ?? "";
    const subcategoryPathSlug = dbProduct.subcategory
      ? getSubcategoryPathSlug(dbProduct.subcategory.slug)
      : "";
    const isAdultProduct = dbProduct.category?.slug === "sex-shop";
    const rawDbImages = dbProduct.images.map((image) => image.url);
    const dbImages = isAdultProduct ? rawDbImages : rawDbImages.filter((url) => !isAdultImageUrl(url));
    const galleryImages = dbImages;
    const contentOverride = getProductContentOverride({
      blingId: dbProduct.blingId,
      sku: dbProduct.sku,
      name: dbProduct.name,
    });
    const currentIdentity = new Set(getProductIdentityKeys({
      blingId: dbProduct.blingId,
      sku: dbProduct.sku,
      slug: canonicalSlug,
      name: dbProduct.name,
    }));
    const currentCatalogLine = getProductCatalogLine({
      name: dbProduct.name,
      categorySlug: dbProduct.category?.slug,
      categoryName: dbProduct.category?.name,
      subcategorySlug: dbProduct.subcategory?.slug,
      subcategoryName: dbProduct.subcategory?.name,
    });
    const relatedProducts = dedupeProductCards(
      relatedDbProducts
        .map(mapRelatedDbProduct)
        .filter((product): product is ProductCardProduct => Boolean(product))
    ).filter(
      (product) =>
        matchesCatalogLine(
          {
            name: product.name,
            categorySlug: product.category?.slug,
            categoryName: product.category?.name,
            subcategorySlug: product.subcategory?.slug,
            subcategoryName: product.subcategory?.name,
          },
          currentCatalogLine
        ) && !getProductIdentityKeys(product).some((key) => currentIdentity.has(key))
    );

    const overrideGalleryImages = getOverrideGalleryImages(contentOverride, galleryImages);
    const dbVariations = dbProduct.variations.map((variation) => ({
      label: `${variation.name}: ${variation.value}`,
      slug: `${variation.name}-${variation.value}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      active: variation.stock > 0,
    }));
    const overrideVariations = getOverrideVariations(contentOverride);

    const adaptedProduct = {
      slug: canonicalSlug,
      name: dbProduct.name,
      sku: dbProduct.sku ?? blingProduct?.sku ?? "",
      brand: dbProduct.brand ?? undefined,
      ean: dbProduct.ean ?? undefined,
      price: blingProduct?.price ?? Number(dbProduct.price),
      promotionalPrice: blingProduct ? null : dbProduct.promotionalPrice ? Number(dbProduct.promotionalPrice) : null,
      categoryName: dbProduct.category?.name ?? "KA Bijoux",
      categorySlug: dbProduct.category?.slug ?? "produtos",
      subcategoryName,
      subcategorySlug: dbProduct.subcategory?.slug ?? "",
      imageFile: overrideGalleryImages[0] ?? "",
      galleryImages: overrideGalleryImages,
      shortDescription:
        dbProduct.description?.split("\n")[0] ??
        contentOverride?.shortDescription ??
        "Produto selecionado com carinho pela KA Bijoux.",
      longDescription: dbProduct.description ?? contentOverride?.longDescription ?? "",
      details: contentOverride?.details ?? [] as string[],
      benefits: dbProduct.benefits ?? contentOverride?.benefits ?? undefined,
      howToUse: dbProduct.howToUse ?? contentOverride?.howToUse ?? "",
      composition: dbProduct.composition ?? contentOverride?.composition ?? undefined,
      careInstructions: dbProduct.careInstructions ?? contentOverride?.careInstructions ?? undefined,
      packageContents: dbProduct.packageContents ?? contentOverride?.packageContents ?? undefined,
      weight: Number(dbProduct.weight),
      height: Number(dbProduct.height),
      width: Number(dbProduct.width),
      length: Number(dbProduct.length),
      variations: overrideVariations.length ? overrideVariations : dbVariations,
      relatedSlugs: [] as string[],
      relatedProducts,
      badge: dbProduct.isNew ? "Novo" : dbProduct.featured ? "Destaque" : undefined,
      stock: dbProduct.stock,
      installments: 3,
      isAdult: isAdultProduct,
    };

    return (
      <ProductDetailPage
        product={adaptedProduct}
        subcategoryName={subcategoryName}
        subcategoryPathSlug={subcategoryPathSlug}
      />
    );
  }

  if (blingProduct) {
    return (
      <ProductDetailPage
        product={buildBlingDetailProduct(blingProduct)}
        subcategoryName={blingProduct.subcategory?.name ?? blingProduct.category.name}
        subcategoryPathSlug={getSubcategoryPathSlug(blingProduct.subcategory?.slug ?? "")}
      />
    );
  }

  if (!staticProduct) notFound();
  const staticBlingProduct = findBlingProductForSource({
    sku: staticProduct.sku,
    slug: staticProduct.slug,
    name: staticProduct.name,
  });
  const subcategoryName = getSubcategoryName(staticProduct.subcategorySlug);
  const subcategoryPathSlug = getSubcategoryPathSlug(staticProduct.subcategorySlug);
  const relatedProducts = staticProduct.relatedSlugs
    .map((slug) => getStaticProduct(slug))
    .filter((product): product is StaticRelatedProduct => Boolean(product))
    .map((product) => mapStaticRelatedProduct(product, "KA Bijoux", "produtos"))
    .slice(0, 8);

  return (
    <ProductDetailPage
      product={{
        ...staticProduct,
        name: staticBlingProduct?.name ?? staticProduct.name,
        price: staticBlingProduct?.price ?? staticProduct.price,
        stock: staticBlingProduct?.stock ?? staticProduct.stock,
        categoryName: "KA Bijoux",
        categorySlug: "produtos",
        subcategoryName,
        relatedProducts,
      }}
      subcategoryName={subcategoryName}
      subcategoryPathSlug={subcategoryPathSlug}
    />
  );
}

function mapStaticRelatedProduct(
  product: StaticRelatedProduct,
  categoryName: string,
  categorySlug: string
): ProductCardProduct {
  return {
    id: product.sku || product.slug,
    name: product.name,
    slug: product.slug,
    price: product.price,
    image: toPublicImageUrl(product.imageFile),
    images: [{ url: toPublicImageUrl(product.imageFile), alt: product.name }],
    badge: product.badge ?? null,
    stock: product.stock,
    sku: product.sku,
    description: product.shortDescription,
    category: { name: categoryName, slug: categorySlug },
    subcategory: {
      name: getSubcategoryName(product.subcategorySlug),
      slug: product.subcategorySlug,
    },
    catalogLine: "adult",
    isAdult: true,
  };
}

function mapRelatedDbProduct(product: RelatedDbProduct): ProductCardProduct | null {
  const bling = findBlingProductForSource({
    blingId: product.blingId,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
  });

  const rawDbImage = product.images[0]?.url ?? null;
  const isAdultRelated = product.category?.slug === "sex-shop";
  const dbImage = rawDbImage && !isAdultRelated && isAdultImageUrl(rawDbImage) ? null : rawDbImage;
  const image = dbImage ?? null;
  const promotionalPrice = bling
    ? null
    : product.promotionalPrice
      ? Number(product.promotionalPrice)
      : null;
  const category = product.category ? { name: product.category.name, slug: product.category.slug } : null;
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

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: bling?.price ?? Number(product.price),
    promotionalPrice,
    image,
    images: image ? [{ url: image, alt: product.name }] : [],
    badge: product.isNew ? "Novo" : product.featured ? "Destaque" : null,
    stock: product.stock,
    sku: product.sku,
    description: product.description,
    category,
    subcategory,
    catalogLine,
    isAdult: catalogLine === "adult",
  };
}

function buildBlingDetailProduct(product: BlingCatalogProduct) {
  const contentOverride = getProductContentOverride(product);
  const galleryImages = getOverrideGalleryImages(
    contentOverride,
    product.images.map((image) => image.url)
  );
  const variations = getOverrideVariations(contentOverride);
  const productFamily = getProductFamilyName(product.name);
  const relatedProducts = dedupeProductCards(getBlingProductCards({
    categorySlug: product.category.slug,
    subcategorySlug: product.subcategory?.slug,
    catalogLine: product.catalogLine,
    limit: 12,
  }))
    .filter((related) => related.slug !== product.slug)
    .sort((a, b) => {
      const aIsSibling = getProductFamilyName(a.name) === productFamily ? 1 : 0;
      const bIsSibling = getProductFamilyName(b.name) === productFamily ? 1 : 0;
      return bIsSibling - aIsSibling;
    })
    .slice(0, 8);

  return {
    slug: product.slug,
    name: contentOverride?.displayName ?? product.name,
    sku: product.sku ?? "",
    ean: product.ean ?? undefined,
    price: product.price,
    promotionalPrice: null,
    categoryName: contentOverride?.categoryName ?? product.category.name,
    categorySlug: product.category.slug,
    subcategoryName: contentOverride?.subcategoryName ?? product.subcategory?.name ?? product.category.name,
    subcategorySlug: product.subcategory?.slug ?? "",
    imageFile: galleryImages[0] ?? product.image ?? "",
    galleryImages,
    shortDescription: contentOverride?.shortDescription ?? product.description ?? "",
    longDescription: contentOverride?.longDescription ?? "",
    details: contentOverride?.details ?? product.staticDetails ?? [],
    benefits: contentOverride?.benefits ?? undefined,
    howToUse: contentOverride?.howToUse ?? "",
    composition: contentOverride?.composition ?? undefined,
    careInstructions: contentOverride?.careInstructions ?? undefined,
    packageContents: contentOverride?.packageContents ?? undefined,
    relatedSlugs: [] as string[],
    relatedProducts,
    variations,
    badge: product.badge ?? undefined,
    stock: product.stock,
    installments: 3,
    isAdult: contentOverride?.isAdult ?? product.isAdult,
  };
}

function getOverrideGalleryImages(contentOverride: ProductContentOverride | null, fallback: string[]) {
  const overrideImages = contentOverride?.galleryImages
    ?.filter(Boolean)
    .map(toPublicImageUrl) ?? [];
  return overrideImages.length ? overrideImages : fallback;
}

function getOverrideVariations(contentOverride: ProductContentOverride | null) {
  const variations = contentOverride?.variations ?? contentOverride?.variants ?? [];
  return variations
    .filter((variation) => variation?.label)
    .map((variation) => ({
      label: variation.label,
      slug: variation.slug ?? toVariationSlug(variation.label),
      color: variation.color,
      active: variation.active ?? true,
      sku: variation.sku,
      imageFile: variation.imageFile ? toPublicImageUrl(variation.imageFile) : undefined,
      images: variation.images?.filter(Boolean).map(toPublicImageUrl),
    }));
}

function toPublicImageUrl(image: string) {
  if (/^https?:\/\//i.test(image) || image.startsWith("/")) return image;
  return `/uploads/products/${image}`;
}

function toVariationSlug(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProductContentOverride(product: { blingId?: string | null; sku?: string | null; name?: string | null }) {
  const blingId = product.blingId ? String(product.blingId).trim() : "";
  const sku = product.sku ? String(product.sku).trim() : "";
  const normalizedName = normalizeProductText(product.name ?? "").trim();

  return (
    (blingId ? contentOverrides.find((item) => String(item.blingId ?? "").trim() === blingId) : null) ??
    (sku ? contentOverrides.find((item) => String(item.sku ?? "").trim() === sku) : null) ??
    (normalizedName ? contentOverrides.find((item) => normalizeProductText(item.name ?? "").trim() === normalizedName) : null) ??
    null
  );
}

function getProductFamilyName(name: string) {
  return normalizeProductText(name)
    .replace(/\b(preto|preta|rosa|marrom|branco|branca|vermelho|vermelha)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
