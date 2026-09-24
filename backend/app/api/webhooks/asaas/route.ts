import { NextRequest, NextResponse } from "next/server";
import { loadAsaasWebhookToken } from "@/lib/payments/config";
import { getPaymentService } from "@/lib/payments/payment-service";
import {
  hashAsaasWebhookPayload,
  isValidAsaasWebhookToken,
  processAsaasWebhook,
  WebhookPayloadError,
} from "@/lib/payments/webhook-processor";
import {
  PaymentConfigurationError,
  PaymentValidationError,
} from "@/lib/payments/types";

export const runtime = "nodejs";

const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

export async function POST(request: NextRequest) {
  let expectedToken: string;
  try {
    expectedToken = loadAsaasWebhookToken();
  } catch (error) {
    console.error(
      "Configuração do webhook Asaas indisponível:",
      error instanceof Error ? error.name : "erro desconhecido"
    );
    return NextResponse.json(
      { ok: false, retry: true, error: "Webhook indisponível." },
      { status: 503 }
    );
  }

  if (
    !isValidAsaasWebhookToken(
      request.headers.get("asaas-access-token"),
      expectedToken
    )
  ) {
    return NextResponse.json(
      { ok: false, error: "Token do webhook inválido." },
      { status: 401 }
    );
  }

  try {
    await getPaymentService().assertAccountIdentity();
  } catch (error) {
    console.error(
      "Webhook bloqueado por identidade financeira Asaas invÃ¡lida:",
      error instanceof Error ? error.name : "erro desconhecido"
    );
    return NextResponse.json(
      { ok: false, retry: true, error: "Webhook financeiro indisponÃ­vel." },
      { status: 503 }
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_WEBHOOK_BODY_BYTES
  ) {
    return NextResponse.json(
      { ok: false, error: "Payload do webhook excede o limite." },
      { status: 413 }
    );
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Payload do webhook excede o limite." },
      { status: 413 }
    );
  }

  try {
    const processing = await processAsaasWebhook({
      rawBody,
      payloadHash: hashAsaasWebhookPayload(rawBody),
    });
    return NextResponse.json(
      {
        ok: processing.outcome !== "retry",
        retry: processing.outcome === "retry",
        outcome: processing.outcome,
        eventId: processing.externalEventId,
      },
      { status: processing.httpStatus }
    );
  } catch (error) {
    if (
      error instanceof WebhookPayloadError ||
      error instanceof PaymentValidationError
    ) {
      return NextResponse.json(
        { ok: false, error: "Payload do webhook inválido." },
        { status: 400 }
      );
    }
    if (error instanceof PaymentConfigurationError) {
      return NextResponse.json(
        { ok: false, retry: true, error: "Webhook indisponível." },
        { status: 503 }
      );
    }

    console.error(
      "Falha transitória no webhook Asaas:",
      error instanceof Error ? error.name : "erro desconhecido"
    );
    return NextResponse.json(
      { ok: false, retry: true, error: "Falha temporária." },
      { status: 503 }
    );
  }
}
