export const dynamic = "force-dynamic";

import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { asaasRequest, PaymentUnavailableError } from "@/lib/payment";
import { apiError, apiSuccess } from "@/lib/utils";

const WEBHOOK_URL = "https://kabijoux.com.br/api/payment/webhook";
const EVENTS = [
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_OVERDUE",
];

function matches(left: string, right: string) {
  return timingSafeEqual(createHash("sha256").update(left).digest(), createHash("sha256").update(right).digest());
}

interface WebhookRecord {
  id: string;
  url: string;
  enabled?: boolean;
  interrupted?: boolean;
  events?: string[];
}

export async function POST(req: NextRequest) {
  const expected = process.env.INTERNAL_OPERATIONS_TOKEN?.trim();
  const received = req.headers.get("x-internal-operations-token")?.trim() ?? "";
  if (!expected || expected.length < 32) return apiError("Operação indisponível.", 503);
  if (!received || !matches(received, expected)) return apiError("Não autorizado.", 401);

  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!webhookToken || webhookToken.length < 32) return apiError("Webhook Asaas não configurado.", 503);

  const configuration = {
    name: "KA Bijoux - Pagamentos",
    url: WEBHOOK_URL,
    email: "adm@kabijoux.com.br",
    enabled: true,
    interrupted: false,
    apiVersion: 3,
    sendType: "SEQUENTIALLY",
    authToken: webhookToken,
    events: EVENTS,
  };

  try {
    const listed = await asaasRequest<{ data?: WebhookRecord[] }>("/webhooks?offset=0&limit=100");
    const current = listed.data?.find((item) => item.url === WEBHOOK_URL);
    if (current) {
      await asaasRequest(`/webhooks/${encodeURIComponent(current.id)}`, {
        method: "PUT",
        body: JSON.stringify(configuration),
      });
      return apiSuccess({ provider: "ASAAS", action: "updated", enabled: true, eventCount: EVENTS.length });
    }

    await asaasRequest("/webhooks", { method: "POST", body: JSON.stringify(configuration) });
    return apiSuccess({ provider: "ASAAS", action: "created", enabled: true, eventCount: EVENTS.length }, 201);
  } catch (error) {
    if (error instanceof PaymentUnavailableError) return apiError("Integração Asaas indisponível.", 503);
    return apiError("Não foi possível configurar o webhook Asaas.", 503);
  }
}
