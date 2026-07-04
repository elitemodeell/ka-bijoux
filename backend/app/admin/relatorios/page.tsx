export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Header from "@/components/admin/Header";
import { OrderStatus, PaymentStatus } from "@prisma/client";

const STATUS_LABELS: Record<string, string> = {
  CRIADO: "Criado",
  AGUARDANDO_PAGAMENTO: "Ag. Pagamento",
  PAGAMENTO_APROVADO: "Pag. Aprovado",
  EM_SEPARACAO: "Em Separação",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const METHOD_LABELS: Record<string, string> = {
  PIX: "PIX",
  CARTAO_CREDITO: "Cartão de Crédito",
  BOLETO: "Boleto",
};

const fmt = (v: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

const fmtMonth = (key: string) => {
  const [year, month] = key.split("-");
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(
    new Date(Number(year), Number(month) - 1, 1)
  );
};

async function getReports(months = 6) {
  const periodStart = new Date();
  periodStart.setMonth(periodStart.getMonth() - months);
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  const [orders, topItemsRaw, ordersByStatus, paymentMethods, topCustomersRaw] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: periodStart }, status: { not: OrderStatus.CANCELADO } },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: periodStart }, status: { not: OrderStatus.CANCELADO } } },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 8,
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: periodStart } },
      _count: { id: true },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { status: PaymentStatus.PAGO, createdAt: { gte: periodStart } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.order.groupBy({
      by: ["customerId"],
      where: { createdAt: { gte: periodStart }, status: { not: OrderStatus.CANCELADO } },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
  ]);

  // Monthly revenue buckets
  const monthlyMap = new Map<string, { revenue: number; count: number }>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, { revenue: 0, count: 0 });
  }
  for (const o of orders) {
    const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const b = monthlyMap.get(key);
    if (b) { b.revenue += Number(o.total); b.count++; }
  }
  const monthly = Array.from(monthlyMap.entries()).map(([month, d]) => ({ month, ...d }));
  const maxRevenue = Math.max(...monthly.map((m) => m.revenue), 1);

  // Enrich products
  const productIds = topItemsRaw.map((p) => p.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const prodMap = new Map(products.map((p) => [p.id, p.name]));
  const topProducts = topItemsRaw.map((p) => ({
    name: prodMap.get(p.productId) ?? "—",
    qty: p._sum?.quantity ?? 0,
    revenue: Number(p._sum?.totalPrice ?? 0),
  }));
  const maxProdRevenue = Math.max(...topProducts.map((p) => p.revenue), 1);

  // Enrich customers
  const customerIds = topCustomersRaw.map((c) => c.customerId);
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, email: true },
  });
  const custMap = new Map(customers.map((c) => [c.id, c]));
  const topCustomers = topCustomersRaw.map((c) => ({
    name: custMap.get(c.customerId)?.name ?? "—",
    email: custMap.get(c.customerId)?.email ?? "",
    orders: c._count.id,
    revenue: Number(c._sum.total ?? 0),
  }));

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = orders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    monthly,
    maxRevenue,
    topProducts,
    maxProdRevenue,
    ordersByStatus,
    paymentMethods,
    topCustomers,
    totalRevenue,
    totalOrders,
    avgTicket,
  };
}

export default async function RelatoriosPage() {
  const data = await getReports(6);

  const totalPaymentRevenue = data.paymentMethods.reduce(
    (s, m) => s + Number(m._sum?.amount ?? 0),
    0
  );

  return (
    <div>
      <Header title="Relatórios" subtitle="Últimos 6 meses" />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">Receita total</p>
          <p className="mt-1 text-2xl font-black text-green-600">{fmt(data.totalRevenue)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Pedidos (não cancelados)</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{data.totalOrders}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Ticket médio</p>
          <p className="mt-1 text-2xl font-black text-pink-500">{fmt(data.avgTicket)}</p>
        </div>
      </div>

      {/* Receita mensal — bar chart via CSS */}
      <div className="card mb-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Receita por mês</h2>
        <div className="flex items-end gap-3 overflow-x-auto pb-2">
          {data.monthly.map((m) => {
            const pct = Math.round((m.revenue / data.maxRevenue) * 100);
            return (
              <div key={m.month} className="flex min-w-[48px] flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-700">{fmt(m.revenue).replace("R$ ", "")}</span>
                <div
                  className="w-10 rounded-t-lg bg-pink-400 transition-all"
                  style={{ height: `${Math.max(pct, 2)}px`, maxHeight: "120px", minHeight: "4px" }}
                />
                <span className="text-xs text-gray-500">{fmtMonth(m.month)}</span>
                <span className="text-xs text-gray-400">{m.count} ped.</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top produtos */}
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Produtos mais vendidos</h2>
          <div className="space-y-3">
            {data.topProducts.map((p, i) => {
              const pct = Math.round((p.revenue / data.maxProdRevenue) * 100);
              return (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="max-w-[60%] truncate font-medium text-gray-700">{p.name}</span>
                    <span className="text-gray-500">{p.qty}x · {fmt(p.revenue)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-pink-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {data.topProducts.length === 0 && (
              <p className="text-sm text-gray-400">Nenhum pedido no período.</p>
            )}
          </div>
        </div>

        {/* Status dos pedidos */}
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Status dos pedidos</h2>
          <div className="space-y-2">
            {data.ordersByStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{STATUS_LABELS[s.status] ?? s.status}</span>
                <span className="font-semibold text-gray-900">{s._count.id}</span>
              </div>
            ))}
            {data.ordersByStatus.length === 0 && (
              <p className="text-sm text-gray-400">Nenhum pedido no período.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Formas de pagamento */}
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Formas de pagamento (pagos)</h2>
          <div className="space-y-3">
            {data.paymentMethods.map((m) => {
              const rev = Number(m._sum?.amount ?? 0);
              const pct = totalPaymentRevenue > 0
                ? Math.round((rev / totalPaymentRevenue) * 100)
                : 0;
              return (
                <div key={m.method}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">{METHOD_LABELS[m.method] ?? m.method}</span>
                    <span className="text-gray-500">{m._count.id} · {fmt(rev)} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-green-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {data.paymentMethods.length === 0 && (
              <p className="text-sm text-gray-400">Nenhum pagamento confirmado no período.</p>
            )}
          </div>
        </div>

        {/* Top clientes */}
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Clientes que mais compraram</h2>
          <div className="space-y-3">
            {data.topCustomers.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-600">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="truncate text-xs text-gray-400">{c.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{fmt(c.revenue)}</p>
                  <p className="text-xs text-gray-400">{c.orders} pedido{c.orders !== 1 ? "s" : ""}</p>
                </div>
              </div>
            ))}
            {data.topCustomers.length === 0 && (
              <p className="text-sm text-gray-400">Nenhum pedido no período.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
