import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OFFICIAL_EMAIL_ADDRESS,
  OFFICIAL_EMAIL_FROM,
  isResendConfigured,
  sendTransactionalEmail,
} from "@/lib/email/resend";

const message = {
  to: "cliente@example.test",
  subject: "Assunto de teste",
  html: "<p>Conteúdo</p>",
  text: "Conteúdo",
  idempotencyKey: "test-message-1",
  tags: [{ name: "flow", value: "test" }],
};

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "synthetic-resend-key");
  vi.stubEnv("EMAIL_FROM", OFFICIAL_EMAIL_FROM);
  vi.stubEnv("EMAIL_REPLY_TO", OFFICIAL_EMAIL_ADDRESS);
});

describe("centralized Resend transport", () => {
  it("fails safely when the API key is absent", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    await expect(sendTransactionalEmail(message)).resolves.toEqual({
      ok: false,
      reason: "not_configured",
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(isResendConfigured()).toBe(false);
  });

  it("sends the standardized payload without exposing configuration", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "email-synthetic-id" }), {
        status: 200,
      })
    );

    await expect(sendTransactionalEmail(message)).resolves.toEqual({
      ok: true,
      providerId: "email-synthetic-id",
    });

    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options?.headers).toMatchObject({
      Authorization: "Bearer synthetic-resend-key",
      "Content-Type": "application/json",
      "Idempotency-Key": "test-message-1",
      "User-Agent": "KA-Bijoux/1.0 (adm@kabijoux.com.br)",
    });
    const payload = JSON.parse(String(options?.body));
    expect(payload).toMatchObject({
      from: OFFICIAL_EMAIL_FROM,
      reply_to: OFFICIAL_EMAIL_ADDRESS,
      to: ["cliente@example.test"],
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: message.tags,
    });
  });

  it("returns a typed provider error for a simulated invalid key", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "unauthorized" }), {
        status: 401,
      })
    );

    await expect(sendTransactionalEmail(message)).resolves.toEqual({
      ok: false,
      reason: "provider_error",
      status: 401,
    });
  });

  it("returns a typed provider error for a simulated API failure", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));

    await expect(sendTransactionalEmail(message)).resolves.toEqual({
      ok: false,
      reason: "provider_error",
      status: 503,
    });
  });

  it("returns a typed network error without logging message content", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("synthetic network failure"));

    await expect(sendTransactionalEmail(message)).resolves.toEqual({
      ok: false,
      reason: "network_error",
    });
  });

  it("rejects a sender different from the official address", async () => {
    vi.stubEnv("EMAIL_FROM", "Other <other@example.test>");

    await expect(sendTransactionalEmail(message)).resolves.toEqual({
      ok: false,
      reason: "invalid_configuration",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
