import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// DELETE /api/customers/me/addresses/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customer = await requireCustomer(req);

    const address = await prisma.address.findFirst({
      where: { id: params.id, customerId: customer.id },
    });
    if (!address) return apiError("Endereço não encontrado.", 404);

    await prisma.address.delete({ where: { id: params.id } });

    // Se era o padrão, define o próximo como padrão
    if (address.isDefault) {
      const next = await prisma.address.findFirst({
        where: { customerId: customer.id },
        orderBy: { createdAt: "desc" },
      });
      if (next) {
        await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }

    return apiSuccess({ message: "Endereço removido." });
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado")
      return apiError("Não autorizado.", 401);
    return apiError("Erro ao remover endereço.", 500);
  }
}
