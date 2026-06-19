import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailPage from "@/components/loja/ProductDetailPage";
import {
  getStaticProduct,
  getSubcategoryName,
  getSubcategoryPathSlug,
} from "@/lib/static-sex-shop-catalog";
import { prisma } from "@/lib/prisma";

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
  categoryId: string;
  subcategoryId: string | null;
  category: { name: string; slug: string } | null;
  subcategory: { name: string; slug: string } | null;
  images: { url: string; alt: string | null; order: number }[];
};

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
  const staticProduct = dbProduct ? null : getStaticProduct(params.slug);

  const name = staticProduct?.name ?? dbProduct?.name ?? "Produto";
  const description =
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
      getSubcategoryName(dbProduct.subcategory?.slug ?? "");
    const subcategoryPathSlug = getSubcategoryPathSlug(
      dbProduct.subcategory?.slug ?? ""
    );

    const adaptedProduct = {
      slug: dbProduct.slug ?? params.slug,
      name: dbProduct.name,
      sku: dbProduct.sku ?? "",
      brand: dbProduct.brand ?? undefined,
      ean: dbProduct.ean ?? undefined,
      price: Number(dbProduct.price),
      promotionalPrice: dbProduct.promotionalPrice ? Number(dbProduct.promotionalPrice) : null,
      categoryName: dbProduct.category?.name ?? "KA Bijoux",
      categorySlug: dbProduct.category?.slug ?? "produtos",
      subcategoryName,
      subcategorySlug: dbProduct.subcategory?.slug ?? "",
      imageFile: dbProduct.images[0]?.url ?? "",
      galleryImages: dbProduct.images.map((image) => image.url),
      shortDescription:
        dbProduct.description?.split("\n")[0] ??
        "Produto selecionado com carinho pela KA Bijoux.",
      longDescription: dbProduct.description ?? "",
      details: [] as string[],
      benefits: dbProduct.benefits ?? undefined,
      howToUse: dbProduct.howToUse ?? "",
      composition: dbProduct.composition ?? undefined,
      careInstructions: dbProduct.careInstructions ?? undefined,
      packageContents: dbProduct.packageContents ?? undefined,
      relatedSlugs: [] as string[],
      relatedProducts: relatedDbProducts.map((related) => ({
        id: related.id,
        name: related.name,
        slug: related.slug,
        price: Number(related.price),
        promotionalPrice: related.promotionalPrice ? Number(related.promotionalPrice) : null,
        image: related.images[0]?.url ?? null,
        badge: related.isNew ? "Novo" : related.featured ? "Destaque" : null,
        stock: related.stock,
        sku: related.sku,
        description: related.description,
        category: related.category ? { name: related.category.name, slug: related.category.slug } : null,
        subcategory: related.subcategory ? { name: related.subcategory.name, slug: related.subcategory.slug } : null,
      })),
      badge: dbProduct.isNew ? "Novo" : dbProduct.featured ? "Destaque" : undefined,
      stock: dbProduct.stock,
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

  const staticProduct = getStaticProduct(params.slug);
  if (!staticProduct) notFound();
  const subcategoryName = getSubcategoryName(staticProduct.subcategorySlug);
  const subcategoryPathSlug = getSubcategoryPathSlug(staticProduct.subcategorySlug);

  return (
    <ProductDetailPage
      product={{
        ...staticProduct,
        categoryName: "KA Bijoux",
        categorySlug: "produtos",
        subcategoryName,
      }}
      subcategoryName={subcategoryName}
      subcategoryPathSlug={subcategoryPathSlug}
    />
  );
}
