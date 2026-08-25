import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mocks = vi.hoisted(() => ({
  requireCustomer: vi.fn(),
  customerFindUnique: vi.fn(),
  bcryptCompare: vi.fn(),
  getSupabaseUser: vi.fn(),
  deleteSupabaseUser: vi.fn(),
  anonymize: vi.fn(),
  revokeStoredAppleAuthorization: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireCustomer: mocks.requireCustomer }));
vi.mock("@/lib/prisma", () => ({ prisma: { customer: { findUnique: mocks.customerFindUnique } } }));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.bcryptCompare } }));
vi.mock("@/lib/supabase-auth", () => ({
  getSupabaseUser: mocks.getSupabaseUser,
  deleteSupabaseUser: mocks.deleteSupabaseUser,
}));
vi.mock("@/lib/account-deletion", () => ({ anonymizeCustomerAccount: mocks.anonymize }));
vi.mock("@/lib/apple-sign-in", () => ({
  AppleSignInServerError: class AppleSignInServerError extends Error {},
  revokeStoredAppleAuthorization: mocks.revokeStoredAppleAuthorization,
}));

import { DELETE } from "@/app/api/customers/me/route";

function request(password?: string) {
  return new NextRequest("https://kabijoux.com.br/api/customers/me", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: "Bearer access-token" },
    body: JSON.stringify(password ? { password } : {}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCustomer.mockResolvedValue({ id: "customer-1", email: "cliente@example.test", name: "Cliente" });
  mocks.anonymize.mockResolvedValue({ id: "customer-1", active: false, deletedAt: new Date() });
  mocks.deleteSupabaseUser.mockResolvedValue({ error: null });
  mocks.revokeStoredAppleAuthorization.mockResolvedValue("missing");
});

describe("exclusão de conta", () => {
  it("exige senha válida para conta por e-mail", async () => {
    mocks.customerFindUnique.mockResolvedValue({ id: "customer-1", authUserId: null, passwordHash: "hash" });
    const missing = await DELETE(request());
    expect(missing.status).toBe(400);
    expect(mocks.anonymize).not.toHaveBeenCalled();

    mocks.bcryptCompare.mockResolvedValue(true);
    const accepted = await DELETE(request("senha-correta"));
    expect(accepted.status).toBe(200);
    expect(mocks.bcryptCompare).toHaveBeenCalledWith("senha-correta", "hash");
    expect(mocks.anonymize).toHaveBeenCalledWith("customer-1");
  });

  for (const provider of ["google", "apple"]) {
    it(`exclui conta ${provider} sem exigir uma senha inexistente`, async () => {
      mocks.customerFindUnique.mockResolvedValue({ id: "customer-1", authUserId: "auth-user-1", passwordHash: "hash" });
      mocks.getSupabaseUser.mockResolvedValue({
        data: { user: { id: "auth-user-1", identities: [{ provider }] } },
        error: null,
      });

      const response = await DELETE(request());
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(mocks.bcryptCompare).not.toHaveBeenCalled();
      expect(mocks.deleteSupabaseUser).toHaveBeenCalledWith("auth-user-1");
      expect(mocks.anonymize).toHaveBeenCalledWith("customer-1");
      expect(payload.data.accountDeleted).toBe(true);
      if (provider === "apple") {
        expect(mocks.revokeStoredAppleAuthorization).toHaveBeenCalledWith("customer-1");
        expect(payload.data.appleAuthorizationRevoked).toBe(false);
      }
    });
  }

  it("confirma a revogação automática da autorização Apple", async () => {
    mocks.customerFindUnique.mockResolvedValue({ id: "customer-1", authUserId: "auth-user-1", passwordHash: "hash" });
    mocks.getSupabaseUser.mockResolvedValue({
      data: { user: { id: "auth-user-1", identities: [{ provider: "apple" }] } },
      error: null,
    });
    mocks.revokeStoredAppleAuthorization.mockResolvedValue("revoked");

    const response = await DELETE(request());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data.appleAuthorizationRevoked).toBe(true);
  });

  it("não exclui a conta se a Apple rejeitar a revogação armazenada", async () => {
    mocks.customerFindUnique.mockResolvedValue({ id: "customer-1", authUserId: "auth-user-1", passwordHash: "hash" });
    mocks.getSupabaseUser.mockResolvedValue({
      data: { user: { id: "auth-user-1", identities: [{ provider: "apple" }] } },
      error: null,
    });
    const { AppleSignInServerError } = await import("@/lib/apple-sign-in");
    mocks.revokeStoredAppleAuthorization.mockRejectedValue(new AppleSignInServerError("apple unavailable", "revocation"));

    const response = await DELETE(request());
    expect(response.status).toBe(503);
    expect(mocks.deleteSupabaseUser).not.toHaveBeenCalled();
    expect(mocks.anonymize).not.toHaveBeenCalled();
  });

  it("não anonimiza se a remoção do Supabase Auth falhar", async () => {
    mocks.customerFindUnique.mockResolvedValue({ id: "customer-1", authUserId: "auth-user-1", passwordHash: "hash" });
    mocks.getSupabaseUser.mockResolvedValue({ data: { user: { id: "auth-user-1", identities: [{ provider: "google" }] } }, error: null });
    mocks.deleteSupabaseUser.mockResolvedValue({ error: { status: 500 } });

    const response = await DELETE(request());
    expect(response.status).toBe(503);
    expect(mocks.anonymize).not.toHaveBeenCalled();
  });

  it("orienta revogação manual Apple quando não existe token Apple armazenado", () => {
    const screen = readFileSync(resolve(__dirname, "../../mobile/app/conta/excluir.tsx"), "utf8");
    expect(screen).toContain('providers.includes("apple") && !appleAuthorizationRevoked');
    expect(screen).toContain("Iniciar sessão com Apple");
    expect(screen).toContain("Parar de usar");
  });
});
