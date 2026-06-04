import type { Metadata } from "next";
import ProductListingPage from "@/components/loja/ProductListingPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Vitrine completa da KA Bijoux com filtros por categoria, preco e promocoes.",
};

export default function ProdutosPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <ProductListingPage
      title="Produtos KA Bijoux"
      description="Veja todas as categorias da loja, filtre pelos precos unicos e abra a compra rapida sem sair da pagina."
      basePath="/produtos"
      searchParams={searchParams}
    />
  );
}
