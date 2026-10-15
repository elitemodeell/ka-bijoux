import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { admin: { findUnique: mocks.findUnique } },
}));

let auth: typeof import("@/lib/auth");

beforeAll(async () => {
  process.env.JWT_SECRET = "test-admin-secret-with-at-least-32-characters";
  auth = await import("@/lib/auth");
});

beforeEach(() => {
  vi.clearAllMocks();
});

function dbAdmin(updatedAt: Date, overrides: Record<string, unknown> = {}) {
  return {
    id: "admin-1",
    email: "admin@example.test",
    role: "SUPER_ADMIN",
    active: true,
    updatedAt,
    ...overrides,
  };
}

function request(token: string) {
  return new NextRequest("https://kabijoux.com.br/api/admin/dashboard", {
    headers: { cookie: `ka-admin-token=${token}` },
  });
}

describe("admin session revocation", () => {
  it("accepts a session issued after the last admin update", async () => {
    const updatedAt = new Date(Date.now() - 5_000);
    mocks.findUnique.mockResolvedValue(dbAdmin(updatedAt));
    const token = auth.signAdminToken({
      id: "admin-1",
      email: "admin@example.test",
      role: "SUPER_ADMIN",
      sessionVersion: updatedAt.getTime(),
    });

    await expect(auth.requireAdmin(request(token))).resolves.toMatchObject({ id: "admin-1" });
  });

  it("rejects a session older than a password or admin update", async () => {
    const previousVersion = Date.now() - 5_000;
    mocks.findUnique.mockResolvedValue(dbAdmin(new Date()));
    const token = auth.signAdminToken({
      id: "admin-1",
      email: "admin@example.test",
      role: "SUPER_ADMIN",
      sessionVersion: previousVersion,
    });

    await expect(auth.requireAdmin(request(token))).rejects.toThrow("autorizado");
  });

  it.each([
    ["missing", null],
    ["inactive", dbAdmin(new Date(), { active: false })],
  ])("rejects a %s administrator", async (_label, record) => {
    const updatedAt = new Date();
    mocks.findUnique.mockResolvedValue(record && { ...record, updatedAt });
    const token = auth.signAdminToken({
      id: "admin-1",
      email: "admin@example.test",
      role: "SUPER_ADMIN",
      sessionVersion: updatedAt.getTime(),
    });

    await expect(auth.requireAdmin(request(token))).rejects.toThrow("autorizado");
  });

  it("rejects stale permissions embedded in a token", async () => {
    const updatedAt = new Date();
    mocks.findUnique.mockResolvedValue(dbAdmin(updatedAt, { role: "ADMIN" }));
    const token = auth.signAdminToken({
      id: "admin-1",
      email: "admin@example.test",
      role: "SUPER_ADMIN",
      sessionVersion: updatedAt.getTime(),
    });

    await expect(auth.requireAdmin(request(token))).rejects.toThrow("autorizado");
  });

  it("does not revoke another legitimate administrator", async () => {
    const updatedAt = new Date();
    mocks.findUnique.mockResolvedValue(dbAdmin(updatedAt, {
      id: "admin-2",
      email: "other-admin@example.test",
      role: "ADMIN",
    }));
    const token = auth.signAdminToken({
      id: "admin-2",
      email: "other-admin@example.test",
      role: "ADMIN",
      sessionVersion: updatedAt.getTime(),
    });

    await expect(auth.requireAdmin(request(token))).resolves.toMatchObject({
      id: "admin-2",
      role: "ADMIN",
    });
  });

  it("rejects a regular customer token on an admin route", async () => {
    const token = auth.signCustomerToken({
      id: "customer-1",
      email: "customer@example.test",
      name: "Customer",
    });

    await expect(auth.requireAdmin(request(token))).rejects.toThrow("autorizado");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
