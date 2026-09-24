import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCustomer: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireCustomer: mocks.requireCustomer }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      updateMany: mocks.updateMany,
      update: mocks.update,
    },
  },
}));
vi.mock("@/lib/account-deletion", () => ({
  executeAuthenticatedAccountDeletion: vi.fn(),
}));

import { PATCH } from "@/app/api/customers/me/route";

const VALID_CPF = "52998224725";
const OTHER_VALID_CPF = "11144477735";
const PROFILE = {
  id: "customer-1",
  name: "Cliente Teste",
  email: "cliente@example.com",
  phone: "31999999999",
  cpf: VALID_CPF,
};

function patch(body: Record<string, unknown>) {
  return PATCH(
    new NextRequest("http://localhost/api/customers/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

function firstSave() {
  mocks.findUnique
    .mockResolvedValueOnce({ cpf: null })
    .mockResolvedValueOnce(PROFILE);
  mocks.findFirst.mockResolvedValue(null);
  mocks.updateMany.mockResolvedValue({ count: 1 });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCustomer.mockResolvedValue({ id: "customer-1" });
  mocks.update.mockResolvedValue(PROFILE);
});

describe("PATCH /api/customers/me - CPF", () => {
  it.each([
    ["com máscara", "529.982.247-25"],
    ["sem máscara", VALID_CPF],
  ])("aceita CPF válido %s e persiste somente dígitos", async (_label, cpf) => {
    firstSave();
    const response = await patch({ name: "Cliente Teste", cpf, phone: "(31) 99999-9999" });

    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "customer-1", cpf: null },
      data: expect.objectContaining({ cpf: VALID_CPF, phone: "31999999999" }),
    }));
  });

  it("rejeita CPF inválido com erro específico", async () => {
    const response = await patch({ cpf: "111.111.111-11" });
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ code: "CPF_INVALID" });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("permite reenviar o mesmo CPF e atualizar os demais dados", async () => {
    mocks.findUnique
      .mockResolvedValueOnce({ cpf: VALID_CPF })
      .mockResolvedValueOnce({ ...PROFILE, name: "Nome Atualizado" });

    const response = await patch({ cpf: VALID_CPF, name: "Nome Atualizado" });
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      data: { name: "Nome Atualizado" },
    });
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("bloqueia a alteração de um CPF já vinculado", async () => {
    mocks.findUnique.mockResolvedValue({ cpf: VALID_CPF });
    const response = await patch({ cpf: OTHER_VALID_CPF });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "CPF_IMMUTABLE" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("bloqueia CPF pertencente a outro Customer sem revelar a conta", async () => {
    mocks.findUnique.mockResolvedValue({ cpf: null });
    mocks.findFirst.mockResolvedValue({ id: "customer-2" });
    const response = await patch({ cpf: VALID_CPF });
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Este CPF já está vinculado a outra conta.", code: "CPF_IN_USE" });
    expect(JSON.stringify(body)).not.toContain("customer-2");
  });

  it("trata de forma idempotente duas gravações concorrentes do mesmo CPF", async () => {
    mocks.findUnique
      .mockResolvedValueOnce({ cpf: null })
      .mockResolvedValueOnce({ cpf: VALID_CPF })
      .mockResolvedValueOnce(PROFILE);
    mocks.findFirst.mockResolvedValue(null);
    mocks.updateMany.mockResolvedValue({ count: 0 });

    const response = await patch({ cpf: VALID_CPF, name: "Cliente Teste" });
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      data: { name: "Cliente Teste" },
    });
  });

  it("retorna telefone inválido sem descartar o nome silenciosamente", async () => {
    const response = await patch({ name: "Cliente Teste", phone: "123" });
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ code: "PHONE_INVALID" });
  });

  it("retorna sessão expirada sem consultar o perfil", async () => {
    mocks.requireCustomer.mockRejectedValue(new Error("Não autorizado"));
    const response = await patch({ cpf: VALID_CPF });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "SESSION_EXPIRED" });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("não inclui o CPF completo no log de falha inesperada", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.findUnique.mockRejectedValue(new Error(`falha durante ${VALID_CPF}`));
    const response = await patch({ cpf: VALID_CPF });
    expect(response.status).toBe(500);
    expect(JSON.stringify(log.mock.calls)).not.toContain(VALID_CPF);
  });
});
