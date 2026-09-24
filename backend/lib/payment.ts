import { PaymentConfigurationError } from "@/lib/payments/types";

/**
 * Compatibilidade temporária para detectar qualquer import legado durante a
 * transição. Não cria cobrança, não contém fallback e não seleciona provedor.
 * Novos fluxos devem usar PaymentService/PaymentProvider.
 */
export async function processPayment(): Promise<never> {
  throw new PaymentConfigurationError(
    "Integração financeira legada desativada; utilize PaymentService com ASAAS."
  );
}