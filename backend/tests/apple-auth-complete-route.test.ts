import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  transitionEnabled: true,
  getSupabaseUser: vi.fn(),
  completeAppleCustomerLink: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase-auth", () => ({
  getSupabaseUser: mocks.getSupabaseUser,
  isSupabaseAuthTransitionEnabled: () => mocks.transitionEnabled,
}));
vi.mock("@/lib/google-auth-customer", () => ({
  completeAppleCustomerLink: mocks.completeAppleCustomerLink,
  GoogleCustomerLinkError: class GoogleCustomerLinkError extends Error {},
  publicGoogleCustomer: (customer: Record<string, unknown>) => customer,
}));
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: mocks.rateLimit,
  RATE_LIMITS: { auth: { keyPrefix: "auth" } },
}));

import { POST } from "@/app/api/auth/apple/complete/route";

function request(token?: string) {
  return new NextRequest("https://kabijoux.com.br/api/auth/apple/complete", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transitionEnabled = true;
  mocks.rateLimit.mockResolvedValue(null);
});

describe("POST /api/auth/apple/complete", () => {
  it("rejeita chamada sem Bearer", async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.getSupabaseUser).not.toHaveBeenCalled();
  });

  it("rejeita token que o Supabase não valida", async () => {
    mocks.getSupabaseUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
    const response = await POST(request("invalid"));
    expect(response.status).toBe(401);
    expect(mocks.completeAppleCustomerLink).not.toHaveBeenCalled();
  });

  it("conclui o vínculo Apple sem devolver o access token", async () => {
    const user = { id: "11111111-1111-4111-8111-111111111111" };
    const customer = { id: "customer-1", name: "Cliente", email: "cliente@privaterelay.appleid.com", phone: null };
    mocks.getSupabaseUser.mockResolvedValue({ data: { user }, error: null });
    mocks.completeAppleCustomerLink.mockResolvedValue({ customer, created: true, linked: true });

    const response = await POST(request("supabase-access-token"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload.data).toMatchObject({ customer, authUserId: user.id, provider: "apple" });
    expect(JSON.stringify(payload)).not.toContain("supabase-access-token");
  });

  it("bloqueia o endpoint quando a transição Auth está desligada", async () => {
    mocks.transitionEnabled = false;
    const response = await POST(request("token"));
    expect(response.status).toBe(503);
  });
});
