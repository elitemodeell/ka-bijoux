import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import ProductDetailPage from "@/components/loja/ProductDetailPage";
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
  type BlingCatalogProduct,
  type ProductCardProduct,
} from "@/lib/bling-catalog";

export const dynamic = "force-dynamic";

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

type RelatedDbProduct = Prisma.ProductGetPayload<{
  include: {
    category: true;
    subcategory: true;
    images: true;
    variations: true;
  };
}>;

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
      2500
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

async function getCanonicalProduct(slug: string) {
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
  const canonicalSlug = getCanonicalProductSlug({
    blingId: blingProduct?.blingId ?? dbProduct?.blingId,
    sku: blingProduct?.sku ?? dbProduct?.sku ?? staticProduct?.sku,
    slug: blingProduct?.slug ?? dbProduct?.slug ?? staticProduct?.slug ?? slug,
    name: blingProduct?.name ?? dbProduct?.name ?? staticProduct?.name,
  }) ?? slug;

  return { dbProduct, blingProduct, staticProduct, canonicalSlug };
}

function normalizeProductText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dbProduct, blingProduct, staticProduct } = await getCanonicalProduct(params.slug);

  const name = blingProduct?.name ?? staticProduct?.name ?? dbProduct?.name ?? "Produto";
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
  if (!dbProduct && !blingProduct && !staticProduct) notFound();
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
        variations: { where: { active: true } },
      },
      take: 8,
    });

    const subcategoryName =
      dbProduct.subcategory?.name ??
      blingProduct?.subcategory?.name ??
      getSubcategoryName(dbProduct.subcategory?.slug ?? "");
    const subcategoryPathSlug = getSubcategoryPathSlug(
      dbProduct.subcategory?.slug ?? ""
    );
    const dbImages = dbProduct.images.map((image) => image.url);
    const galleryImages = dbImages.length ? dbImages : blingProduct?.images.map((image) => image.url) ?? [];
    const currentIdentity = new Set(getProductIdentityKeys({
      blingId: blingProduct?.blingId ?? dbProduct.blingId,
      sku: blingProduct?.sku ?? dbProduct.sku,
      slug: canonicalSlug,
      name: blingProduct?.name ?? dbProduct.name,
    }));
    const relatedProducts = dedupeProductCards(
      relatedDbProducts
        .map(mapRelatedDbProduct)
        .filter((product): product is ProductCardProduct => Boolean(product))
    ).filter((product) => !getProductIdentityKeys(product).some((key) => currentIdentity.has(key)));

    const adaptedProduct = {
      slug: canonicalSlug,
      name: blingProduct?.name ?? dbProduct.name,
      sku: blingProduct?.sku ?? dbProduct.sku ?? "",
      brand: dbProduct.brand ?? undefined,
      ean: dbProduct.ean ?? undefined,
      price: blingProduct?.price ?? Number(dbProduct.price),
      promotionalPrice: blingProduct ? null : dbProduct.promotionalPrice ? Number(dbProduct.promotionalPrice) : null,
      categoryName: dbProduct.category?.name ?? blingProduct?.category.name ?? "KA Bijoux",
      categorySlug: dbProduct.category?.slug ?? blingProduct?.category.slug ?? "produtos",
      subcategoryName,
      subcategorySlug: dbProduct.subcategory?.slug ?? blingProduct?.subcategory?.slug ?? "",
      imageFile: galleryImages[0] ?? "",
      galleryImages,
      shortDescription:
        dbProduct.description?.split("\n")[0] ??
        blingProduct?.description ??
        "Produto selecionado com carinho pela KA Bijoux.",
      longDescription: dbProduct.description ?? "",
      details: [] as string[],
      benefits: dbProduct.benefits ?? undefined,
      howToUse: dbProduct.howToUse ?? "",
      composition: dbProduct.composition ?? undefined,
      careInstructions: dbProduct.careInstructions ?? undefined,
      packageContents: dbProduct.packageContents ?? undefined,
      weight: Number(dbProduct.weight),
      height: Number(dbProduct.height),
      width: Number(dbProduct.width),
      length: Number(dbProduct.length),
      variations: dbProduct.variations.map((variation) => ({
        label: `${variation.name}: ${variation.value}`,
        slug: `${variation.name}-${variation.value}`
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        active: variation.stock > 0,
      })),
      relatedSlugs: [] as string[],
      relatedProducts,
      badge: dbProduct.isNew ? "Novo" : dbProduct.featured ? "Destaque" : undefined,
      stock: blingProduct?.stock ?? dbProduct.stock,
      installments: 3,
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
      }}
      subcategoryName={subcategoryName}
      subcategoryPathSlug={subcategoryPathSlug}
    />
  );
}

function mapRelatedDbProduct(product: RelatedDbProduct): ProductCardProduct | null {
  const bling = findBlingProductForSource({
    blingId: product.blingId,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
  });

  if (bling && (!bling.active || bling.stock <= 0)) return null;

  const dbImage = product.images[0]?.url ?? null;
  const image = dbImage ?? bling?.image ?? null;
  const promotionalPrice = bling
    ? null
    : product.promotionalPrice
      ? Number(product.promotionalPrice)
      : null;

  return {
    id: product.id,
    name: bling?.name ?? product.name,
    slug: getCanonicalProductSlug({
      blingId: bling?.blingId ?? product.blingId,
      sku: bling?.sku ?? product.sku,
      slug: product.slug,
      name: bling?.name ?? product.name,
    }) ?? product.slug,
    price: bling?.price ?? Number(product.price),
    promotionalPrice,
    image,
    images: image ? [{ url: image, alt: product.name }] : [],
    badge: product.isNew ? "Novo" : product.featured ? "Destaque" : bling?.badge ?? null,
    stock: bling?.stock ?? product.stock,
    sku: bling?.sku ?? product.sku,
    description: product.description || bling?.description,
    category: product.category ? { name: product.category.name, slug: product.category.slug } : bling?.category ?? null,
    subcategory: product.subcategory ? { name: product.subcategory.name, slug: product.subcategory.slug } : bling?.subcategory ?? null,
  };
}

function buildBlingDetailProduct(product: BlingCatalogProduct) {
  const productFamily = getProductFamilyName(product.name);
  const relatedProducts = dedupeProductCards(getBlingProductCards({
    categorySlug: product.category.slug,
    subcategorySlug: product.subcategory?.slug,
    limit: 24,
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
    name: product.name,
    sku: product.sku ?? "",
    ean: product.ean ?? undefined,
    price: product.price,
    promotionalPrice: null,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    subcategoryName: product.subcategory?.name ?? product.category.name,
    subcategorySlug: product.subcategory?.slug ?? "",
    imageFile: product.image ?? "",
    galleryImages: product.images.map((image) => image.url),
    shortDescription: product.description ?? "",
    longDescription: "",
    details: product.staticDetails ?? [],
    benefits: undefined,
    howToUse: "",
    composition: undefined,
    careInstructions: undefined,
    packageContents: undefined,
    relatedSlugs: [] as string[],
    relatedProducts,
    badge: product.badge ?? undefined,
    stock: product.stock,
    installments: 3,
  };
}

function getProductFamilyName(name: string) {
  return normalizeProductText(name)
    .replace(/\b(preto|preta|rosa|marrom|branco|branca|vermelho|vermelha)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
