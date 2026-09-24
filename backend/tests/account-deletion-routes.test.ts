import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  customerFindUnique: vi.fn(),
  rateLimit: vi.fn(),
  createRequest: vi.fn(),
  sendConfirmation: vi.fn(),
  markEmailFailed: vi.fn(),
  recordAudit: vi.fn(),
  executeDeletion: vi.fn(),
  executeAuthenticatedDeletion: vi.fn(),
  cancelDeletion: vi.fn(),
  requireCustomer: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { customer: { findUnique: mocks.customerFindUnique } },
}));
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: mocks.rateLimit,
  RATE_LIMITS: {
    accountDeletionIp: { keyPrefix: "ip" },
    accountDeletionEmail: { keyPrefix: "email" },
  },
}));
vi.mock("@/lib/account-deletion", () => ({
  ACCOUNT_DELETION_GENERIC_MESSAGE:
    "Se o e-mail estiver cadastrado e ativo, você receberá as instruções para confirmar a exclusão.",
  normalizeAccountEmail: (value: string) => value.trim().toLowerCase(),
  hashAuditValue: (value: string) => `hash:${value}`,
  getRequestIp: () => "127.0.0.1",
  createAccountDeletionRequest: mocks.createRequest,
  sendAccountDeletionConfirmation: mocks.sendConfirmation,
  markDeletionEmailFailed: mocks.markEmailFailed,
  recordDeletionAudit: mocks.recordAudit,
  executeAccountDeletion: mocks.executeDeletion,
  executeAuthenticatedAccountDeletion: mocks.executeAuthenticatedDeletion,
  cancelAccountDeletion: mocks.cancelDeletion,
}));
vi.mock("@/lib/auth", () => ({ requireCustomer: mocks.requireCustomer }));

import { POST as requestDeletion } from "@/app/api/account-deletion/request/route";
import { POST as confirmDeletion } from "@/app/api/account-deletion/confirm/route";
import { DELETE as deleteAuthenticatedAccount } from "@/app/api/customers/me/route";

function request(path: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimit.mockResolvedValue(null);
  mocks.createRequest.mockResolvedValue({
    requestId: "request-1",
    token: "t".repeat(43),
    expiresAt: new Date("2026-07-28T12:30:00Z"),
  });
  mocks.sendConfirmation.mockResolvedValue(true);
  mocks.requireCustomer.mockResolvedValue({
    id: "customer-1",
    email: "cliente@example.com",
    name: "Cliente",
  });
  mocks.executeAuthenticatedDeletion.mockResolvedValue({
    found: true,
    alreadyDeleted: false,
    retainedOrderData: false,
  });
});

describe("account deletion public routes", () => {
  it("[133] creates a request for an active account and sends the confirmation", async () => {
    mocks.customerFindUnique.mockResolvedValue({
      id: "customer-1",
      email: "cliente@example.com",
    });

    const response = await requestDeletion(
      request("/api/account-deletion/request", { email: "Cliente@Example.com" })
    );

    expect(response.status).toBe(200);
    expect(mocks.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "customer-1", email: "cliente@example.com" })
    );
    expect(mocks.sendConfirmation).toHaveBeenCalledOnce();
  });

  it("[134] gives the same generic response for a nonexistent email", async () => {
    mocks.customerFindUnique.mockResolvedValue(null);

    const response = await requestDeletion(
      request("/api/account-deletion/request", { email: "ausente@example.com" })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.message).toContain("Se o e-mail estiver cadastrado");
    expect(mocks.createRequest).not.toHaveBeenCalled();
    expect(mocks.sendConfirmation).not.toHaveBeenCalled();
  });

  it("[135] blocks excessive requests before querying account existence", async () => {
    mocks.rateLimit.mockResolvedValueOnce(
      NextResponse.json({ error: "Muitas tentativas." }, { status: 429 })
    );

    const response = await requestDeletion(
      request("/api/account-deletion/request", { email: "cliente@example.com" })
    );

    expect(response.status).toBe(429);
    expect(mocks.customerFindUnique).not.toHaveBeenCalled();
  });

  it("[136] returns one generic invalid state for expired, invalid or reused confirmation", async () => {
    mocks.executeDeletion.mockResolvedValue({ status: "invalid" });

    const response = await confirmDeletion(
      request("/api/account-deletion/confirm", {
        token: "t".repeat(43),
        confirmation: "EXCLUIR",
      })
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "Este link é inválido, expirou ou já foi utilizado.",
    });
  });

  it("permite exclusão no app por uma sessão autenticada, inclusive Google", async () => {
    const response = await deleteAuthenticatedAccount(
      new NextRequest("http://localhost/api/customers/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "EXCLUIR" }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.requireCustomer).toHaveBeenCalledOnce();
    expect(mocks.executeAuthenticatedDeletion).toHaveBeenCalledWith("customer-1");
  });

  it("não exclui a conta autenticada sem a confirmação literal", async () => {
    const response = await deleteAuthenticatedAccount(
      new NextRequest("http://localhost/api/customers/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "cancelar" }),
      })
    );

    expect(response.status).toBe(422);
    expect(mocks.executeAuthenticatedDeletion).not.toHaveBeenCalled();
  });
});
