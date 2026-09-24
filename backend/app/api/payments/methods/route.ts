import { PaymentProviderFactory } from "@/lib/payments/provider-factory";
import { PaymentConfigurationError } from "@/lib/payments/types";
import { apiError, apiSuccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LABELS = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  BOLETO: "Boleto bancário",
} as const;

export async function GET() {
  try {
    const methods = new PaymentProviderFactory().listEnabledMethods().map(
      ({ method, maxInstallments }) => ({
        method,
        label: LABELS[method],
        maxInstallments,
        installments:
          method === "CREDIT_CARD"
            ? Array.from({ length: maxInstallments }, (_, index) => index + 1)
            : [1],
      })
    );
    return apiSuccess({ methods });
  } catch (error) {
    if (error instanceof PaymentConfigurationError) {
      return apiError("Métodos de pagamento temporariamente indisponíveis.", 503);
    }
    return apiError("Não foi possível carregar os métodos de pagamento.", 500);
  }
}
