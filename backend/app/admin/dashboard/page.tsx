import StatCard from "@/components/admin/StatCard";
import OrderStatusBadge from "@/components/admin/OrderStatusBadge";
import Header from "@/components/admin/Header";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import Link from "next/link";

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [totalOrders, pendingOrders, totalProducts, totalCustomers, todayAgg, monthAgg, recentOrders, lowStockProducts] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: { status: { in: [OrderStatus.CRIADO, OrderStatus.AGUARDANDO_PAGAMENTO, OrderStatus.PAGAMENTO_APROVADO, OrderStatus.EM_SEPARACAO] } },
      }),
      prisma.product.count({ where: { active: true } }),
      prisma.customer.count({ where: { active: true } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: { not: OrderStatus.CANCELADO } },
        _sum: { total: true }, _count: true,
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: monthStart }, status: { not: OrderStatus.CANCELADO } },
        _sum: { total: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { customer: { select: { name: true } }, payment: true },
      }),
      prisma.product.count({ where: { active: true, stock: { lte: 5 } } }),
    ]);

  return { totalOrders, pendingOrders, totalProducts, totalCustomers, todayAgg, monthAgg, recentOrders, lowStockProducts };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const formatCurrency = (v: unknown) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`Hoje, ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Vendas do Mês"      value={formatCurrency(data.monthAgg._sum.total)} icon="💰" color="pink"   trend="Este mês" />
        <StatCard label="Vendas Hoje"        value={formatCurrency(data.todayAgg._sum.total)}  icon="📈" color="green"  trend={`${data.todayAgg._count} pedidos`} />
        <StatCard label="Pedidos Pendentes"  value={data.pendingOrders}                         icon="⏳" color="orange" trend="Aguardando ação" />
        <StatCard label="Total de Pedidos"   value={data.totalOrders}                           icon="📦" color="blue"   trend="Desde o início" />
        <StatCard label="Produtos Ativos"    value={data.totalProducts}                         icon="💎" color="purple" />
        <StatCard label="Estoque Baixo"      value={data.lowStockProducts}                      icon="⚠️" color="orange" trend="Produtos críticos" />
        <StatCard label="Clientes"           value={data.totalCustomers}                        icon="👥" color="blue"   />
        <StatCard label="Pedidos Hoje"       value={data.todayAgg._count}                       icon="🛍️" color="pink"  />
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Pedidos Recentes</h2>
          <Link href="/admin/pedidos" className="text-pink-500 text-sm font-medium hover:text-pink-600">
            Ver todos →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Pedido</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Cliente</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Total</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Status</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Data</th>
                <th className="py-2.5 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-3 font-mono text-xs text-pink-600 font-semibold">{order.orderNumber}</td>
                  <td className="py-3 px-3 text-gray-700">{order.customer.name}</td>
                  <td className="py-3 px-3 font-semibold">{formatCurrency(order.total)}</td>
                  <td className="py-3 px-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="py-3 px-3 text-gray-400 text-xs">
                    {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3 px-3">
                    <Link href={`/admin/pedidos/${order.id}`} className="text-pink-500 hover:text-pink-600 text-xs font-medium">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.recentOrders.length === 0 && (
            <div className="py-10 text-center text-gray-400">Nenhum pedido ainda.</div>
          )}
        </div>
      </div>
    </div>
  );
}
