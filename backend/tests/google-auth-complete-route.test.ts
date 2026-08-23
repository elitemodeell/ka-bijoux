import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  transitionEnabled: true,
  getSupabaseUser: vi.fn(),
  rateLimit: vi.fn(),
  customerFindUnique: vi.fn(),
  customerFindMany: vi.fn(),
  customerUpdateMany: vi.fn(),
  customerCreate: vi.fn(),
  bcryptHash: vi.fn(),
}));

vi.mock("@/lib/supabase-auth", () => ({
  getSupabaseUser: mocks.getSupabaseUser,
  isSupabaseAuthTransitionEnabled: () => mocks.transitionEnabled,
}));
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: mocks.rateLimit,
  RATE_LIMITS: { auth: { keyPrefix: "auth" } },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: mocks.customerFindUnique,
      findMany: mocks.customerFindMany,
      updateMany: mocks.customerUpdateMany,
      create: mocks.customerCreate,
    },
  },
}));
vi.mock("bcryptjs", () => ({
  default: { hash: mocks.bcryptHash },
}));

import {
  completeGoogleCustomerLink,
  GoogleCustomerLinkError,
} from "@/lib/google-auth-customer";
import { POST } from "@/app/api/auth/google/complete/route";

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_AUTH_USER_ID = "22222222-2222-4222-8222-222222222222";

const customer = {
  id: "customer-1",
  name: "Cliente Existente",
  email: "cliente@gmail.com",
  phone: "37999999999",
  active: true,
  authUserId: null,
};

function googleUser(overrides: Record<string, unknown> = {}) {
  return {
    id: AUTH_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "Cliente@Gmail.com",
    email_confirmed_at: "2026-08-03T10:00:00.000Z",
    phone: "",
    confirmed_at: "2026-08-03T10:00:00.000Z",
    last_sign_in_at: "2026-08-03T10:00:00.000Z",
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: { full_name: "  Cliente   Google  " },
    identities: [
      {
        id: "google-subject",
        user_id: AUTH_USER_ID,
        identity_data: { full_name: "Cliente Google" },
        identity_id: "33333333-3333-4333-8333-333333333333",
        provider: "google",
        created_at: "2026-08-03T10:00:00.000Z",
        updated_at: "2026-08-03T10:00:00.000Z",
      },
    ],
    created_at: "2026-08-03T10:00:00.000Z",
    updated_at: "2026-08-03T10:00:00.000Z",
    is_anonymous: false,
    ...overrides,
  } as unknown as User;
}

function request(token = "supabase-access-token") {
  return new NextRequest("https://kabijoux.com.br/api/auth/google/complete", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transitionEnabled = true;
  mocks.rateLimit.mockResolvedValue(null);
  mocks.customerFindUnique.mockResolvedValue(null);
  mocks.customerFindMany.mockResolvedValue([]);
  mocks.customerUpdateMany.mockResolvedValue({ count: 1 });
  mocks.bcryptHash.mockResolvedValue("$2b$12$unusable-random-hash");
});

describe("POST /api/auth/google/complete", () => {
  it("não cria vínculo enquanto a transição Supabase Auth está desativada", async () => {
    mocks.transitionEnabled = false;

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(mocks.getSupabaseUser).not.toHaveBeenCalled();
    expect(mocks.customerFindUnique).not.toHaveBeenCalled();
  });

  it("rejeita requisição sem Bearer sem consultar identidade", async () => {
    const response = await POST(request(""));

    expect(response.status).toBe(401);
    expect(mocks.getSupabaseUser).not.toHaveBeenCalled();
  });

  it("rejeita token que o Supabase não valida", async () => {
    mocks.getSupabaseUser.mockResolvedValue({
      data: { user: null },
      error: new Error("invalid token"),
    });

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mocks.customerFindUnique).not.toHaveBeenCalled();
  });

  it("conclui login Google e nunca devolve o access token", async () => {
    mocks.getSupabaseUser.mockResolvedValue({
      data: { user: googleUser() },
      error: null,
    });
    mocks.customerFindUnique.mockResolvedValue({
      ...customer,
      authUserId: AUTH_USER_ID,
    });

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload.data).toMatchObject({
      customer: { id: customer.id, email: customer.email },
      authUserId: AUTH_USER_ID,
      provider: "google",
      created: false,
      linked: false,
    });
    expect(JSON.stringify(payload)).not.toContain("supabase-access-token");
  });

  it("converte conflito de vínculo em resposta 409 sem detalhes internos", async () => {
    mocks.getSupabaseUser.mockResolvedValue({
      data: { user: googleUser() },
      error: null,
    });
    mocks.customerFindMany.mockResolvedValue([
      { ...customer, authUserId: OTHER_AUTH_USER_ID },
    ]);

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).not.toContain(customer.email);
    expect(mocks.customerUpdateMany).not.toHaveBeenCalled();
  });
});

describe("vinculação Google ao Customer", () => {
  it("exige identidade Google real retornada pelo Supabase", async () => {
    await expect(
      completeGoogleCustomerLink(
        googleUser({
          identities: [
            {
              provider: "email",
              identity_data: { email: "cliente@gmail.com" },
            },
          ],
        })
      )
    ).rejects.toMatchObject({
      code: "invalid_identity",
      status: 401,
    });

    expect(mocks.customerFindUnique).not.toHaveBeenCalled();
  });

  it("exige e-mail confirmado", async () => {
    await expect(
      completeGoogleCustomerLink(googleUser({ email_confirmed_at: null }))
    ).rejects.toMatchObject({
      code: "email_not_confirmed",
      status: 403,
    });
  });

  it("é idempotente quando o authUserId já está vinculado", async () => {
    mocks.customerFindUnique.mockResolvedValue({
      ...customer,
      authUserId: AUTH_USER_ID,
    });

    const result = await completeGoogleCustomerLink(googleUser());

    expect(result).toMatchObject({ created: false, linked: false });
    expect(result.customer.id).toBe(customer.id);
    expect(mocks.customerFindMany).not.toHaveBeenCalled();
    expect(mocks.customerUpdateMany).not.toHaveBeenCalled();
    expect(mocks.customerCreate).not.toHaveBeenCalled();
  });

  it("reutiliza Customer do mesmo e-mail e preserva seu ID", async () => {
    mocks.customerFindMany.mockResolvedValue([customer]);

    const result = await completeGoogleCustomerLink(googleUser());

    expect(result).toMatchObject({ created: false, linked: true });
    expect(result.customer.id).toBe("customer-1");
    expect(mocks.customerUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "customer-1", active: true, authUserId: null },
        data: expect.objectContaining({ authUserId: AUTH_USER_ID }),
      })
    );
    expect(mocks.customerCreate).not.toHaveBeenCalled();
  });

  it("bloqueia Customer inativo", async () => {
    mocks.customerFindMany.mockResolvedValue([{ ...customer, active: false }]);

    await expect(
      completeGoogleCustomerLink(googleUser())
    ).rejects.toMatchObject({
      code: "customer_inactive",
      status: 403,
    });
    expect(mocks.customerUpdateMany).not.toHaveBeenCalled();
  });

  it("bloqueia e-mail já ligado a outro authUserId", async () => {
    mocks.customerFindMany.mockResolvedValue([
      { ...customer, authUserId: OTHER_AUTH_USER_ID },
    ]);

    await expect(
      completeGoogleCustomerLink(googleUser())
    ).rejects.toMatchObject({
      code: "customer_conflict",
      status: 409,
    });
    expect(mocks.customerUpdateMany).not.toHaveBeenCalled();
  });

  it("bloqueia duplicidade legada por e-mail sem escolher silenciosamente", async () => {
    mocks.customerFindMany.mockResolvedValue([
      customer,
      { ...customer, id: "customer-duplicate", email: "CLIENTE@gmail.com" },
    ]);

    await expect(
      completeGoogleCustomerLink(googleUser())
    ).rejects.toMatchObject({
      code: "customer_conflict",
      status: 409,
    });
    expect(mocks.customerUpdateMany).not.toHaveBeenCalled();
    expect(mocks.customerCreate).not.toHaveBeenCalled();
  });

  it("cria somente um Customer novo para identidade Google nova", async () => {
    mocks.customerCreate.mockResolvedValue({
      ...customer,
      name: "Cliente Google",
      email: "cliente@gmail.com",
      authUserId: AUTH_USER_ID,
    });

    const result = await completeGoogleCustomerLink(googleUser());

    expect(result).toMatchObject({ created: true, linked: true });
    expect(mocks.bcryptHash).toHaveBeenCalledWith(expect.any(String), 12);
    expect(mocks.customerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Cliente Google",
        email: "cliente@gmail.com",
        authUserId: AUTH_USER_ID,
        passwordHash: "$2b$12$unusable-random-hash",
      }),
      select: expect.any(Object),
    });
  });

  it("aceita repetição concorrente da mesma vinculação", async () => {
    mocks.customerFindMany.mockResolvedValue([customer]);
    mocks.customerUpdateMany.mockResolvedValue({ count: 0 });
    mocks.customerFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...customer, authUserId: AUTH_USER_ID });

    const result = await completeGoogleCustomerLink(googleUser());

    expect(result.customer.authUserId).toBe(AUTH_USER_ID);
    expect(result.created).toBe(false);
  });
});
