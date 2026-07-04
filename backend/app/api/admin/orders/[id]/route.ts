import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// GET /api/admin/orders/:id — Admin busca detalhe de pedido
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        address: true,
        items: {
          include: {
            product: { include: { images: { take: 1, orderBy: { order: "asc" } } } },
          },
        },
        payment: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!order) return apiError("Pedido não encontrado.", 404);
    return apiSuccess(order);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao buscar pedido.", 500);
  }
}
