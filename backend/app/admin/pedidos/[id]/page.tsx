"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/admin/Header";
import OrderStatusBadge from "@/components/admin/OrderStatusBadge";
import { OrderStatus, ShippingType } from "@prisma/client";

type Order = {
  id: string; orderNumber: string; status: OrderStatus;
  subtotal: number; shippingPrice: number; total: number;
  shippingType: ShippingType; shippingTrackingCode?: string;
  notes?: string; createdAt: string;
  customer: { name: string; email: string; phone?: string };
  address?: { street: string; number: string; complement?: string; neighborhood: string; city: string; state: string; zipCode: string };
  items: Array<{ id: string; productName: string; productImage?: string; variationName?: string; quantity: number; unitPrice: number; totalPrice: number }>;
  payment?: { method: string; status: string; pixCode?: string };
  statusHistory: Array<{ id: string; status: OrderStatus; note?: string; createdAt: string }>;
};

const nextStatusOptions: Partial<Record<OrderStatus, { status: OrderStatus; label: string }[]>> = {
  [OrderStatus.AGUARDANDO_PAGAMENTO]: [
    { status: OrderStatus.PAGAMENTO_APROVADO, label: "✅ Confirmar Pagamento" },
    { status: OrderStatus.CANCELADO, label: "❌ Cancelar" },
  ],
  [OrderStatus.PAGAMENTO_APROVADO]: [{ status: OrderStatus.EM_SEPARACAO, label: "📋 Iniciar Separação" }],
  [OrderStatus.EM_SEPARACAO]: [
    { status: OrderStatus.PRONTO_PARA_RETIRADA, label: "🏪 Pronto para Retirada" },
    { status: OrderStatus.SAIU_PARA_ENTREGA, label: "🏍️ Saiu para Entrega" },
    { status: OrderStatus.ENVIADO_CORREIOS, label: "📦 Enviado pelos Correios" },
  ],
  [OrderStatus.SAIU_PARA_ENTREGA]: [{ status: OrderStatus.ENTREGUE, label: "✅ Marcar como Entregue" }],
  [OrderStatus.ENVIADO_CORREIOS]: [{ status: OrderStatus.ENTREGUE, label: "✅ Marcar como Entregue" }],
  [OrderStatus.PRONTO_PARA_RETIRADA]: [{ status: OrderStatus.ENTREGUE, label: "✅ Retirado pelo Cliente" }],
};

const formatCurrency = (v: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

export default function PedidoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`, { headers: { "x-admin-request": "true" } })
      .then((r) => r.json())
      .then((d) => { if (d.data) setOrder(d.data); });
  }, [id]);

  async function updateStatus(status: OrderStatus) {
    setUpdating(true);
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, trackingCode: trackingCode || undefined }),
    });
    const json = await res.json();
    if (json.data) setOrder(json.data);
    setUpdating(false);
  }

  if (!order) return <div className="py-20 text-center text-gray-400">Carregando...</div>;

  const nextActions = nextStatusOptions[order.status] ?? [];

  return (
    <div>
      <Header
        title={`Pedido ${order.orderNumber}`}
        subtitle={new Date(order.createdAt).toLocaleString("pt-BR")}
        action={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Itens do Pedido</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center text-pink-300 text-lg flex-shrink-0">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover rounded-xl" />
                    ) : "💎"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{item.productName}</p>
                    {item.variationName && <p className="text-xs text-gray-400">{item.variationName}</p>}
                    <p className="text-sm text-gray-500">Qtd: {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                  </div>
                  <p className="font-semibold text-gray-900">{formatCurrency(item.totalPrice)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Frete</span>
                <span>{Number(order.shippingPrice) === 0 ? "Grátis" : formatCurrency(order.shippingPrice)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span><span className="text-pink-500">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Status history */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Histórico do Pedido</h3>
            <div className="space-y-3">
              {order.statusHistory.map((h) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-pink-400 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <OrderStatusBadge status={h.status} />
                    {h.note && <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(h.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-5">
          {/* Actions */}
          {nextActions.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Ações</h3>
              {order.shippingType === ShippingType.CORREIOS && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Código de rastreio</label>
                  <input
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="Ex: BR123456789BR"
                    className="input-field text-xs"
                  />
                </div>
              )}
              <div className="space-y-2">
                {nextActions.map((action) => (
                  <button
                    key={action.status}
                    onClick={() => updateStatus(action.status)}
                    disabled={updating}
                    className="w-full btn-primary text-sm py-2"
                  >
                    {updating ? "Atualizando..." : action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Cliente</h3>
            <div className="space-y-1.5 text-sm">
              <p className="font-medium">{order.customer.name}</p>
              <p className="text-gray-500">{order.customer.email}</p>
              {order.customer.phone && <p className="text-gray-500">{order.customer.phone}</p>}
            </div>
          </div>

          {/* Delivery */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Entrega</h3>
            <div className="text-sm space-y-1">
              <p className="font-medium">
                {order.shippingType === ShippingType.CORREIOS && "📦 Correios"}
                {order.shippingType === ShippingType.MOTOTAXI && "🏍️ Mototáxi - Itaúna"}
                {order.shippingType === ShippingType.RETIRADA && "🏪 Retirada na loja"}
              </p>
              {order.shippingTrackingCode && (
                <p className="text-pink-500 font-mono text-xs">{order.shippingTrackingCode}</p>
              )}
              {order.address && (
                <div className="text-gray-500 mt-2 space-y-0.5">
                  <p>{order.address.street}, {order.address.number}</p>
                  {order.address.complement && <p>{order.address.complement}</p>}
                  <p>{order.address.neighborhood}</p>
                  <p>{order.address.city}/{order.address.state}</p>
                  <p>{order.address.zipCode}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment */}
          {order.payment && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Pagamento</h3>
              <div className="text-sm space-y-1.5">
                <p className="text-gray-600">{order.payment.method === "PIX" ? "💠 Pix" : order.payment.method === "CARTAO_CREDITO" ? "💳 Cartão" : "Boleto"}</p>
                <span className={`badge-status ${
                  order.payment.status === "PAGO"
                    ? "bg-green-100 text-green-700"
                    : order.payment.status === "AGUARDANDO"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-600"
                }`}>
                  {order.payment.status === "PAGO" ? "Pago" : order.payment.status === "AGUARDANDO" ? "Aguardando" : order.payment.status}
                </span>
                {order.payment.pixCode && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1">Código Pix:</p>
                    <p className="text-xs font-mono bg-gray-50 rounded-lg p-2 break-all border border-gray-100">{order.payment.pixCode.substring(0, 50)}...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
