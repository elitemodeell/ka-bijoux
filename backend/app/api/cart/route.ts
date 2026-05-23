import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

const cartInclude = {
  items: {
    include: {
      product: {
        include: {
          images: { orderBy: { order: "asc" as const }, take: 1 },
          category: true,
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

// POST /api/cart — Adicionar item
export async function POST(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const body = await req.json();
    const { productId, variationId, quantity } = addItemSchema.parse(body);

    const product = await prisma.product.findUnique({
      where: { id: productId, active: true },
      include: { variations: true },
    });
    if (!product) return apiError("Produto não encontrado.", 404);

    const availableStock = variationId
      ? product.variations.find((v) => v.id === variationId)?.stock ?? 0
      : product.stock;

    if (availableStock < quantity) return apiError("Estoque insuficiente.", 400);

    const cart = await getOrCreateCart(customer.id);

    const unitPrice = variationId
      ? Number(product.price) + Number(product.variations.find((v) => v.id === variationId)?.priceModifier ?? 0)
      : Number(product.promotionalPrice ?? product.price);

    const existingItem = cart.items.find(
      (i) => i.productId === productId && i.variationId === (variationId ?? null)
    );

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (availableStock < newQty) return apiError("Estoque insuficiente.", 400);
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, variationId, quantity, unitPrice },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    });

    const totals = calculateCartTotals(updatedCart!);
    return apiSuccess({ ...updatedCart, ...totals, itemCount: updatedCart!.items.length });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
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
