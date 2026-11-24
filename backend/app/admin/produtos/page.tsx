export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Header from "@/components/admin/Header";
import Image from "next/image";
import { visibleCatalogPhotos } from "@/lib/catalog-photo";

async function getProducts() {
  return prisma.product.findMany({
    include: {
      category: true,
      subcategory: true,
      images: { where: visibleCatalogPhotos, orderBy: { order: "asc" }, take: 1 },
      _count: { select: { variations: { where: { active: true, imageUrl: null } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

const formatCurrency = (v: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

const enrichmentLabels: Record<string, { label: string; className: string }> = {
  NOT_REQUIRED: { label: "Manual", className: "bg-gray-100 text-gray-500" },
  PENDING_RESEARCH: { label: "Pesquisar", className: "bg-yellow-100 text-yellow-700" },
  ENRICHED: { label: "Enriquecido", className: "bg-green-100 text-green-700" },
  NEEDS_MANUAL_REVIEW: { label: "Revisão manual", className: "bg-red-100 text-red-700" },
  MANUAL_REVIEWED: { label: "Revisado", className: "bg-pink-100 text-pink-700" },
};

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<{ revisao?: string; fotos?: string }> }) {
  const params = await searchParams;
  const allProducts = await getProducts();
  const pending = allProducts.filter((product) => product.active && (!product.purchaseMode || product.purchaseMode === "REVIEW"));
  const pendingPhotos = allProducts.filter((product) => product.active && (!product.images.length || product._count.variations > 0));
  const products = params.fotos === "pendentes" ? pendingPhotos : params.revisao === "true" ? pending : allProducts;

  return (
    <div>
      <Header
        title="Produtos"
        subtitle={`${products.length} produtos cadastrados`}
        action={
          <Link href="/admin/produtos/novo" className="btn-primary">
            + Novo Produto
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Link href="/admin/produtos" className="btn-ghost">Todos os produtos</Link>
        <Link href="/admin/produtos?revisao=true" className="btn-ghost">Revisão comercial ({pending.length})</Link>
        <Link href="/admin/produtos?fotos=pendentes" className="btn-ghost">Fotos oficiais pendentes ({pendingPhotos.length})</Link>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="admin-table w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Produto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Categoria</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Preço</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Estoque</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Revisão</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td data-label="Produto" className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-pink-50 flex-shrink-0">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0].url}
                            alt={product.name}
                            width={40} height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-pink-300 text-xs">📷</div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.sku || product.slug}</p>
                        {!product.images.length && <p className="text-xs text-amber-800">Foto do produto pendente</p>}
                        {product._count.variations > 0 && <p className="text-xs text-amber-800">Opções sem foto: {product._count.variations}</p>}
                      </div>
                    </div>
                  </td>
                  <td data-label="Categoria" className="py-3 px-4 text-gray-600">
                    <p>{product.category.name}</p>
                    {product.subcategory && <p className="text-xs text-gray-400">{product.subcategory.name}</p>}
                  </td>
                  <td data-label="Preço" className="py-3 px-4">
                    {product.promotionalPrice ? (
                      <div>
                        <p className="font-semibold text-pink-500">{formatCurrency(product.promotionalPrice)}</p>
                        <p className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</p>
                      </div>
                    ) : (
                      <p className="font-semibold">{formatCurrency(product.price)}</p>
                    )}
                  </td>
                  <td data-label="Estoque" className="py-3 px-4">
                    <span className={`font-semibold ${product.stock <= product.minStock ? "text-red-500" : "text-gray-900"}`}>
                      {product.stock}
                      {product.stock <= product.minStock && (
                        <span className="ml-1 text-xs text-red-400">⚠️ baixo</span>
                      )}
                    </span>
                  </td>
                  <td data-label="Status" className="py-3 px-4">
                    <span className={`badge-status ${product.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {product.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td data-label="Revisão" className="py-3 px-4">
                    <span className={`badge-status ${enrichmentLabels[product.enrichmentStatus]?.className ?? "bg-gray-100 text-gray-500"}`}>
                      {enrichmentLabels[product.enrichmentStatus]?.label ?? product.enrichmentStatus}
                    </span>
                    {product.importSource === "BLING" && (
                      <p className="mt-1 text-[11px] font-semibold text-pink-500">Bling</p>
                    )}
                    {(!product.purchaseMode || product.purchaseMode === "REVIEW") && (
                      <p className="mt-1 text-xs text-amber-900">
                        {product.purchaseMode === "REVIEW" ? "Compra suspensa" : "Galeria por confirmar"}
                      </p>
                    )}
                  </td>
                  <td data-label="Ações" className="py-3 px-4">
                    <Link href={`/admin/produtos/${product.id}`} className="inline-flex min-h-11 items-center text-xs font-medium text-pink-500 hover:text-pink-600">
                      Editar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <p className="text-4xl mb-3">💎</p>
              <p className="font-medium">Nenhum produto cadastrado.</p>
              <Link href="/admin/produtos/novo" className="text-pink-500 text-sm mt-2 inline-block">
                Cadastrar primeiro produto →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
