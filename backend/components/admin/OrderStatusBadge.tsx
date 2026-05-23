import { OrderStatus } from "@prisma/client";

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  CRIADO:               { label: "Criado",              color: "bg-gray-100 text-gray-700" },
  AGUARDANDO_PAGAMENTO: { label: "Aguard. Pagamento",   color: "bg-yellow-100 text-yellow-700" },
  PAGAMENTO_APROVADO:   { label: "Pago",                color: "bg-green-100 text-green-700" },
  EM_SEPARACAO:         { label: "Em Separação",        color: "bg-blue-100 text-blue-700" },
  PRONTO_PARA_RETIRADA: { label: "Pronto p/ Retirada",  color: "bg-indigo-100 text-indigo-700" },
  SAIU_PARA_ENTREGA:    { label: "Saiu p/ Entrega",     color: "bg-purple-100 text-purple-700" },
  ENVIADO_CORREIOS:     { label: "Enviado Correios",    color: "bg-cyan-100 text-cyan-700" },
  ENTREGUE:             { label: "Entregue",            color: "bg-emerald-100 text-emerald-700" },
  CANCELADO:            { label: "Cancelado",           color: "bg-red-100 text-red-700" },
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`badge-status ${config.color}`}>
      {config.label}
    </span>
  );
}
