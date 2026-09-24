import { LEGAL_IDENTITY } from "@/lib/legal-identity";

const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";
const RESEND_REQUEST_TIMEOUT_MS = 10_000;

export const OFFICIAL_EMAIL_ADDRESS = LEGAL_IDENTITY.email;
export const OFFICIAL_EMAIL_FROM = `KA Bijoux <${OFFICIAL_EMAIL_ADDRESS}>`;

export interface TransactionalEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
  idempotencyKey?: string;
}

export type EmailDeliveryResult =
  | { ok: true; providerId: string | null }
  | {
      ok: false;
      reason:
        | "not_configured"
        | "invalid_configuration"
        | "provider_error"
        | "network_error";
      status?: number;
    };

function extractAddress(value: string): string | null {
  const bracketed = value.match(/<([^<>]+)>$/);
  const address = (bracketed?.[1] ?? value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? address : null;
}

function getSenderConfiguration():
  | { from: string; replyTo: string }
  | null {
  const from = process.env.EMAIL_FROM?.trim() || OFFICIAL_EMAIL_FROM;
  const replyTo =
    process.env.EMAIL_REPLY_TO?.trim() || OFFICIAL_EMAIL_ADDRESS;

  if (
    extractAddress(from) !== OFFICIAL_EMAIL_ADDRESS ||
    extractAddress(replyTo) !== OFFICIAL_EMAIL_ADDRESS
  ) {
    return null;
  }

  return { from, replyTo };
}

export function isResendConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && getSenderConfiguration()
  );
}

export async function sendTransactionalEmail(
  message: TransactionalEmail
): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "not_configured" };

  const sender = getSenderConfiguration();
  if (!sender) return { ok: false, reason: "invalid_configuration" };

  const replyTo = message.replyTo?.trim() || sender.replyTo;
  if (extractAddress(replyTo) !== OFFICIAL_EMAIL_ADDRESS) {
    return { ok: false, reason: "invalid_configuration" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": `KA-Bijoux/1.0 (${LEGAL_IDENTITY.email})`,
  };
  if (message.idempotencyKey) {
    headers["Idempotency-Key"] = message.idempotencyKey.slice(0, 256);
  }

  try {
    const response = await fetch(RESEND_EMAILS_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: sender.from,
        to: [message.to],
        reply_to: replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
        tags: message.tags,
      }),
      signal: AbortSignal.timeout(RESEND_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: "provider_error",
        status: response.status,
      };
    }

    let providerId: string | null = null;
    try {
      const payload = (await response.json()) as { id?: unknown };
      providerId = typeof payload.id === "string" ? payload.id : null;
    } catch {
      // O provedor aceitou a mensagem; um corpo vazio não altera esse estado.
    }

    return { ok: true, providerId };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}
