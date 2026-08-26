import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCustomer: vi.fn(),
  profile: vi.fn(),
  addresses: vi.fn(),
  orders: vi.fn(),
  favorites: vi.fn(),
  notifications: vi.fn(),
  consents: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireCustomer: mocks.requireCustomer }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: { findUnique: mocks.profile },
    address: { findMany: mocks.addresses },
    order: { findMany: mocks.orders },
    favorite: { findMany: mocks.favorites },
    notification: { findMany: mocks.notifications },
    consentLog: { findMany: mocks.consents },
  },
}));

import { GET } from "@/app/api/customers/me/export/route";

function request(token = "valid-access-token") {
  return new NextRequest("https://kabijoux.com.br/api/customers/me/export", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCustomer.mockResolvedValue({ id: "customer-1", email: "cliente@example.test", name: "Cliente" });
  mocks.profile.mockResolvedValue({ id: "customer-1", name: "Cliente", email: "cliente@example.test" });
  mocks.addresses.mockResolvedValue([]);
  mocks.orders.mockResolvedValue([]);
  mocks.favorites.mockResolvedValue([]);
  mocks.notifications.mockResolvedValue([]);
  mocks.consents.mockResolvedValue([]);
});

describe("exportação autenticada de dados do cliente", () => {
  it("exige a sessão e devolve 401 sem autorização válida", async () => {
    mocks.requireCustomer.mockRejectedValue(new Error("Não autorizado"));
    const response = await GET(request("expired-token"));
    expect(response.status).toBe(401);
    expect(mocks.profile).not.toHaveBeenCalled();
  });

  it("consulta exclusivamente os registros pertencentes ao cliente autenticado", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(mocks.requireCustomer).toHaveBeenCalledOnce();
    for (const query of [mocks.addresses, mocks.orders, mocks.favorites, mocks.notifications, mocks.consents]) {
      expect(query).toHaveBeenCalledWith(expect.objectContaining({ where: { customerId: "customer-1" } }));
    }
    expect(mocks.profile).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "customer-1" } }));
  });

  it("entrega JSON válido como arquivo e não inclui credenciais", async () => {
    const response = await GET(request());
    const raw = await response.text();
    const payload = JSON.parse(raw);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain("ka-bijoux-meus-dados-customer-1.json");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(payload.profile.email).toBe("cliente@example.test");
    expect(raw).not.toMatch(/passwordHash|refreshToken|accessToken/i);
  });
});
