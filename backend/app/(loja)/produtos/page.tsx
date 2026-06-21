import type { Metadata } from "next";
import ProductListingPage from "@/components/loja/ProductListingPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Vitrine completa da KA Bijoux com filtros simples por categoria, promocoes e novidades.",
};

export default function ProdutosPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <ProductListingPage
      title="Produtos KA Bijoux"
      description="Veja os produtos da loja, escolha uma categoria e navegue por promocoes e novidades com poucos toques."
      basePath="/produtos"
      searchParams={searchParams}
      catalogLine="normal"
    />
  );
}
