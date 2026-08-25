import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductListingPage from "@/components/loja/ProductListingPage";
import { getCategoryBySlug, getPublicCategoryName, getSubcategoryByPath } from "@/lib/catalog";

export const revalidate = 60;

export async function generateMetadata(props: { params: Promise<{ slug: string; subcategoria: string }> }): Promise<Metadata> {
  const params = await props.params;
  const category = getCategoryBySlug(params.slug);
  const subcategory = getSubcategoryByPath(params.slug, params.subcategoria);
  if (!category || !subcategory) return { title: "Categoria" };

  return {
    title: `${getPublicCategoryName(category)} - ${subcategory.name}`,
    description: subcategory.description,
  };
}

export default async function SubcategoriaPage(
  props: {
    params: Promise<{ slug: string; subcategoria: string }>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
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
