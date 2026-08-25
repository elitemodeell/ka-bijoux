import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deletePending: vi.fn(),
  deleteCart: vi.fn(),
  deleteFavorite: vi.fn(),
  deleteNotification: vi.fn(),
  deleteReview: vi.fn(),
  deleteAddress: vi.fn(),
  anonymizeConsent: vi.fn(),
  bcryptHash: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("bcryptjs", () => ({ default: { hash: mocks.bcryptHash } }));

import { anonymizeCustomerAccount } from "@/lib/account-deletion";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.bcryptHash.mockResolvedValue("anonymous-password-hash");
  mocks.findCustomer.mockResolvedValue({ email: "cliente@example.test" });
  mocks.updateCustomer.mockResolvedValue({ id: "customer-1", active: false, deletedAt: new Date() });
  mocks.transaction.mockImplementation((callback) => callback({
    customer: { findUniqueOrThrow: mocks.findCustomer, update: mocks.updateCustomer },
    pendingEmailRegistration: { deleteMany: mocks.deletePending },
    cart: { deleteMany: mocks.deleteCart },
    favorite: { deleteMany: mocks.deleteFavorite },
    notification: { deleteMany: mocks.deleteNotification },
    review: { deleteMany: mocks.deleteReview },
    address: { deleteMany: mocks.deleteAddress },
    consentLog: { updateMany: mocks.anonymizeConsent },
  }));
});

describe("anonimização com retenção de pedidos", () => {
  it("remove dados operacionais, preserva pedidos e desativa o Customer", async () => {
    await anonymizeCustomerAccount("customer-1");

    expect(mocks.deleteAddress).toHaveBeenCalledWith({ where: { customerId: "customer-1", orders: { none: {} } } });
    expect(mocks.anonymizeConsent).toHaveBeenCalledWith({
      where: { customerId: "customer-1" },
      data: { ip: null, userAgent: null },
    });
    expect(mocks.updateCustomer).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "customer-1" },
      data: expect.objectContaining({
        active: false,
        authUserId: null,
        email: "deleted+customer-1@deleted.kabijoux.invalid",
        phone: null,
        cpf: null,
      }),
    }));
    expect(mocks.transaction.mock.calls[0][0].toString()).not.toContain("order.delete");
  });
});
