export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Header from "@/components/admin/Header";
import OrderStatusBadge from "@/components/admin/OrderStatusBadge";
import { OrderStatus, ShippingType } from "@prisma/client";

const shippingLabel: Record<ShippingType, string> = {
  CORREIOS: "📦 Correios",
  MOTOTAXI: "🏍️ Mototáxi",
  RETIRADA: "🏪 Retirada",
};

async function getOrders() {
  return prisma.order.findMany({
    include: {
      customer: { select: { id: true, name: true, email: true } },
      payment: true,
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

const formatCurrency = (v: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

export default async function PedidosPage() {
  const orders = await getOrders();

  const statusCounts = Object.values(OrderStatus).reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {} as Record<OrderStatus, number>);

  return (
    <div>
      <Header
        title="Pedidos"
        subtitle={`${orders.length} pedidos encontrados`}
      />

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { status: OrderStatus.AGUARDANDO_PAGAMENTO, label: "Aguard. Pagto", color: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
          { status: OrderStatus.PAGAMENTO_APROVADO,   label: "Pago",          color: "bg-green-50 text-green-700 border border-green-200" },
          { status: OrderStatus.EM_SEPARACAO,         label: "Em Separação",  color: "bg-blue-50 text-blue-700 border border-blue-200" },
          { status: OrderStatus.SAIU_PARA_ENTREGA,    label: "Saiu Entrega",  color: "bg-purple-50 text-purple-700 border border-purple-200" },
          { status: OrderStatus.ENTREGUE,             label: "Entregue",      color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
        ].map(({ status, label, color }) => (
          <span key={status} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${color}`}>
            {label}: <strong>{statusCounts[status] ?? 0}</strong>
          </span>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Pedido</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Cliente</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Total</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Entrega</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Data</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-mono text-xs text-pink-600 font-bold">{order.orderNumber}</p>
                    <p className="text-xs text-gray-400">{order._count.items} itens</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-800">{order.customer.name}</p>
                    <p className="text-xs text-gray-400">{order.customer.email}</p>
                  </td>
                  <td className="py-3 px-4 font-semibold">{formatCurrency(order.total)}</td>
                  <td className="py-3 px-4 text-xs text-gray-600">{shippingLabel[order.shippingType]}</td>
                  <td className="py-3 px-4"><OrderStatusBadge status={order.status} /></td>
                  <td className="py-3 px-4 text-gray-400 text-xs">
                    {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/admin/pedidos/${order.id}`} className="text-pink-500 hover:text-pink-600 text-xs font-medium">
                      Gerenciar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {orders.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <p className="text-4xl mb-3">📦</p>
              <p className="font-medium">Nenhum pedido ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
