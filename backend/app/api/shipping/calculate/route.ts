import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculateShipping } from "@/lib/shipping";
import { apiSuccess, apiError } from "@/lib/utils";

const schema = z.object({
  zipCode: z.string().min(8).max(9),
  cartId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
      })
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { zipCode, cartId, items: bodyItems } = schema.parse(body);

    const config = await prisma.storeSettings.findFirst();
    if (!config) return apiError("Configurações da loja não encontradas.", 500);

    let shippingItems: Array<{
      weight: number; height: number; width: number; length: number; quantity: number;
    }> = [];

    if (cartId) {
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: { items: { include: { product: true } } },
      });
      if (!cart) return apiError("Carrinho não encontrado.", 404);
      shippingItems = cart.items.map((item) => ({
        weight: Number(item.product.weight),
        height: Number(item.product.height),
        width: Number(item.product.width),
        length: Number(item.product.length),
        quantity: item.quantity,
      }));
    } else if (bodyItems) {
      const productIds = bodyItems.map((i) => i.productId);
      const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

      shippingItems = bodyItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new Error(`Produto ${item.productId} não encontrado.`);
        return {
          weight: Number(product.weight),
          height: Number(product.height),
          width: Number(product.width),
          length: Number(product.length),
          quantity: item.quantity,
        };
      });
    } else {
      return apiError("Informe cartId ou items.", 400);
    }

    const options = await calculateShipping(zipCode, shippingItems, {
      correiosEnabled: config.correiosEnabled,
      mototaxiEnabled: config.mototaxiEnabled,
      storePickupEnabled: config.storePickupEnabled,
      mototaxiPrice: Number(config.mototaxiPrice),
    });

    return apiSuccess(options);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    if (e instanceof Error) return apiError(e.message, 400);
    return apiError("Erro ao calcular frete.", 500);
  }
}
