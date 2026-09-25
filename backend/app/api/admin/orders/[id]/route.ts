import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// GET /api/admin/orders/:id — Admin busca detalhe de pedido
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
    const address = order.shippingStreet
      ? {
          ...(order.address ?? {}),
          street: order.shippingStreet,
          number: order.shippingNumber,
          complement: order.shippingComplement,
          neighborhood: order.shippingNeighborhood,
          city: order.shippingCity,
          state: order.shippingState,
          zipCode: order.shippingZipCode,
          recipientName: order.recipientName,
          recipientPhone: order.recipientPhone,
        }
      : order.address;
    return apiSuccess({ ...order, address });
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao buscar pedido.", 500);
  }
}
