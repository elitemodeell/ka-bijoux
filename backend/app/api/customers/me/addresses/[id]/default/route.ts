import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// PATCH /api/customers/me/addresses/:id/default
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customer = await requireCustomer(req);

    const address = await prisma.address.findFirst({
      where: { id: params.id, customerId: customer.id },
    });
    if (!address) return apiError("Endereço não encontrado.", 404);

    // Remove padrão de todos, depois define o novo
    await prisma.address.updateMany({
      where: { customerId: customer.id },
      data: { isDefault: false },
    });
    await prisma.address.update({
      where: { id: params.id },
      data: { isDefault: true },
    });

    return apiSuccess({ message: "Endereço padrão atualizado." });
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado")
      return apiError("Não autorizado.", 401);
    return apiError("Erro ao atualizar endereço padrão.", 500);
  }
}
