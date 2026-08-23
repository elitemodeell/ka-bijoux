import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  rateLimit: vi.fn(),
  verifyCode: vi.fn(),
  bcryptHash: vi.fn(),
  updateSupabasePassword: vi.fn(),
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
  RATE_LIMITS: {
    passwordResetIp: { keyPrefix: "reset-ip" },
    passwordResetAccount: { keyPrefix: "reset-account" },
  },
}));
vi.mock("@/lib/password-reset", () => ({
  verifyPasswordResetCode: mocks.verifyCode,
}));
vi.mock("bcryptjs", () => ({
  default: { hash: mocks.bcryptHash },
}));
vi.mock("@/lib/supabase-auth", () => ({
  isSupabaseAuthTransitionEnabled: () => false,
  updateSupabasePassword: mocks.updateSupabasePassword,
}));

import { POST } from "@/app/api/auth/reset-password/route";

function request(code = "123456") {
  return new NextRequest(
    "https://kabijoux.com.br/api/auth/reset-password",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.0.2.20",
      },
      body: JSON.stringify({
        email: "cliente@example.test",
        code,
        newPassword: "nova-senha-segura",
      }),
    }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimit.mockResolvedValue(null);
  mocks.verifyCode.mockReturnValue(true);
  mocks.bcryptHash.mockResolvedValue("new-password-hash");
  mocks.update.mockResolvedValue({});
  mocks.updateSupabasePassword.mockResolvedValue({ error: null });
});

describe("reset password route", () => {
  it("applies limits by IP and by hashed account identifier", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await POST(request());

    expect(mocks.rateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.rateLimit.mock.calls[1][2]).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.rateLimit.mock.calls[1][2]).not.toContain(
      "cliente@example.test"
    );
  });

  it("stops before the database when rate limited", async () => {
    mocks.rateLimit.mockResolvedValueOnce(
      NextResponse.json({ error: "Muitas tentativas." }, { status: 429 })
    );

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("uses one generic error for unknown and incorrect codes", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const unknownResponse = await POST(request());
    const unknownPayload = await unknownResponse.json();

    mocks.findUnique.mockResolvedValue({
      id: "customer-1",
      passwordResetCode: "stored-hash",
      passwordResetExpires: new Date(Date.now() + 60_000),
    });
    mocks.verifyCode.mockReturnValue(false);
    const incorrectResponse = await POST(request());
    const incorrectPayload = await incorrectResponse.json();

    expect(unknownPayload.error).toBe("Código inválido ou expirado.");
    expect(incorrectPayload.error).toBe(unknownPayload.error);
  });

  it("clears an expired code hash", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "customer-1",
      passwordResetCode: "stored-hash",
      passwordResetExpires: new Date(Date.now() - 60_000),
    });

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      data: {
        passwordResetCode: null,
        passwordResetExpires: null,
      },
    });
  });

  it("changes the password and consumes a valid code hash", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "customer-1",
      passwordResetCode: "stored-hash",
      passwordResetExpires: new Date(Date.now() + 60_000),
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.verifyCode).toHaveBeenCalledWith(
      "cliente@example.test",
      "123456",
      "stored-hash"
    );
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      data: {
        passwordHash: "new-password-hash",
        passwordResetCode: null,
        passwordResetExpires: null,
      },
    });
  });
});
