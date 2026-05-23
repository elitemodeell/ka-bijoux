import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// PATCH /api/cart/:itemId — Atualizar quantidade
export async function PATCH(req: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const customer = await requireCustomer(req);
    const { quantity } = z.object({ quantity: z.number().int().min(1) }).parse(await req.json());

    const item = await prisma.cartItem.findFirst({
      where: { id: params.itemId, cart: { customerId: customer.id } },
      include: { product: true, variation: true },
    });
    if (!item) return apiError("Item não encontrado.", 404);

    const stock = item.variation?.stock ?? item.product.stock;
    if (stock < quantity) return apiError("Estoque insuficiente.", 400);

    const updated = await prisma.cartItem.update({
      where: { id: params.itemId },
      data: { quantity },
    });

    return apiSuccess(updated);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro ao atualizar item.", 500);
  }
}

// DELETE /api/cart/:itemId — Remover item
export async function DELETE(req: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const customer = await requireCustomer(req);

    const item = await prisma.cartItem.findFirst({
      where: { id: params.itemId, cart: { customerId: customer.id } },
    });
    if (!item) return apiError("Item não encontrado.", 404);

    await prisma.cartItem.delete({ where: { id: params.itemId } });
    return apiSuccess({ message: "Item removido." });
  } catch {
    return apiError("Erro ao remover item.", 500);
  }
}
