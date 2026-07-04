export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Header from "@/components/admin/Header";
import Link from "next/link";

async function getCustomers() {
  return prisma.customer.findMany({
    include: {
      _count: { select: { orders: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, total: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

const fmt = (v: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);

export default async function ClientesPage() {
  const customers = await getCustomers();

  const totalRevenue = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: "PAGO" },
  });

  return (
    <div>
      <Header
        title="Clientes"
        subtitle={`${customers.length} clientes cadastrados`}
      />

      {/* Resumo */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">Total de clientes</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{customers.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Clientes com pedido</p>
          <p className="mt-1 text-2xl font-black text-pink-500">
            {customers.filter((c) => c._count.orders > 0).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Receita total (pagos)</p>
          <p className="mt-1 text-2xl font-black text-green-600">
            {fmt(totalRevenue._sum.amount ?? 0)}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Contato</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Pedidos</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Último pedido</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Cadastro</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const last = c.orders[0];
                return (
                  <tr key={c.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-bold text-pink-600">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          {c.cpf && <p className="text-xs text-gray-400">CPF: {c.cpf}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{c.email}</p>
                      {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {c._count.orders > 0 ? (
                        <Link
                          href={`/admin/pedidos?customer=${c.id}`}
                          className="inline-flex items-center rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-600 hover:bg-pink-100"
                        >
                          {c._count.orders} pedido{c._count.orders !== 1 ? "s" : ""}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">Nenhum</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {last ? (
                        <div>
                          <p className="font-medium text-gray-700">{fmt(last.total)}</p>
                          <p className="text-xs text-gray-400">{fmtDate(last.createdAt)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        c.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}>
                        {c.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {customers.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
              <span className="text-4xl">👥</span>
              <p className="text-sm">Nenhum cliente cadastrado ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
