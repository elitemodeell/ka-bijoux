import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductListingPage from "@/components/loja/ProductListingPage";
import { getCategoryBySlug, getPublicCategoryName, getSubcategoryByPath } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { slug: string; subcategoria: string } }): Metadata {
  const category = getCategoryBySlug(params.slug);
  const subcategory = getSubcategoryByPath(params.slug, params.subcategoria);
  if (!category || !subcategory) return { title: "Categoria" };

  return {
    title: `${getPublicCategoryName(category)} - ${subcategory.name}`,
    description: subcategory.description,
  };
}

export default function SubcategoriaPage({
  params,
  searchParams,
}: {
  params: { slug: string; subcategoria: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const category = getCategoryBySlug(params.slug);
  const subcategory = getSubcategoryByPath(params.slug, params.subcategoria);
  if (!category || !subcategory) notFound();

  return (
    <ProductListingPage
      title={`${getPublicCategoryName(category)} - ${subcategory.name}`}
      description={subcategory.description}
      basePath={`/categoria/${category.slug}/${subcategory.pathSlug}`}
      searchParams={searchParams}
      categorySlug={category.slug}
      subcategorySlug={subcategory.slug}
      adultNotice={category.adult}
      catalogLine={category.adult ? "adult" : "normal"}
    />
  );
}
