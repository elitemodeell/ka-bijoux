export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { createPaymentService } from "@/lib/payments/payment-service";
import { requestOrderRefund } from "@/lib/payments/webhook-processor";
import {
  PaymentConfigurationError,
  PaymentProviderError,
  PaymentValidationError,
} from "@/lib/payments/types";

// POST /api/admin/orders/[id]/refund — solicita estorno total do Pix no Asaas.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireAdmin(request);

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        payment: { select: { id: true, provider: true } },
      },
    });
    if (!order) return apiError("Pedido não encontrado.", 404);
    if (!order.payment) return apiError("Pedido sem pagamento associado.", 400);
    if (
      order.payment.provider &&
      order.payment.provider !== "ASAAS"
    ) {
      return apiError(
        "O provedor original deste pagamento não possui estorno ativo.",
        409
      );
    }

    const result = await requestOrderRefund(
      order.id,
      createPaymentService(),
      "Estorno total solicitado pelo administrador."
    );

    return apiSuccess({
      status: result.status,
      stockRestored: result.stockRestored,
      message:
        result.status === "REFUNDED"
          ? "Estorno confirmado e estoque reconciliado."
          : "Estorno solicitado à Asaas e aguardando confirmação.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Acesso não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    if (error instanceof PaymentConfigurationError) {
      console.error("Configuração Asaas indisponível para estorno.");
      return apiError("Serviço de pagamento indisponível.", 503);
    }
    if (error instanceof PaymentValidationError) {
      return apiError(error.message, 409);
    }
    if (error instanceof PaymentProviderError) {
      console.error("Falha no estorno Asaas:", {
        operation: error.operation,
        statusCode: error.statusCode,
        providerCode: error.providerCode,
      });
      return apiError(
        error.retryable
          ? "Falha temporária ao solicitar o estorno. Tente novamente."
          : "A Asaas recusou a solicitação de estorno.",
        error.retryable ? 503 : 502
      );
    }

    console.error(
      "Falha inesperada no estorno:",
      error instanceof Error ? error.name : "erro desconhecido"
    );
    return apiError("Erro ao processar estorno.", 500);
  }
}
