import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// DELETE /api/customers/me/favorites/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customer = await requireCustomer(req);

    const favorite = await prisma.favorite.findFirst({
      where: { id: params.id, customerId: customer.id },
    });
    if (!favorite) return apiError("Favorito não encontrado.", 404);

    await prisma.favorite.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Removido dos favoritos." });
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado")
      return apiError("Não autorizado.", 401);
    return apiError("Erro ao remover favorito.", 500);
  }
}
