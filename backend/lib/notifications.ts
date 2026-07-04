import { OrderStatus, ShippingType } from "@prisma/client";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(msg: PushMessage): Promise<void> {
  if (!msg.to.startsWith("ExponentPushToken")) return;

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: msg.to,
        title: msg.title,
        body: msg.body,
        data: msg.data ?? {},
        sound: "default",
        priority: "high",
      }),
    });
  } catch (err) {
    // Push é best-effort — não quebrar o fluxo principal
    console.error("Push notification error:", err);
  }
}

export function orderStatusMessage(
  status: OrderStatus,
  orderNumber: string,
  shippingType: ShippingType,
  trackingCode?: string
): { title: string; body: string } {
  const msgs: Partial<Record<OrderStatus, { title: string; body: string }>> = {
    [OrderStatus.PAGAMENTO_APROVADO]: {
      title: "Pagamento confirmado! ✅",
      body: `Pedido #${orderNumber} pago. Já estamos separando seus itens.`,
    },
    [OrderStatus.EM_SEPARACAO]: {
      title: "Pedido em separação 📦",
      body: `Pedido #${orderNumber} está sendo preparado para envio.`,
    },
    [OrderStatus.PRONTO_PARA_RETIRADA]: {
      title: "Pronto para retirada! 🏪",
      body: `Pedido #${orderNumber} aguarda você na loja KA Bijoux em Itaúna.`,
    },
    [OrderStatus.SAIU_PARA_ENTREGA]: {
      title: shippingType === ShippingType.MOTOTAXI ? "Saiu para entrega! 🏍️" : "Saiu para entrega! 🚚",
      body: `Pedido #${orderNumber} está a caminho. Fique em casa!`,
    },
    [OrderStatus.ENVIADO_CORREIOS]: {
      title: "Enviado pelos Correios! 📫",
      body: trackingCode
        ? `Pedido #${orderNumber} enviado. Rastreio: ${trackingCode}`
        : `Pedido #${orderNumber} foi enviado pelos Correios.`,
    },
    [OrderStatus.ENTREGUE]: {
      title: "Pedido entregue! 🎉",
      body: `Pedido #${orderNumber} foi entregue. Esperamos que você adore!`,
    },
    [OrderStatus.CANCELADO]: {
      title: "Pedido cancelado",
      body: `Pedido #${orderNumber} foi cancelado. Entre em contato se precisar de ajuda.`,
    },
  };

  return msgs[status] ?? { title: "Atualização do pedido", body: `Pedido #${orderNumber}: ${status}` };
}
