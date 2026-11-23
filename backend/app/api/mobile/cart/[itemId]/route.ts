import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
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
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.cartItem.findFirst({
        where: {
          id: params.itemId,
          cart: { customerId: customer.id },
          product: { is: googlePlayProductWhere() },
        },
        select: { id: true, cartId: true, productId: true, variationId: true,
          product: { select: { sharedVariationStock: true, stock: true } },
          variation: { select: { stock: true } } },
      });
      if (!item) {
        await tx.cartItem.deleteMany({
          where: { id: params.itemId, cart: { customerId: customer.id } },
        });
        return 404;
      }
      const pool = await tx.cartItem.aggregate({
        where: { cartId: item.cartId, productId: item.productId,
          variationId: item.product.sharedVariationStock ? undefined : item.variationId, id: { not: item.id } },
        _sum: { quantity: true },
      });
      const stock = item.product.sharedVariationStock ? item.product.stock : item.variation?.stock ?? item.product.stock;
      if (input.quantity + (pool._sum.quantity ?? 0) > stock) return 409;
      await tx.cartItem.update({
        where: { id: item.id },
        data: { quantity: input.quantity },
      });
      return 200;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result === 404) return apiError("Item não encontrado.", 404);
    if (result === 409) return apiError("Estoque insuficiente.", 409);
    const cart = await sanitizeGooglePlayCart(customer.id);
    return apiSuccess(toGooglePlayPublicData({ ...cart, ...googlePlayCartTotals(cart) }));
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.issues[0].message, 422);
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
