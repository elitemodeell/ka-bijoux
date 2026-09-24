import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const customer = await requireCustomer(req);
    const deleted = await prisma.favorite.deleteMany({
      where: { id: params.id, customerId: customer.id },
    });
    if (!deleted.count) return apiError("Favorito não encontrado.", 404);
    return apiSuccess({ removed: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    return apiError("Erro ao remover favorito.", 500);
  }
}
