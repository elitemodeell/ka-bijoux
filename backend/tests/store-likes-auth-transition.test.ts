import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fakeDatabase = vi.hoisted(() => {
  type Like = { id: string; customerId: string | null };
  const rows = new Map<string, Like>();
  const storeLike = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const row = rows.get(where.id);
      return row ? { ...row } : null;
    },
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { id: string };
      create: Like;
      update: Partial<Like>;
    }) => {
      const current = rows.get(where.id);
      const next = current ? { ...current, ...update } : { ...create };
      rows.set(where.id, next);
      return { ...next };
    },
    deleteMany: async ({ where }: { where: { id: string } }) => ({
      count: Number(rows.delete(where.id)),
    }),
    count: async () => rows.size,
  };
  return {
    rows,
    storeLike,
    prisma: {
      storeLike,
      $transaction: async <T>(callback: (tx: { storeLike: typeof storeLike }) => Promise<T>) =>
        callback({ storeLike }),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: fakeDatabase.prisma }));

import { setStoreLike, storeLikeState } from "@/lib/store-likes";

const secret = "store-like-auth-transition-test-secret";
const actorKey = (scope: "visitor" | "customer", value: string) =>
  createHmac("sha256", secret).update(`ka-store-like:${scope}:${value}`).digest("hex");

describe("curtida da loja durante autenticação", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = secret;
    fakeDatabase.rows.clear();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    vi.restoreAllMocks();
  });

  it("transfere a curtida visitante para a conta sem reduzir a contagem", async () => {
    const visitorId = "f8d0475c-71ad-4e18-ae70-781a5d145876";
    const visitorKey = actorKey("visitor", visitorId);
    const customerKey = actorKey("customer", "customer-a");
    fakeDatabase.rows.set(visitorKey, { id: visitorKey, customerId: null });
    fakeDatabase.rows.set("other-valid-like", { id: "other-valid-like", customerId: null });

    const state = await storeLikeState(visitorId, "customer-a");

    expect(state).toEqual({ count: 2, liked: true });
    expect(fakeDatabase.rows.has(visitorKey)).toBe(false);
    expect(fakeDatabase.rows.get(customerKey)).toEqual({ id: customerKey, customerId: "customer-a" });
  });

  it("deduplica a mesma pessoa sem apagar a curtida da conta nem afetar outros usuários", async () => {
    const visitorId = "f8d0475c-71ad-4e18-ae70-781a5d145876";
    const visitorKey = actorKey("visitor", visitorId);
    const customerKey = actorKey("customer", "customer-a");
    fakeDatabase.rows.set(visitorKey, { id: visitorKey, customerId: null });
    fakeDatabase.rows.set(customerKey, { id: customerKey, customerId: "customer-a" });
    fakeDatabase.rows.set("other-valid-like", { id: "other-valid-like", customerId: null });

    const state = await storeLikeState(visitorId, "customer-a");

    expect(state).toEqual({ count: 2, liked: true });
    expect(fakeDatabase.rows.has(visitorKey)).toBe(false);
    expect(fakeDatabase.rows.get(customerKey)).toEqual({ id: customerKey, customerId: "customer-a" });
    expect(fakeDatabase.rows.has("other-valid-like")).toBe(true);
  });

  it("não expõe nem transfere curtidas da conta anterior para outra conta", async () => {
    const visitorId = "f8d0475c-71ad-4e18-ae70-781a5d145876";
    const customerAKey = actorKey("customer", "customer-a");
    const customerBKey = actorKey("customer", "customer-b");
    fakeDatabase.rows.set(customerAKey, { id: customerAKey, customerId: "customer-a" });

    const state = await storeLikeState(visitorId, "customer-b");

    expect(state).toEqual({ count: 1, liked: false });
    expect(fakeDatabase.rows.has(customerAKey)).toBe(true);
    expect(fakeDatabase.rows.has(customerBKey)).toBe(false);
  });

  it("aplica descurtida durante o login sem ressuscitar a curtida visitante", async () => {
    const visitorId = "f8d0475c-71ad-4e18-ae70-781a5d145876";
    const visitorKey = actorKey("visitor", visitorId);
    const customerKey = actorKey("customer", "customer-a");
    fakeDatabase.rows.set(visitorKey, { id: visitorKey, customerId: null });
    fakeDatabase.rows.set(customerKey, { id: customerKey, customerId: "customer-a" });
    fakeDatabase.rows.set("other-valid-like", { id: "other-valid-like", customerId: null });

    const state = await setStoreLike(visitorId, "customer-a", false);

    expect(state).toEqual({ count: 1, liked: false });
    expect(fakeDatabase.rows.has(visitorKey)).toBe(false);
    expect(fakeDatabase.rows.has(customerKey)).toBe(false);
    expect(fakeDatabase.rows.has("other-valid-like")).toBe(true);
  });
});
