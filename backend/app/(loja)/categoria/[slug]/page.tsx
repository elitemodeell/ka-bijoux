import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductListingPage from "@/components/loja/ProductListingPage";
import { getCategoryBySlug, getPublicCategoryName } from "@/lib/catalog";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const category = getCategoryBySlug(params.slug);
  if (!category) return { title: "Categoria" };

  return {
    title: getPublicCategoryName(category),
    description: category.description,
  };
}

export default function CategoriaPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const category = getCategoryBySlug(params.slug);
  if (!category) notFound();

  return (
    <ProductListingPage
      title={getPublicCategoryName(category)}
      description={category.description}
      basePath={`/categoria/${category.slug}`}
      searchParams={searchParams}
      categorySlug={category.slug}
      adultNotice={category.adult}
      catalogLine={category.adult ? "adult" : "normal"}
    />
  );
}
