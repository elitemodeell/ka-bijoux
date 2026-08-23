import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  signOut: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase-auth", () => ({
  isSupabaseAuthTransitionEnabled: () => true,
  refreshSupabaseSession: mocks.refresh,
  signOutSupabaseSession: mocks.signOut,
  sessionResponse: (session: Record<string, unknown>, user: { id: string }) => ({
    token: session.access_token,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    authUserId: user.id,
  }),
}));
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: mocks.rateLimit,
  RATE_LIMITS: { auth: { keyPrefix: "auth" } },
}));

import { POST as refresh } from "@/app/api/auth/refresh/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as logoutAll } from "@/app/api/auth/logout-all/route";

function jsonRequest(path: string, body: Record<string, unknown>) {
  return new NextRequest(`https://kabijoux.com.br${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimit.mockResolvedValue(null);
  mocks.signOut.mockResolvedValue({ error: null });
});

describe("sessões delegadas ao Supabase Auth", () => {
  it("renova access e refresh token usando o refresh token do Supabase", async () => {
    mocks.refresh.mockResolvedValue({
      data: {
        session: { access_token: "access-new", refresh_token: "refresh-new" },
        user: { id: "auth-user-1" },
      },
      error: null,
    });

    const oldRefreshToken = "r".repeat(48);
    const response = await refresh(jsonRequest("/api/auth/refresh", { refreshToken: oldRefreshToken }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({ accessToken: "access-new", refreshToken: "refresh-new" });
    expect(mocks.refresh).toHaveBeenCalledWith(oldRefreshToken);
  });

  it("rejeita refresh token inválido sem expor detalhes", async () => {
    mocks.refresh.mockResolvedValue({ data: { session: null, user: null }, error: new Error("internal") });
    const response = await refresh(jsonRequest("/api/auth/refresh", { refreshToken: "invalid" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Sessão inválida ou expirada." });
  });

  it("delega logout local e logout global ao Supabase", async () => {
    const local = await logout(new NextRequest("https://kabijoux.com.br/api/auth/logout", {
      method: "POST",
      headers: { Authorization: "Bearer access" },
    }));
    const global = await logoutAll(new NextRequest("https://kabijoux.com.br/api/auth/logout-all", {
      method: "POST",
      headers: { Authorization: "Bearer access" },
    }));

    expect(local.status).toBe(200);
    expect(global.status).toBe(200);
    expect(mocks.signOut).toHaveBeenNthCalledWith(1, "access", "local");
    expect(mocks.signOut).toHaveBeenNthCalledWith(2, "access", "global");
  });
});
