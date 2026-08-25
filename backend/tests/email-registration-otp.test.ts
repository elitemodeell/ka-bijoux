import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  customerFindFirst: vi.fn(),
  customerCreate: vi.fn(),
  customerDeleteMany: vi.fn(),
  consentCreate: vi.fn(),
  consentDeleteMany: vi.fn(),
  pendingUpsert: vi.fn(),
  pendingFindUnique: vi.fn(),
  pendingUpdate: vi.fn(),
  pendingUpdateMany: vi.fn(),
  pendingDeleteMany: vi.fn(),
  transaction: vi.fn(),
  bcryptHash: vi.fn(),
  bcryptCompare: vi.fn(),
  sendEmail: vi.fn(),
  createAuthUser: vi.fn(),
  deleteAuthUser: vi.fn(),
  signIn: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findFirst: mocks.customerFindFirst,
      create: mocks.customerCreate,
      deleteMany: mocks.customerDeleteMany,
    },
    consentLog: {
      create: mocks.consentCreate,
      deleteMany: mocks.consentDeleteMany,
    },
    pendingEmailRegistration: {
      upsert: mocks.pendingUpsert,
      findUnique: mocks.pendingFindUnique,
      update: mocks.pendingUpdate,
      updateMany: mocks.pendingUpdateMany,
      deleteMany: mocks.pendingDeleteMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mocks.bcryptHash, compare: mocks.bcryptCompare },
}));

vi.mock("@/lib/email/resend", () => ({
  OFFICIAL_EMAIL_ADDRESS: "adm@kabijoux.com.br",
  isResendConfigured: () => true,
  sendTransactionalEmail: mocks.sendEmail,
}));

vi.mock("@/lib/email-registration-otp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email-registration-otp")>();
  return { ...actual, consumeEmailOtpRateLimit: mocks.rateLimit };
});

vi.mock("@/lib/supabase-auth", () => ({
  isSupabaseAuthTransitionEnabled: () => true,
  createSupabasePasswordUser: mocks.createAuthUser,
  deleteSupabaseUser: mocks.deleteAuthUser,
  signInWithSupabasePassword: mocks.signIn,
  sessionResponse: (session: Record<string, unknown>, user: { id: string }) => ({
    token: session.access_token,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    authUserId: user.id,
  }),
}));

vi.mock("@/lib/auth", () => ({ signCustomerToken: vi.fn(() => "legacy-token") }));

import {
  digestEmailOtp,
  generateEmailOtp,
  matchesEmailOtp,
  otpExpiresAt,
  otpResendAvailableAt,
} from "@/lib/email-registration-otp";
import { POST as startRegistration } from "@/app/api/auth/register/route";
import { POST as resendRegistration } from "@/app/api/auth/register/resend/route";
import { POST as verifyRegistration } from "@/app/api/auth/register/verify/route";

const EMAIL = "cliente@example.test";
const PASSWORD = "senha-segura";

function request(path: string, body: Record<string, unknown>) {
  return new NextRequest(`https://kabijoux.com.br${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.10" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.EMAIL_OTP_HMAC_SECRET = "test-only-secret-with-at-least-32-characters";
  mocks.rateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  mocks.bcryptHash.mockResolvedValue("$2b$12$hashed-password-without-plaintext");
  mocks.bcryptCompare.mockResolvedValue(true);
  mocks.sendEmail.mockResolvedValue({ ok: true, providerId: "email-1" });
  mocks.pendingUpdateMany.mockResolvedValue({ count: 1 });
  mocks.pendingDeleteMany.mockResolvedValue({ count: 1 });
  mocks.customerDeleteMany.mockResolvedValue({ count: 1 });
  mocks.consentDeleteMany.mockResolvedValue({ count: 1 });
  mocks.deleteAuthUser.mockResolvedValue({ error: null });
  mocks.transaction.mockImplementation(async (input: unknown) => {
    if (typeof input === "function") {
      return input({
        customer: { create: mocks.customerCreate },
        consentLog: { create: mocks.consentCreate },
      });
    }
    return Promise.all(input as Promise<unknown>[]);
  });
});

describe("primitivas de segurança do OTP de cadastro", () => {
  it("gera seis dígitos e armazena apenas HMAC verificável", () => {
    const code = generateEmailOtp();
    const digest = digestEmailOtp("pending-1", EMAIL, code);

    expect(code).toMatch(/^\d{6}$/);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain(code);
    expect(matchesEmailOtp(digest, "pending-1", EMAIL.toUpperCase(), code)).toBe(true);
    expect(matchesEmailOtp(digest, "pending-1", EMAIL, "000000" === code ? "000001" : "000000")).toBe(false);
  });

  it("aplica validade de 15 minutos e cooldown de 60 segundos", () => {
    const now = new Date("2026-08-24T12:00:00.000Z");
    expect(otpExpiresAt(now).getTime() - now.getTime()).toBe(15 * 60_000);
    expect(otpResendAvailableAt(now).getTime() - now.getTime()).toBe(60_000);
  });
});

describe("cadastro por e-mail em duas etapas", () => {
  it("informa rate limit sem fingir que o OTP foi enviado", async () => {
    mocks.rateLimit
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 })
      .mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 120 });

    const response = await startRegistration(request("/api/auth/register", {
      name: "Cliente Teste",
      email: EMAIL,
      password: PASSWORD,
      acceptedTerms: true,
    }));
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.error).toContain("Muitas tentativas");
    expect(mocks.customerFindFirst).not.toHaveBeenCalled();
    expect(mocks.pendingUpsert).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("inicia pendência e envia OTP sem criar Customer, Supabase User ou sessão", async () => {
    mocks.customerFindFirst.mockResolvedValue(null);
    mocks.pendingUpsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) => create);

    const response = await startRegistration(request("/api/auth/register", {
      name: "Cliente Teste",
      email: EMAIL,
      password: PASSWORD,
      acceptedTerms: true,
    }));
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload.data.pending).toBe(true);
    expect(mocks.pendingUpsert).toHaveBeenCalledOnce();
    const create = mocks.pendingUpsert.mock.calls[0][0].create;
    expect(create.passwordHash).toBe("$2b$12$hashed-password-without-plaintext");
    expect(JSON.stringify(create)).not.toContain(PASSWORD);
    expect(create.otpDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.customerCreate).not.toHaveBeenCalled();
    expect(mocks.createAuthUser).not.toHaveBeenCalled();
    expect(payload.data).not.toHaveProperty("token");
  });

  it("só cria Customer, consentimento, usuário Supabase e sessão depois do OTP correto", async () => {
    const code = "123456";
    const pending = {
      id: "pending-1",
      email: EMAIL,
      name: "Cliente Teste",
      phone: null,
      passwordHash: "$2b$12$hashed-password-without-plaintext",
      consentVersion: "2026-07",
      consentIp: "203.0.113.10",
      consentUserAgent: "vitest",
      otpDigest: digestEmailOtp("pending-1", EMAIL, code),
      otpExpiresAt: new Date(Date.now() + 60_000),
      otpAttempts: 0,
      resendAvailableAt: new Date(),
      consumedAt: null,
    };
    const customer = { id: "customer-1", name: pending.name, email: EMAIL, phone: null };
    mocks.pendingFindUnique.mockResolvedValue(pending);
    mocks.customerFindFirst.mockResolvedValue(null);
    mocks.customerCreate.mockResolvedValue(customer);
    mocks.consentCreate.mockResolvedValue({});
    mocks.createAuthUser.mockResolvedValue({ data: { user: { id: "auth-user-1" } }, error: null });
    mocks.signIn.mockResolvedValue({
      data: {
        session: { access_token: "supabase-access", refresh_token: "supabase-refresh" },
        user: { id: "auth-user-1" },
      },
      error: null,
    });

    const response = await verifyRegistration(request("/api/auth/register/verify", {
      email: EMAIL,
      code,
      password: PASSWORD,
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(mocks.createAuthUser).toHaveBeenCalledWith(expect.objectContaining({ emailConfirmed: true }));
    expect(mocks.customerCreate).toHaveBeenCalledOnce();
    expect(mocks.consentCreate).toHaveBeenCalledOnce();
    expect(mocks.signIn).toHaveBeenCalledWith(EMAIL, PASSWORD);
    expect(mocks.pendingDeleteMany).toHaveBeenCalledWith({ where: { id: "pending-1" } });
    expect(payload.data.token).toBe("supabase-access");
  });

  it("incrementa tentativas e não cria conta quando o OTP está errado", async () => {
    mocks.pendingFindUnique.mockResolvedValue({
      id: "pending-1",
      email: EMAIL,
      otpDigest: digestEmailOtp("pending-1", EMAIL, "123456"),
      otpExpiresAt: new Date(Date.now() + 60_000),
      otpAttempts: 0,
      consumedAt: null,
    });
    mocks.pendingUpdate.mockResolvedValue({ otpAttempts: 1 });

    const response = await verifyRegistration(request("/api/auth/register/verify", {
      email: EMAIL,
      code: "654321",
      password: PASSWORD,
    }));

    expect(response.status).toBe(400);
    expect(mocks.pendingUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { otpAttempts: { increment: 1 } },
    }));
    expect(mocks.customerCreate).not.toHaveBeenCalled();
    expect(mocks.createAuthUser).not.toHaveBeenCalled();
  });

  it("rejeita OTP expirado sem criar conta", async () => {
    mocks.pendingFindUnique.mockResolvedValue({
      id: "pending-1",
      email: EMAIL,
      otpDigest: digestEmailOtp("pending-1", EMAIL, "123456"),
      otpExpiresAt: new Date(Date.now() - 1),
      otpAttempts: 0,
      consumedAt: null,
    });

    const response = await verifyRegistration(request("/api/auth/register/verify", {
      email: EMAIL,
      code: "123456",
      password: PASSWORD,
    }));

    expect(response.status).toBe(410);
    expect(mocks.pendingUpdateMany).not.toHaveBeenCalled();
    expect(mocks.customerCreate).not.toHaveBeenCalled();
    expect(mocks.createAuthUser).not.toHaveBeenCalled();
  });

  it("reenvia um novo OTP, zera tentativas e invalida o digest anterior", async () => {
    const previousDigest = "0".repeat(64);
    mocks.pendingFindUnique.mockResolvedValue({
      id: "pending-1",
      email: EMAIL,
      name: "Cliente Teste",
      otpDigest: previousDigest,
      resendAvailableAt: new Date(Date.now() - 1),
      consumedAt: null,
    });
    mocks.pendingUpdate.mockResolvedValue({});

    const response = await resendRegistration(request("/api/auth/register/resend", { email: EMAIL }));

    expect(response.status).toBe(200);
    expect(mocks.pendingUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "pending-1" },
      data: expect.objectContaining({ otpAttempts: 0 }),
    }));
    const nextDigest = mocks.pendingUpdate.mock.calls[0][0].data.otpDigest;
    expect(nextDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(nextDigest).not.toBe(previousDigest);
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
  });
});
