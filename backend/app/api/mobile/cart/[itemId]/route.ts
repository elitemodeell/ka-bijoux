import { NextRequest } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  googlePlayCartTotals,
  sanitizeGooglePlayCart,
} from "@/lib/google-play-cart";
import { googlePlayProductWhere, toGooglePlayPublicData } from "@/lib/google-play-distribution";
import { apiError, apiSuccess } from "@/lib/utils";

const updateSchema = z.object({ quantity: z.number().int().min(1).max(99) }).strict();

export async function PATCH(req: NextRequest, props: { params: Promise<{ itemId: string }> }) {
  const params = await props.params;
  try {
    const customer = await requireCustomer(req);
    const input = updateSchema.parse(await req.json());
    const item = await prisma.cartItem.findFirst({
      where: {
        id: params.itemId,
        cart: { customerId: customer.id },
        product: { is: googlePlayProductWhere() },
      },
      select: { id: true },
    });
    if (!item) {
      await prisma.cartItem.deleteMany({
        where: { id: params.itemId, cart: { customerId: customer.id } },
      });
      return apiError("Item não encontrado.", 404);
    }
    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: input.quantity },
    });
    const cart = await sanitizeGooglePlayCart(customer.id);
    return apiSuccess(toGooglePlayPublicData({ ...cart, ...googlePlayCartTotals(cart) }));
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    return apiError("Erro ao atualizar carrinho.", 500);
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ itemId: string }> }) {
  const params = await props.params;
  try {
    const customer = await requireCustomer(req);
    const deleted = await prisma.cartItem.deleteMany({
      where: { id: params.itemId, cart: { customerId: customer.id } },
    });
    if (!deleted.count) return apiError("Item não encontrado.", 404);
    const cart = await sanitizeGooglePlayCart(customer.id);
    return apiSuccess(toGooglePlayPublicData({ ...cart, ...googlePlayCartTotals(cart) }));
  } catch (error) {
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    return apiError("Erro ao remover item.", 500);
  }
}
