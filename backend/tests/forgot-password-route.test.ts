import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  rateLimit: vi.fn(),
  isConfigured: vi.fn(),
  sendEmail: vi.fn(),
  buildTemplate: vi.fn(),
  generateCode: vi.fn(),
  hashCode: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: mocks.rateLimit,
  RATE_LIMITS: { forgotPassword: { keyPrefix: "forgot" } },
}));
vi.mock("@/lib/email/resend", () => ({
  isResendConfigured: mocks.isConfigured,
  sendTransactionalEmail: mocks.sendEmail,
}));
vi.mock("@/lib/email/templates", () => ({
  buildPasswordResetEmail: mocks.buildTemplate,
}));
vi.mock("@/lib/password-reset", () => ({
  generatePasswordResetCode: mocks.generateCode,
  hashPasswordResetCode: mocks.hashCode,
}));

import { POST } from "@/app/api/auth/forgot-password/route";

function request(email = "cliente@example.test") {
  return new NextRequest(
    "https://kabijoux.com.br/api/auth/forgot-password",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "test");
  mocks.rateLimit.mockResolvedValue(null);
  mocks.isConfigured.mockReturnValue(true);
  mocks.generateCode.mockReturnValue("123456");
  mocks.hashCode.mockReturnValue("hashed-reset-code");
  mocks.buildTemplate.mockReturnValue({
    subject: "Assunto",
    html: "<p>HTML</p>",
    text: "Texto",
  });
  mocks.sendEmail.mockResolvedValue({
    ok: true,
    providerId: "synthetic-id",
  });
  mocks.update.mockResolvedValue({});
});

describe("forgot password route", () => {
  it("fails closed in production when Resend is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.isConfigured.mockReturnValue(false);

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("returns the same generic response for an unknown account", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.message).toContain(
      "Se o e-mail estiver cadastrado"
    );
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("stores only the code hash and sends through the centralized service", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "customer-1",
      email: "cliente@example.test",
      name: "Cliente",
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      data: expect.objectContaining({
        passwordResetCode: "hashed-reset-code",
        passwordResetExpires: expect.any(Date),
      }),
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "cliente@example.test",
        subject: "Assunto",
        html: "<p>HTML</p>",
        text: "Texto",
      })
    );
    expect(JSON.stringify(mocks.update.mock.calls)).not.toContain("123456");
  });

  it("clears the reset hash after a simulated delivery failure", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "customer-1",
      email: "cliente@example.test",
      name: "Cliente",
    });
    mocks.sendEmail.mockResolvedValue({
      ok: false,
      reason: "provider_error",
      status: 401,
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await POST(request());

    expect(mocks.update).toHaveBeenLastCalledWith({
      where: { id: "customer-1" },
      data: {
        passwordResetCode: null,
        passwordResetExpires: null,
      },
    });
  });
});
