// ─── Módulo de Pagamento KA Bijoux ─────────────────────────────────────────
// Estrutura preparada para integração com Mercado Pago / PagSeguro / Stripe.
// Para produção, instale o SDK do gateway escolhido e implemente os métodos.
// ──────────────────────────────────────────────────────────────────────────────

import { PaymentMethod } from "@prisma/client";

export interface PaymentRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
  customer: {
    name: string;
    email: string;
    cpf?: string;
    phone?: string;
  };
  card?: {
    token: string;
    installments: number;
    holderName: string;
  };
}

export interface PaymentResult {
  success: boolean;
  gatewayId?: string;
  pixCode?: string;
  pixExpiration?: Date;
  boletoUrl?: string;
  boletoBarCode?: string;
  boletoExpiration?: Date;
  error?: string;
}

// ─── Mercado Pago (principal para Brasil) ─────────────────────────────────────
// Para ativar: npm install mercadopago
// Docs: https://www.mercadopago.com.br/developers

export async function processMercadoPagoPix(
  request: PaymentRequest
): Promise<PaymentResult> {
  // TODO: Integrar com SDK do Mercado Pago
  // Exemplo:
  // import MercadoPagoConfig, { Payment } from "mercadopago";
  // const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });
  // const payment = new Payment(client);
  // const response = await payment.create({
  //   body: {
  //     transaction_amount: request.amount,
  //     payment_method_id: "pix",
  //     payer: { email: request.customer.email },
  //     description: `Pedido KA Bijoux #${request.orderNumber}`,
  //   }
  // });

  // Simulação para desenvolvimento
  const pixExpiration = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  return {
    success: true,
    gatewayId: `MP_PIX_${request.orderId}_${Date.now()}`,
    pixCode: `00020126580014BR.GOV.BCB.PIX0136ka-bijoux-pix-key@kabijoux.com.br5204000053039865802BR5925KA BIJOUX ACESSORIOS6009ITAUNA62140510${request.orderNumber}6304ABCD`,
    pixExpiration,
  };
}

export async function processMercadoPagoCard(
  request: PaymentRequest
): Promise<PaymentResult> {
  // TODO: Integrar com Mercado Pago para cartão de crédito
  // Docs: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/payment-methods/receiving-payment-by-card

  return {
    success: true,
    gatewayId: `MP_CARD_${request.orderId}_${Date.now()}`,
  };
}

// ─── Função principal de processamento ────────────────────────────────────────

export async function processPayment(
  request: PaymentRequest
): Promise<PaymentResult> {
  try {
    switch (request.method) {
      case PaymentMethod.PIX:
        return await processMercadoPagoPix(request);

      case PaymentMethod.CARTAO_CREDITO:
        return await processMercadoPagoCard(request);

      case PaymentMethod.BOLETO:
        // TODO: implementar boleto
        return {
          success: false,
          error: "Boleto temporariamente indisponível.",
        };

      default:
        return { success: false, error: "Método de pagamento inválido." };
    }
  } catch (error) {
    console.error("Erro ao processar pagamento:", error);
    return {
      success: false,
      error: "Erro ao processar pagamento. Tente novamente.",
    };
  }
}

// ─── Webhook de confirmação de pagamento ──────────────────────────────────────

export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // TODO: implementar verificação de assinatura do webhook
  // Para Mercado Pago: comparar HMAC-SHA256
  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return expected === signature;
}
