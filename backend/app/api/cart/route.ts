export const dynamic = 'force-dynamic';
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { buildProductIdentityFilters } from "@/lib/product-identity";

const cartInclude = {
  items: {
    include: {
      product: {
        include: {
          images: { orderBy: { order: "asc" as const }, take: 1 },
          category: true,
          subcategory: true,
        },
      },
      variation: true,
    },
  },
};

function calculateCartTotals(cart: { items: Array<{ quantity: number; unitPrice: unknown }> }) {
  const subtotal = cart.items.reduce((sum, item) => {
    return sum + Number(item.unitPrice) * item.quantity;
  }, 0);
  return { subtotal, total: subtotal };
}

async function getOrCreateCart(customerId: string) {
  return prisma.cart.upsert({
    where: { customerId },
    create: { customerId },
    update: {},
    include: cartInclude,
  });
}

// GET /api/cart
export async function GET(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const cart = await getOrCreateCart(customer.id);
    const totals = calculateCartTotals(cart);
    return apiSuccess({ ...cart, ...totals, itemCount: cart.items.length });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao buscar carrinho.", 500);
  }
}

const addItemSchema = z.object({
  productId: z.string(),
  variationId: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
});

class CartMutationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "CartMutationError";
  }
}

// POST /api/cart — Adicionar item de forma serializada por carrinho.
export async function POST(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const { productId, variationId, quantity } = addItemSchema.parse(await req.json());

    const product = await prisma.product.findFirst({
      where: { active: true, OR: buildProductIdentityFilters(productId) },
      include: { variations: true },
    });
    if (!product) return apiError("Produto não encontrado.", 404);

    const variation = variationId
      ? product.variations.find(
          (candidate) => candidate.id === variationId && candidate.active
        )
      : null;
    if (variationId && !variation) {
      return apiError("Variação não encontrada ou indisponível.", 409);
    }

    const availableStock = variation?.stock ?? product.stock;
    const basePrice = Number(product.promotionalPrice ?? product.price);
    const unitPrice = basePrice + Number(variation?.priceModifier ?? 0);
    const cartRecord = await getOrCreateCart(customer.id);

    await prisma.$transaction(async (tx) => {
      // O lock da linha do carrinho fecha o read-then-create, inclusive quando
      // variationId é NULL (NULL não é protegido pelo @@unique do PostgreSQL).
      await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "carts" WHERE "id" = ${cartRecord.id} FOR UPDATE
      `;

      const matchingItems = await tx.cartItem.findMany({
        where: {
          cartId: cartRecord.id,
          productId: product.id,
          variationId: variationId ?? null,
        },
        orderBy: { createdAt: "asc" },
      });
      const existingQuantity = matchingItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const newQuantity = existingQuantity + quantity;
      if (availableStock < newQuantity) {
        throw new CartMutationError("Estoque insuficiente.", 409);
      }

      if (matchingItems.length === 0) {
        await tx.cartItem.create({
          data: {
            cartId: cartRecord.id,
            productId: product.id,
            variationId: variationId ?? null,
            quantity,
            unitPrice,
          },
        });
        return;
      }

      await tx.cartItem.update({
        where: { id: matchingItems[0].id },
        data: { quantity: newQuantity, unitPrice },
      });
      if (matchingItems.length > 1) {
        await tx.cartItem.deleteMany({
          where: { id: { in: matchingItems.slice(1).map((item) => item.id) } },
        });
      }
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cartRecord.id },
      include: cartInclude,
    });
    if (!updatedCart) return apiError("Carrinho não encontrado.", 404);

    const totals = calculateCartTotals(updatedCart);
    return apiSuccess({
      ...updatedCart,
      ...totals,
      itemCount: updatedCart.items.length,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    if (error instanceof CartMutationError) return apiError(error.message, error.status);
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    console.error("Erro ao adicionar ao carrinho:", error);
    return apiError("Erro ao adicionar ao carrinho.", 500);
  }
}
// DELETE /api/cart — Limpar carrinho
export async function DELETE(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const cart = await prisma.cart.findUnique({ where: { customerId: customer.id } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return apiSuccess({ message: "Carrinho limpo." });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao limpar carrinho.", 500);
  }
}
