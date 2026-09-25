import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { calculateShipping } from "@/lib/shipping";
import { apiSuccess, apiError } from "@/lib/utils";
import { isGooglePlayMobileRequest } from "@/lib/google-play-distribution";
import { sanitizeGooglePlayCart } from "@/lib/google-play-cart";

const schema = z
  .object({
    zipCode: z
      .string()
      .optional()
      .default("")
      .transform((value) => value.replace(/\D/g, ""))
      .refine((value) => value.length === 0 || value.length === 8, "CEP inválido."),
    addressId: z.string().min(1).optional(),
  })
  .strict();

// Calcula somente com itens do carrinho pertencente ao cliente autenticado.
export async function POST(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const data = schema.parse(await req.json());

    const googlePlay = isGooglePlayMobileRequest(req);
    const [config, cart, address] = await Promise.all([
      prisma.storeSettings.findFirst(),
      googlePlay
        ? sanitizeGooglePlayCart(customer.id)
        : prisma.cart.findUnique({
            where: { customerId: customer.id },
            include: { items: { include: { product: true } } },
          }),
      data.addressId
        ? prisma.address.findFirst({ where: { id: data.addressId, customerId: customer.id } })
        : Promise.resolve(null),
    ]);

    if (!cart || cart.items.length === 0) {
      return apiError("Carrinho vazio.", 400);
    }
    if (!config) {
      return apiError("Configuração de entrega indisponível.", 503);
    }
    if (data.addressId && !address) return apiError("Endereço inválido.", 403);

    const options = await calculateShipping(
      data.zipCode,
      cart.items.map((item) => ({
        weight: Number(item.product.weight),
        height: Number(item.product.height),
        width: Number(item.product.width),
        length: Number(item.product.length),
        quantity: item.quantity,
        declaredValue: Number(item.unitPrice),
      })),
      {
        correiosEnabled: config.correiosEnabled,
        mototaxiEnabled: config.mototaxiEnabled,
        storePickupEnabled: config.storePickupEnabled,
        mototaxiPrice: Number(config.mototaxiPrice),
        storeAddress: config.storeAddress,
        storeCity: config.storeCity,
        storeState: config.storeState,
        storeZipCode: config.storeZipCode,
        packageWeight: config.shippingPackageWeight ? Number(config.shippingPackageWeight) : null,
        packageHeight: config.shippingPackageHeight ? Number(config.shippingPackageHeight) : null,
        packageWidth: config.shippingPackageWidth ? Number(config.shippingPackageWidth) : null,
        packageLength: config.shippingPackageLength ? Number(config.shippingPackageLength) : null,
        handlingDays: config.shippingHandlingDays,
      },
      address ? { city: address.city, state: address.state } : undefined
    );

    return apiSuccess(options);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    console.error("Erro ao calcular frete:", error);
    return apiError("Erro ao calcular frete.", 500);
  }
}
