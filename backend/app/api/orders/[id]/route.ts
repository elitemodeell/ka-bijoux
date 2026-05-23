import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// GET /api/orders/:id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customer = await requireCustomer(req);

    const order = await prisma.order.findFirst({
      where: { id: params.id, customerId: customer.id },
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1, orderBy: { order: "asc" } } } },
          },
        },
        payment: true,
        address: true,
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order) return apiError("Pedido não encontrado.", 404);
    return apiSuccess(order);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao buscar pedido.", 500);
  }
}
