import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { emailOtpRateLimit: mocks },
}));

import { consumeEmailOtpRateLimit } from "@/lib/email-registration-otp";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.EMAIL_OTP_HMAC_SECRET = "test-only-secret-with-at-least-32-characters";
});

describe("rate limit persistente do OTP", () => {
  it("bloqueia depois do limite sem persistir e-mail ou IP em texto puro", async () => {
    const now = new Date("2026-08-24T12:00:00.000Z");
    mocks.findUnique.mockResolvedValue({ windowStarted: new Date("2026-08-24T11:59:00.000Z"), count: 3 });

    const result = await consumeEmailOtpRateLimit({
      scope: "registration-start-email",
      identifier: "cliente@example.test",
      limit: 3,
      windowMs: 15 * 60_000,
      now,
    });

    expect(result.allowed).toBe(false);
    const keyDigest = mocks.findUnique.mock.calls[0][0].where.scope_keyDigest.keyDigest;
    expect(keyDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(keyDigest).not.toContain("cliente@example.test");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("reinicia a janela expirada", async () => {
    const now = new Date("2026-08-24T12:30:00.000Z");
    mocks.findUnique.mockResolvedValue({ windowStarted: new Date("2026-08-24T12:00:00.000Z"), count: 99 });
    mocks.upsert.mockResolvedValue({});

    const result = await consumeEmailOtpRateLimit({
      scope: "registration-verify-ip",
      identifier: "203.0.113.10",
      limit: 20,
      windowMs: 15 * 60_000,
      now,
    });

    expect(result.allowed).toBe(true);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { windowStarted: now, count: 1 } }));
  });
});
