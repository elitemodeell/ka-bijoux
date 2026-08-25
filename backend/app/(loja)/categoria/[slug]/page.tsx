import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductListingPage from "@/components/loja/ProductListingPage";
import { getCategoryBySlug, getPublicCategoryName } from "@/lib/catalog";

export const revalidate = 60;

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const category = getCategoryBySlug(params.slug);
  if (!category) return { title: "Categoria" };

  return {
    title: getPublicCategoryName(category),
    description: category.description,
  };
}

export default async function CategoriaPage(
  props: {
    params: Promise<{ slug: string }>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
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
