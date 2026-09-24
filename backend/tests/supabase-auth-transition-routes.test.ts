import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  transitionEnabled: true,
  customerFindFirst: vi.fn(),
  customerUpdateMany: vi.fn(),
  customerUpdate: vi.fn(),
  customerDeleteMany: vi.fn(),
  consentDeleteMany: vi.fn(),
  consentCreate: vi.fn(),
  customerCreate: vi.fn(),
  transaction: vi.fn(),
  bcryptCompare: vi.fn(),
  bcryptHash: vi.fn(),
  signLegacy: vi.fn(() => "legacy-token"),
  signIn: vi.fn(),
  createAuthUser: vi.fn(),
  updateAuthPassword: vi.fn(),
  deleteAuthUser: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findFirst: mocks.customerFindFirst,
      updateMany: mocks.customerUpdateMany,
      update: mocks.customerUpdate,
      deleteMany: mocks.customerDeleteMany,
    },
    consentLog: { deleteMany: mocks.consentDeleteMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.bcryptCompare, hash: mocks.bcryptHash } }));
vi.mock("@/lib/auth", () => ({ signCustomerToken: mocks.signLegacy }));
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: mocks.rateLimit,
  RATE_LIMITS: { auth: { keyPrefix: "auth" } },
}));
vi.mock("@/lib/supabase-auth", () => ({
  isSupabaseAuthTransitionEnabled: () => mocks.transitionEnabled,
  signInWithSupabasePassword: mocks.signIn,
  createSupabasePasswordUser: mocks.createAuthUser,
  updateSupabasePassword: mocks.updateAuthPassword,
  deleteSupabaseUser: mocks.deleteAuthUser,
  sessionResponse: (session: Record<string, unknown>, user: { id: string }) => ({
    token: session.access_token,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    authUserId: user.id,
  }),
}));

import { POST as login } from "@/app/api/auth/login/route";
import { POST as register } from "@/app/api/auth/register/route";

const customer = {
  id: "customer-1",
  name: "Cliente",
  email: "cliente@example.test",
  phone: null,
  passwordHash: "$2b$12$hash",
  active: true,
  authUserId: null,
  authMigratedAt: null,
};

function session(userId = "auth-user-1", customerId = "customer-1") {
  return {
    data: {
      session: { access_token: "supabase-access", refresh_token: "supabase-refresh" },
      user: { id: userId, app_metadata: { customer_id: customerId } },
    },
    error: null,
  };
}

function request(path: "login" | "register", body: Record<string, unknown>) {
  return new NextRequest(`https://kabijoux.com.br/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transitionEnabled = true;
  mocks.rateLimit.mockResolvedValue(null);
  mocks.customerUpdateMany.mockResolvedValue({ count: 1 });
  mocks.customerUpdate.mockResolvedValue({});
  mocks.customerDeleteMany.mockResolvedValue({ count: 1 });
  mocks.consentDeleteMany.mockResolvedValue({ count: 1 });
  mocks.bcryptCompare.mockResolvedValue(true);
  mocks.bcryptHash.mockResolvedValue("$2b$12$new-hash");
  mocks.updateAuthPassword.mockResolvedValue({ error: null });
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

describe("transição de login para Supabase Auth", () => {
  it("aceita usuário já migrado e preserva o Customer", async () => {
    mocks.signIn.mockResolvedValue(session());
    mocks.customerFindFirst.mockResolvedValue({ ...customer, authUserId: "auth-user-1" });

    const response = await login(request("login", { email: customer.email, password: "senha-correta" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.token).toBe("supabase-access");
    expect(payload.data.customer.id).toBe("customer-1");
    expect(mocks.bcryptCompare).not.toHaveBeenCalled();
    expect(mocks.signLegacy).not.toHaveBeenCalled();
  });

  it("migra no primeiro login após validar a senha bcrypt legada", async () => {
    mocks.signIn.mockResolvedValueOnce({ data: { session: null, user: null }, error: new Error("invalid") })
      .mockResolvedValueOnce(session("auth-new"));
    mocks.customerFindFirst.mockResolvedValueOnce(customer)
      .mockResolvedValueOnce({ ...customer, authUserId: "auth-new" });
    mocks.createAuthUser.mockResolvedValue({ data: { user: { id: "auth-new" } }, error: null });

    const response = await login(request("login", { email: customer.email, password: "senha-correta" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.bcryptCompare).toHaveBeenCalledWith("senha-correta", customer.passwordHash);
    expect(mocks.createAuthUser).toHaveBeenCalledWith(expect.objectContaining({
      customerId: "customer-1",
      emailConfirmed: true,
      legacyEmailVerificationInherited: true,
      password: "senha-correta",
    }));
    expect(mocks.customerUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "customer-1", authUserId: null },
    }));
    expect(payload.data.migratedFromLegacy).toBe(true);
    expect(payload.data.customer.id).toBe("customer-1");
  });

  it("rejeita senha incorreta sem criar ou vincular usuário", async () => {
    mocks.signIn.mockResolvedValue({ data: { session: null, user: null }, error: new Error("invalid") });
    mocks.customerFindFirst.mockResolvedValue(customer);
    mocks.bcryptCompare.mockResolvedValue(false);

    const response = await login(request("login", { email: customer.email, password: "incorreta" }));

    expect(response.status).toBe(401);
    expect(mocks.createAuthUser).not.toHaveBeenCalled();
    expect(mocks.customerUpdateMany).not.toHaveBeenCalled();
  });

  it("não vincula automaticamente usuário Auth sem metadata do Customer", async () => {
    mocks.signIn.mockResolvedValue(session("untrusted-auth-user", "different-customer"));
    mocks.customerFindFirst.mockResolvedValue(customer);
    mocks.bcryptCompare.mockResolvedValue(false);

    const response = await login(request("login", { email: customer.email, password: "senha-do-auth-estranho" }));

    expect(response.status).toBe(401);
    expect(mocks.customerUpdateMany).not.toHaveBeenCalled();
  });
});

describe("cadastro novo no Supabase Auth", () => {
  it("cria Supabase User, mantém Customer e retorna sessão Supabase", async () => {
    mocks.customerFindFirst.mockResolvedValue(null);
    mocks.customerCreate.mockResolvedValue(customer);
    mocks.consentCreate.mockResolvedValue({});
    mocks.createAuthUser.mockResolvedValue({ data: { user: { id: "auth-new" } }, error: null });
    mocks.signIn.mockResolvedValue(session("auth-new"));

    const response = await register(request("register", {
      name: "Cliente",
      email: customer.email,
      phone: "37999999999",
      password: "senha-segura",
      acceptedTerms: true,
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.token).toBe("supabase-access");
    expect(payload.data.customer.id).toBe("customer-1");
    expect(mocks.customerUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "customer-1" },
      data: expect.objectContaining({ authUserId: "auth-new" }),
    }));
  });

  it("rejeita e-mail duplicado antes de criar usuário Auth", async () => {
    mocks.customerFindFirst.mockResolvedValue({ id: "existing" });

    const response = await register(request("register", {
      name: "Cliente",
      email: customer.email,
      password: "senha-segura",
      acceptedTerms: true,
    }));

    expect(response.status).toBe(409);
    expect(mocks.createAuthUser).not.toHaveBeenCalled();
  });
});
