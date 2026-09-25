import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProductIdentityFilters } from "@/lib/product-identity";
import { googlePlayProductWhere, toGooglePlayPublicData } from "@/lib/google-play-distribution";
import {
  googlePlayCartTotals,
  sanitizeGooglePlayCart,
} from "@/lib/google-play-cart";
import { apiError, apiSuccess } from "@/lib/utils";

const addSchema = z
  .object({
    productId: z.string().min(1).max(200),
    variationId: z.string().min(1).max(200).optional(),
    quantity: z.number().int().min(1).max(99).default(1),
    mode: z.enum(["INCREMENT", "SET", "BUY_NOW"]).default("INCREMENT"),
  })
  .strict();

export async function GET(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const cart = await sanitizeGooglePlayCart(customer.id);
    return apiSuccess(toGooglePlayPublicData({ ...cart, ...googlePlayCartTotals(cart) }));
  } catch (error) {
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    return apiError("Erro ao buscar carrinho.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const input = addSchema.parse(await req.json());
    const product = await prisma.product.findFirst({
      where: googlePlayProductWhere({
        OR: buildProductIdentityFilters(input.productId),
      }),
      include: {
        variations: { where: { active: true } },
      },
    });
    if (!product) return apiError("Produto não encontrado.", 404);

    const variation = input.variationId
      ? product.variations.find((entry) => entry.id === input.variationId)
      : null;
    if (input.variationId && !variation) {
      return apiError("Variação não encontrada.", 404);
    }

    await prisma.$transaction(
      async (tx) => {
        // A sanitização completa continua na resposta final. Aqui precisamos
        // apenas do ID do carrinho, evitando uma varredura redundante.
        const cart = await tx.cart.upsert({
          where: { customerId: customer.id },
          update: {},
          create: { customerId: customer.id },
          select: { id: true },
        });
        if (input.mode === "BUY_NOW") {
          await tx.cartItem.deleteMany({
            where: {
              cartId: cart.id,
              NOT: {
                productId: product.id,
                variationId: variation?.id ?? null,
              },
            },
          });
        }
        const existing = await tx.cartItem.findFirst({
          where: {
            cartId: cart.id,
            productId: product.id,
            variationId: variation?.id ?? null,
          },
        });
        const quantity = input.mode === "SET" || input.mode === "BUY_NOW"
          ? input.quantity
          : (existing?.quantity ?? 0) + input.quantity;
        const availableStock = variation?.stock ?? product.stock;
        if (quantity > availableStock) throw new Error("CART_STOCK_EXCEEDED");
        const unitPrice =
          Number(product.promotionalPrice ?? product.price) +
          Number(variation?.priceModifier ?? 0);

        if (existing) {
          await tx.cartItem.update({
            where: { id: existing.id },
            data: { quantity, unitPrice },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: cart.id,
              productId: product.id,
              variationId: variation?.id ?? null,
              quantity,
              unitPrice,
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    const cart = await sanitizeGooglePlayCart(customer.id);
    return apiSuccess(toGooglePlayPublicData({ ...cart, ...googlePlayCartTotals(cart) }), 201);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    if (error instanceof Error && error.message === "CART_STOCK_EXCEEDED") {
      return apiError("Estoque insuficiente.", 409);
    }
    return apiError("Erro ao adicionar ao carrinho.", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const cart = await prisma.cart.findUnique({
      where: { customerId: customer.id },
      select: { id: true },
    });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return apiSuccess({ cleared: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    return apiError("Erro ao limpar carrinho.", 500);
  }
}
