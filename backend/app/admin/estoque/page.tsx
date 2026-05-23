import { prisma } from "@/lib/prisma";
import Header from "@/components/admin/Header";
import Link from "next/link";

async function getProducts() {
  return prisma.product.findMany({
    where: { active: true },
    include: { category: true, images: { take: 1, orderBy: { order: "asc" } } },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
  });
}

export default async function EstoquePage() {
  const products = await getProducts();
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const outOfStock = products.filter((p) => p.stock === 0);

  return (
    <div>
      <Header
        title="Controle de Estoque"
        subtitle={`${products.length} produtos ativos · ${lowStock.length} com estoque baixo · ${outOfStock.length} sem estoque`}
      />

      {/* Alertas */}
      {outOfStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
          <p className="font-semibold text-red-700 mb-2">🚫 Produtos Sem Estoque ({outOfStock.length})</p>
          <div className="flex flex-wrap gap-2">
            {outOfStock.map((p) => (
              <Link key={p.id} href={`/admin/produtos/${p.id}`}
                className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-200 transition-colors">
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {lowStock.length > 0 && outOfStock.length !== lowStock.length && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-5">
          <p className="font-semibold text-yellow-700 mb-2">⚠️ Estoque Baixo ({lowStock.filter(p => p.stock > 0).length})</p>
          <div className="flex flex-wrap gap-2">
            {lowStock.filter(p => p.stock > 0).map((p) => (
              <Link key={p.id} href={`/admin/produtos/${p.id}`}
                className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-lg hover:bg-yellow-200 transition-colors">
                {p.name} ({p.stock} un)
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Produto</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Categoria</th>
              <th className="text-center py-3 px-4 text-gray-500 font-medium">Estoque Atual</th>
              <th className="text-center py-3 px-4 text-gray-500 font-medium">Mínimo</th>
              <th className="text-center py-3 px-4 text-gray-500 font-medium">Situação</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const isOut = product.stock === 0;
              const isLow = product.stock <= product.minStock && !isOut;
              return (
                <tr key={product.id} className={`border-b border-gray-50 transition-colors ${isOut ? "bg-red-50/50" : isLow ? "bg-yellow-50/50" : "hover:bg-gray-50"}`}>
                  <td className="py-3 px-4 font-medium text-gray-900">{product.name}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{product.category.name}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-bold text-base ${isOut ? "text-red-500" : isLow ? "text-yellow-600" : "text-gray-900"}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-500">{product.minStock}</td>
                  <td className="py-3 px-4 text-center">
                    {isOut ? (
                      <span className="badge-status bg-red-100 text-red-700">Sem estoque</span>
                    ) : isLow ? (
                      <span className="badge-status bg-yellow-100 text-yellow-700">Baixo</span>
                    ) : (
                      <span className="badge-status bg-green-100 text-green-700">Normal</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/admin/produtos/${product.id}`} className="text-pink-500 hover:text-pink-600 text-xs font-medium">
                      Editar →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
