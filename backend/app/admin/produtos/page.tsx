export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Header from "@/components/admin/Header";
import Image from "next/image";

async function getProducts() {
  return prisma.product.findMany({
    include: { category: true, subcategory: true, images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
}

const formatCurrency = (v: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

export default async function ProdutosPage() {
  const products = await getProducts();

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

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Produto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Categoria</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Preço</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Estoque</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
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
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    <p>{product.category.name}</p>
                    {product.subcategory && <p className="text-xs text-gray-400">{product.subcategory.name}</p>}
                  </td>
                  <td className="py-3 px-4">
                    {product.promotionalPrice ? (
                      <div>
                        <p className="font-semibold text-pink-500">{formatCurrency(product.promotionalPrice)}</p>
                        <p className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</p>
                      </div>
                    ) : (
                      <p className="font-semibold">{formatCurrency(product.price)}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-semibold ${product.stock <= product.minStock ? "text-red-500" : "text-gray-900"}`}>
                      {product.stock}
                      {product.stock <= product.minStock && (
                        <span className="ml-1 text-xs text-red-400">⚠️ baixo</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge-status ${product.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {product.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/admin/produtos/${product.id}`} className="text-pink-500 hover:text-pink-600 text-xs font-medium">
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
