import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// GET /api/customers/me/addresses
export async function GET(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);

    const addresses = await prisma.address.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return apiSuccess(addresses);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado")
      return apiError("Não autorizado.", 401);
    return apiError("Erro ao buscar endereços.", 500);
  }
}

// POST /api/customers/me/addresses
export async function POST(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const { label, street, number, complement, neighborhood, city, state, zipCode } =
      await req.json();

    if (!street || !number || !neighborhood || !city || !state || !zipCode) {
      return apiError("Campos obrigatórios: rua, número, bairro, cidade, estado e CEP.");
    }
    if (zipCode.replace(/\D/g, "").length !== 8) {
      return apiError("CEP inválido.");
    }

    const count = await prisma.address.count({ where: { customerId: customer.id } });
    const isFirst = count === 0;

    const address = await prisma.address.create({
      data: {
        customerId: customer.id,
        label: label || null,
        street: street.trim(),
        number: number.trim(),
        complement: complement?.trim() || null,
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        zipCode: zipCode.replace(/\D/g, ""),
        isDefault: isFirst,
      },
    });

    return apiSuccess(address, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado")
      return apiError("Não autorizado.", 401);
    return apiError("Erro ao criar endereço.", 500);
  }
}
