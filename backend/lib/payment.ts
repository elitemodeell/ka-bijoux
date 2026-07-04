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
}

export interface PaymentResult {
  success: boolean;
  gatewayId?: string;
  pixCode?: string;
  pixExpiration?: Date;
  checkoutUrl?: string;
  error?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://kabijoux.com.br";

async function getMpClient() {
  const { default: MercadoPagoConfig } = await import("mercadopago");
  return new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  });
}

async function processMercadoPagoPix(request: PaymentRequest): Promise<PaymentResult> {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    // Mock para desenvolvimento
    return {
      success: true,
      gatewayId: `MOCK_PIX_${request.orderId}`,
      pixCode: `00020126580014BR.GOV.BCB.PIX0136ka-bijoux-pix-key@kabijoux.com.br5204000053039865802BR5925KA BIJOUX ACESSORIOS6009ITAUNA62140510${request.orderNumber}6304ABCD`,
      pixExpiration: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  const client = await getMpClient();
  const { Payment } = await import("mercadopago");
  const mp = new Payment(client);

  const [firstName, ...rest] = request.customer.name.trim().split(" ");

  const response = await mp.create({
    body: {
      transaction_amount: request.amount,
      payment_method_id: "pix",
      payer: {
        email: request.customer.email,
        first_name: firstName,
        last_name: rest.join(" ") || undefined,
        identification: request.customer.cpf
          ? { type: "CPF", number: request.customer.cpf.replace(/\D/g, "") }
          : undefined,
      },
      description: `Pedido KA Bijoux #${request.orderNumber}`,
      external_reference: request.orderNumber,
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
    requestOptions: { idempotencyKey: request.orderId },
  });

  const pixCode =
    (response as any).point_of_interaction?.transaction_data?.qr_code as string | undefined;

  return {
    success: true,
    gatewayId: String(response.id),
    pixCode,
    pixExpiration: new Date(Date.now() + 30 * 60 * 1000),
  };
}

async function processMercadoPagoCheckoutPro(request: PaymentRequest): Promise<PaymentResult> {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    return {
      success: true,
      gatewayId: `MOCK_PREF_${request.orderId}`,
      checkoutUrl: `https://www.mercadopago.com.br/checkout/v1/payment/redirect/?pref_id=MOCK_${request.orderId}`,
    };
  }

  const client = await getMpClient();
  const { Preference } = await import("mercadopago");
  const mp = new Preference(client);

  const response = await mp.create({
    body: {
      items: [
        {
          id: request.orderId,
          title: `Pedido KA Bijoux #${request.orderNumber}`,
          quantity: 1,
          unit_price: request.amount,
          currency_id: "BRL",
        },
      ],
      payer: {
        name: request.customer.name,
        email: request.customer.email,
      },
      back_urls: {
        success: `${APP_URL}/checkout/sucesso`,
        failure: `${APP_URL}/checkout/falha`,
        pending: `${APP_URL}/checkout/pendente`,
      },
      notification_url: `${APP_URL}/api/payment/webhook`,
      external_reference: request.orderNumber,
      statement_descriptor: "KA BIJOUX",
    },
  });

  return {
    success: true,
    gatewayId: response.id ?? undefined,
    checkoutUrl: response.init_point ?? undefined,
  };
}

export async function processPayment(request: PaymentRequest): Promise<PaymentResult> {
  try {
    switch (request.method) {
      case PaymentMethod.PIX:
        return await processMercadoPagoPix(request);

      case PaymentMethod.CARTAO_CREDITO:
        return await processMercadoPagoCheckoutPro(request);

      default:
        return { success: false, error: "Método de pagamento inválido." };
    }
  } catch (error) {
    console.error("Erro ao processar pagamento:", error);
    return { success: false, error: "Erro ao processar pagamento. Tente novamente." };
  }
}
