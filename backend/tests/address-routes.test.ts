import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCustomer: vi.fn(),
  address: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({ requireCustomer: mocks.requireCustomer }));
vi.mock("@/lib/prisma", () => ({ prisma: { address: mocks.address } }));

import { GET as listAddresses } from "@/app/api/customers/me/addresses/route";
import { PATCH as updateAddress, DELETE as deleteAddress } from "@/app/api/customers/me/addresses/[id]/route";
import { GET as lookupPostalCode } from "@/app/api/mobile/addresses/cep/[zipCode]/route";

const input = {
  label: "Casa", street: "Rua A", number: "10", complement: "Apto 1",
  neighborhood: "Centro", city: "Itaúna", state: "MG", zipCode: "35680000",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCustomer.mockResolvedValue({ id: "customer-1" });
});

describe("customer address isolation and editing", () => {
  it("lists only addresses belonging to the authenticated Customer", async () => {
    mocks.address.findMany.mockResolvedValue([]);
    const response = await listAddresses(new NextRequest("http://localhost/api/customers/me/addresses"));
    expect(response.status).toBe(200);
    expect(mocks.address.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { customerId: "customer-1" } }));
  });

  it("updates an owned address with normalized server-side fields", async () => {
    mocks.address.findFirst.mockResolvedValue({ id: "address-1", customerId: "customer-1" });
    mocks.address.update.mockResolvedValue({ id: "address-1", ...input });
    const request = new NextRequest("http://localhost/api/customers/me/addresses/address-1", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, state: "mg", zipCode: "35680-000" }),
    });
    const response = await updateAddress(request, { params: Promise.resolve({ id: "address-1" }) });
    expect(response.status).toBe(200);
    expect(mocks.address.findFirst).toHaveBeenCalledWith({ where: { id: "address-1", customerId: "customer-1" } });
    expect(mocks.address.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "MG", zipCode: "35680000" }) }));
  });

  it("does not update or delete another customer's address", async () => {
    mocks.address.findFirst.mockResolvedValue(null);
    const patchRequest = new NextRequest("http://localhost/api/customers/me/addresses/foreign", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    });
    expect((await updateAddress(patchRequest, { params: Promise.resolve({ id: "foreign" }) })).status).toBe(404);
    expect((await deleteAddress(new NextRequest("http://localhost/api/customers/me/addresses/foreign", { method: "DELETE" }), { params: Promise.resolve({ id: "foreign" }) })).status).toBe(404);
    expect(mocks.address.update).not.toHaveBeenCalled();
    expect(mocks.address.delete).not.toHaveBeenCalled();
  });
});

describe("postal code lookup", () => {
  it("fills address fields through the server-side CEP adapter", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ cep: "35680-000", logradouro: "Rua A", bairro: "Centro", localidade: "Itaúna", uf: "MG" }), { status: 200 })));
    const response = await lookupPostalCode(new NextRequest("http://localhost/api/mobile/addresses/cep/35680000"), { params: Promise.resolve({ zipCode: "35680000" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { zipCode: "35680000", city: "Itaúna", state: "MG" } });
  });

  it("rejects incomplete postal codes without consulting an external service", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await lookupPostalCode(new NextRequest("http://localhost/api/mobile/addresses/cep/123"), { params: Promise.resolve({ zipCode: "123" }) });
    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
