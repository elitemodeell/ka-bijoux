import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import ProductDetailPage from "@/components/loja/ProductDetailPage";
import {
  getStaticProduct,
  getSubcategoryName,
  getSubcategoryPathSlug,
} from "@/lib/static-sex-shop-catalog";
import { prisma } from "@/lib/prisma";
import {
  findBlingProductForSource,
  getBlingProductBySlug,
  getBlingProductCards,
  type BlingCatalogProduct,
  type ProductCardProduct,
} from "@/lib/bling-catalog";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { slug: string };
};

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
  featured: boolean;
  isNew: boolean;
  blingId: string | null;
  categoryId: string;
  subcategoryId: string | null;
  category: { name: string; slug: string } | null;
  subcategory: { name: string; slug: string } | null;
  images: { url: string; alt: string | null; order: number }[];
};

type RelatedDbProduct = Prisma.ProductGetPayload<{
  include: {
    category: true;
    subcategory: true;
    images: true;
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

async function fetchDbProduct(slug: string): Promise<DbProduct | null> {
  try {
    const product = await withTimeout(
      prisma.product.findFirst({
        where: { slug, active: true },
        include: {
          category: true,
          subcategory: true,
          images: { orderBy: { order: "asc" } },
        },
      }),
      2500
    );
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
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const dbProduct = await fetchDbProduct(params.slug);
  const blingProduct = dbProduct
    ? findBlingProductForSource({
        blingId: dbProduct.blingId,
        sku: dbProduct.sku,
        slug: dbProduct.slug,
        name: dbProduct.name,
      })
    : getBlingProductBySlug(params.slug);
  const staticProduct = dbProduct || blingProduct ? null : getStaticProduct(params.slug);

  const name = blingProduct?.name ?? staticProduct?.name ?? dbProduct?.name ?? "Produto";
  const description =
    blingProduct?.description ??
    staticProduct?.shortDescription ??
    dbProduct?.description?.slice(0, 160) ??
    "Produto selecionado com carinho pela KA Bijoux.";

  return {
    title: `${name} | KA Bijoux`,
    description,
  };
}

export default async function ProdutoPage({ params }: PageProps) {
  const dbProduct = await fetchDbProduct(params.slug);

  if (dbProduct) {
    const blingProduct = findBlingProductForSource({
      blingId: dbProduct.blingId,
      sku: dbProduct.sku,
      slug: dbProduct.slug,
      name: dbProduct.name,
    });
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

    const subcategoryName =
      dbProduct.subcategory?.name ??
      blingProduct?.subcategory?.name ??
      getSubcategoryName(dbProduct.subcategory?.slug ?? "");
    const subcategoryPathSlug = getSubcategoryPathSlug(
      dbProduct.subcategory?.slug ?? ""
    );
    const dbImages = dbProduct.images.map((image) => image.url);
    const galleryImages = dbImages.length ? dbImages : blingProduct?.images.map((image) => image.url) ?? [];

    const adaptedProduct = {
      slug: dbProduct.slug ?? blingProduct?.slug ?? params.slug,
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
      relatedSlugs: [] as string[],
      relatedProducts: relatedDbProducts
        .map(mapRelatedDbProduct)
        .filter((product): product is ProductCardProduct => Boolean(product)),
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

  const blingProduct = getBlingProductBySlug(params.slug);
  if (blingProduct) {
    return (
      <ProductDetailPage
        product={buildBlingDetailProduct(blingProduct)}
        subcategoryName={blingProduct.subcategory?.name ?? blingProduct.category.name}
        subcategoryPathSlug={getSubcategoryPathSlug(blingProduct.subcategory?.slug ?? "")}
      />
    );
  }

  const staticProduct = getStaticProduct(params.slug);
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
    slug: product.slug ?? bling?.slug,
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
  const relatedProducts = getBlingProductCards({
    categorySlug: product.category.slug,
    subcategorySlug: product.subcategory?.slug,
    limit: 9,
  })
    .filter((related) => related.slug !== product.slug)
    .slice(0, 8);

  return {
    slug: product.slug,
    name: product.name,
    sku: product.sku ?? "",
    price: product.price,
    promotionalPrice: null,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    subcategoryName: product.subcategory?.name ?? product.category.name,
    subcategorySlug: product.subcategory?.slug ?? "",
    imageFile: product.image ?? "",
    galleryImages: product.images.map((image) => image.url),
    shortDescription: product.description ?? "Produto selecionado pela KA Bijoux.",
    longDescription: product.staticLongDescription ?? "",
    details: product.staticDetails ?? [],
    benefits: undefined,
    howToUse: product.staticHowToUse ?? "",
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
