import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    accountDeletionRequest: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    accountDeletionAudit: { create: vi.fn() },
    customer: { findUnique: vi.fn(), update: vi.fn() },
    favorite: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
    review: { deleteMany: vi.fn() },
    cart: { deleteMany: vi.fn() },
    address: { deleteMany: vi.fn() },
  };
  return {
    tx,
    transitionEnabled: false,
    deleteSupabaseUser: vi.fn(),
    prisma: {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/supabase-auth", () => ({
  isSupabaseAuthTransitionEnabled: () => mocks.transitionEnabled,
  deleteSupabaseUser: mocks.deleteSupabaseUser,
}));

import {
  cancelAccountDeletion,
  executeAccountDeletion,
  hashDeletionToken,
} from "@/lib/account-deletion";

const token = "t".repeat(43);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("JWT_SECRET", "test-only-secret-with-at-least-32-characters");
  mocks.transitionEnabled = false;
  mocks.deleteSupabaseUser.mockResolvedValue({ error: null });
  mocks.tx.accountDeletionRequest.findUnique.mockResolvedValue({
    id: "request-1",
    customerId: "customer-1",
  });
  mocks.tx.accountDeletionRequest.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.accountDeletionRequest.update.mockResolvedValue({
    id: "request-1",
    customerId: "customer-1",
  });
  mocks.tx.customer.findUnique.mockResolvedValue({
    id: "customer-1",
    active: true,
    authUserId: null,
    orders: [{ id: "order-1" }],
  });
  mocks.tx.customer.update.mockResolvedValue({ id: "customer-1" });
  mocks.tx.accountDeletionAudit.create.mockResolvedValue({ id: "audit-1" });
});

describe("secure account deletion token", () => {
  it("[124] executes a valid one-time request and stores only the token hash", async () => {
    const result = await executeAccountDeletion(token);

    expect(result).toEqual({ status: "completed", retainedOrderData: true });
    expect(mocks.tx.accountDeletionRequest.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashDeletionToken(token) },
      select: { id: true, customerId: true },
    });
    expect(JSON.stringify(mocks.tx.accountDeletionRequest.findUnique.mock.calls)).not.toContain(
      `"${token}"`
    );
  });

  it("[125] rejects an invalid token without reading or changing a customer", async () => {
    mocks.tx.accountDeletionRequest.findUnique.mockResolvedValue(null);

    await expect(executeAccountDeletion(token)).resolves.toEqual({ status: "invalid" });
    expect(mocks.tx.customer.findUnique).not.toHaveBeenCalled();
    expect(mocks.tx.customer.update).not.toHaveBeenCalled();
  });

  it("[126] rejects an expired token when the atomic claim affects no row", async () => {
    mocks.tx.accountDeletionRequest.updateMany.mockResolvedValue({ count: 0 });

    await expect(executeAccountDeletion(token)).resolves.toEqual({ status: "invalid" });
    expect(mocks.tx.customer.update).not.toHaveBeenCalled();
  });

  it("[127] rejects a reused token when the atomic claim affects no row", async () => {
    mocks.tx.accountDeletionRequest.updateMany.mockResolvedValue({ count: 0 });

    await expect(executeAccountDeletion(token)).resolves.toEqual({ status: "invalid" });
    expect(mocks.tx.favorite.deleteMany).not.toHaveBeenCalled();
  });

  it("[128] cannot delete another account without a token bound to that account", async () => {
    mocks.tx.accountDeletionRequest.findUnique.mockResolvedValue(null);

    await executeAccountDeletion(token);
    expect(mocks.tx.customer.findUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "customer-2" } })
    );
    expect(mocks.tx.customer.update).not.toHaveBeenCalled();
  });

  it("[129] erases usage data and anonymizes personal account fields", async () => {
    await executeAccountDeletion(token);

    for (const delegate of [
      mocks.tx.favorite,
      mocks.tx.notification,
      mocks.tx.review,
      mocks.tx.cart,
    ]) {
      expect(delegate.deleteMany).toHaveBeenCalledWith({ where: { customerId: "customer-1" } });
    }
    expect(mocks.tx.address.deleteMany).toHaveBeenCalledWith({
      where: { customerId: "customer-1", orders: { none: {} } },
    });
    expect(mocks.tx.customer.update).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      data: expect.objectContaining({
        name: "Conta excluída",
        phone: null,
        cpf: null,
        active: false,
        pushToken: null,
      }),
    });
  });

  it("[130] retains orders, payment references and order-linked addresses", async () => {
    const result = await executeAccountDeletion(token);

    expect(result).toMatchObject({ retainedOrderData: true });
    expect(mocks.tx.address.deleteMany).toHaveBeenCalledWith({
      where: { customerId: "customer-1", orders: { none: {} } },
    });
    expect(mocks.tx.accountDeletionAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: expect.objectContaining({
          retainedOrderData: true,
          retainedFinancialReferences: true,
        }),
      }),
    });
  });

  it("remove a identidade Supabase depois de anonimizar e desvincular o Customer", async () => {
    mocks.transitionEnabled = true;
    mocks.tx.customer.findUnique.mockResolvedValue({
      id: "customer-1",
      active: true,
      authUserId: "auth-user-1",
      orders: [],
    });

    await expect(executeAccountDeletion(token)).resolves.toMatchObject({ status: "completed" });
    expect(mocks.tx.customer.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ authUserId: null, authMigratedAt: null }),
    }));
    expect(mocks.deleteSupabaseUser).toHaveBeenCalledWith("auth-user-1");
  });

  it("[131] treats an already deleted customer idempotently", async () => {
    mocks.tx.customer.findUnique.mockResolvedValue({
      id: "customer-1",
      active: false,
      authUserId: null,
      orders: [],
    });

    await expect(executeAccountDeletion(token)).resolves.toEqual({
      status: "completed",
      retainedOrderData: false,
    });
    expect(mocks.tx.customer.update).not.toHaveBeenCalled();
    expect(mocks.tx.accountDeletionRequest.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: expect.objectContaining({ status: "COMPLETED" }),
    });
  });

  it("[132] cancels a pending request before execution and consumes the token", async () => {
    await expect(cancelAccountDeletion(token)).resolves.toEqual({ status: "cancelled" });
    expect(mocks.tx.accountDeletionRequest.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: expect.objectContaining({ status: "CANCELLED" }),
    });
    expect(mocks.tx.customer.update).not.toHaveBeenCalled();
  });
});
