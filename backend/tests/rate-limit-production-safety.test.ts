import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: mocks.queryRaw },
}));

import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";

function request() {
  return new NextRequest(
    "https://kabijoux.com.br/api/auth/login",
    {
      headers: { "x-forwarded-for": "192.0.2.10" },
    }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  mocks.queryRaw.mockResolvedValue([{ count: 1 }]);
});

describe("database-backed rate limit", () => {
  it.each([
    ["autenticação", RATE_LIMITS.auth],
    ["solicitação de recuperação", RATE_LIMITS.forgotPassword],
    ["validação da recuperação por IP", RATE_LIMITS.passwordResetIp],
    [
      "validação da recuperação por conta",
      RATE_LIMITS.passwordResetAccount,
    ],
    ["pagamento", RATE_LIMITS.payment],
  ])("permite %s abaixo do limite", async (_name, config) => {
    await expect(rateLimit(request(), config)).resolves.toBeNull();
    expect(mocks.queryRaw).toHaveBeenCalledOnce();
  });

  it("retorna 429 ao exceder o limite", async () => {
    mocks.queryRaw.mockResolvedValue([
      { count: RATE_LIMITS.auth.limit + 1 },
    ]);

    const response = await rateLimit(request(), RATE_LIMITS.auth);

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("900");
  });

  it("falha de forma segura em produção quando o banco está indisponível", async () => {
    mocks.queryRaw.mockRejectedValue(
      new Error("synthetic database failure")
    );

    const response = await rateLimit(request(), RATE_LIMITS.auth);

    expect(response?.status).toBe(503);
    expect(response?.headers.get("Retry-After")).toBe("300");
  });

  it("permite desenvolvimento local quando o banco está indisponível", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.queryRaw.mockRejectedValue(
      new Error("synthetic database failure")
    );

    await expect(
      rateLimit(request(), RATE_LIMITS.auth)
    ).resolves.toBeNull();
  });

  it("não persiste o IP ou identificador em texto puro", async () => {
    await rateLimit(
      request(),
      RATE_LIMITS.passwordResetAccount,
      "cliente@example.test"
    );

    const interpolatedValues = mocks.queryRaw.mock.calls[0].slice(1);
    const serialized = JSON.stringify(interpolatedValues);
    expect(serialized).not.toContain("192.0.2.10");
    expect(serialized).not.toContain("cliente@example.test");
    expect(serialized).toMatch(/[a-f0-9]{64}/);
  });
});
