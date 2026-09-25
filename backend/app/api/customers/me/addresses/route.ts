import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { addressInputSchema } from "@/lib/address";
import { z } from "zod";

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
    const { label, street, number, complement, neighborhood, city, state, zipCode, recipientName, recipientPhone } =
      addressInputSchema.parse(await req.json());

    const count = await prisma.address.count({ where: { customerId: customer.id } });
    const isFirst = count === 0;

    const address = await prisma.address.create({
      data: {
        customerId: customer.id,
        label: label || null,
        street,
        number,
        complement: complement || null,
        neighborhood,
        city,
        state,
        zipCode,
        recipientName: recipientName || null,
        recipientPhone: recipientPhone || null,
        isDefault: isFirst,
      },
    });

    return apiSuccess(address, 201);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    if (e instanceof Error && e.message === "Não autorizado")
      return apiError("Não autorizado.", 401);
    return apiError("Erro ao criar endereço.", 500);
  }
}
