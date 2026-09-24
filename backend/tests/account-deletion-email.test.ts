import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    accountDeletionRequest: { update: mocks.update },
  },
}));
vi.mock("@/lib/email/resend", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/email/resend")>();
  return {
    ...original,
    sendTransactionalEmail: mocks.sendEmail,
  };
});

import {
  getPublicSiteUrl,
  sendAccountDeletionConfirmation,
} from "@/lib/account-deletion";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://kabijoux.com.br");
  mocks.sendEmail.mockResolvedValue({
    ok: true,
    providerId: "synthetic-id",
  });
  mocks.update.mockResolvedValue({});
});

describe("account deletion email", () => {
  it("uses the official production URL and centralized transport", async () => {
    await expect(
      sendAccountDeletionConfirmation({
        requestId: "request-1",
        email: "cliente@example.test",
        token: "synthetic-one-time-token",
        expiresAt: new Date("2026-07-29T23:00:00Z"),
      })
    ).resolves.toBe(true);

    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "cliente@example.test",
        subject: "Confirme a exclusão da sua conta KA Bijoux",
        text: expect.stringContaining(
          "https://kabijoux.com.br/excluir-conta/confirmar?token="
        ),
        idempotencyKey: "account-deletion-request-1",
      })
    );
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { emailSentAt: expect.any(Date) },
    });
  });

  it("rejects localhost and old domains in production", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://old.example.test");

    expect(() => getPublicSiteUrl()).toThrow(
      "https://kabijoux.com.br"
    );
  });

  it("requires an explicit public URL in production", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(() => getPublicSiteUrl()).toThrow(
      "NEXT_PUBLIC_APP_URL"
    );
  });
});
