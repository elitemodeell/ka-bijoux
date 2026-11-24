import { NextRequest } from "next/server";
import { blingCommercialBlocked, catalogPurchaseBlocked, catalogReviewMessage } from "@/lib/catalog-purchase-mode";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProductIdentityFilters } from "@/lib/product-identity";
import { catalogCartPhoto, visibleCatalogPhotos } from "@/lib/catalog-photo";
import { readDirectSelection } from "@/lib/checkout/direct-selection";
import { CheckoutError } from "@/lib/checkout/domain";
import { linkedCatalogOptionLabel } from "@/lib/linked-catalog-options";
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
    selectedPhotoUrl: z.string().min(1).max(4096).optional(),
    quantity: z.number().int().min(1).max(99).default(1),
    mode: z.enum(["INCREMENT", "SET", "BUY_NOW", "DIRECT"]).default("INCREMENT"),
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
    if (input.mode === "BUY_NOW" || input.mode === "DIRECT") {
      const { mode, ...selection } = input;
      if (mode === "BUY_NOW") return apiError("Atualize o aplicativo para usar Comprar agora com o carrinho preservado.", 409);
      const item = await readDirectSelection(prisma, selection);
      return apiSuccess(toGooglePlayPublicData({
        id: item.id, productId: item.productId, variationId: item.variationId,
        selectedPhotoUrl: item.selectedPhotoUrl, quantity: item.quantity, unitPrice: item.unitPrice,
        selectionLabel: item.variation ? null : linkedCatalogOptionLabel(item.productId, item.product.sku),
        product: { name: item.product.name, sku: item.product.sku, stock: item.product.stock, active: item.product.active, images: [] },
        variation: item.variation && { name: item.variation.name, value: item.variation.value, sku: item.variation.sku, stock: item.product.sharedVariationStock ? item.product.stock : item.variation.stock },
      }));
    }
    const product = await prisma.product.findFirst({
      where: googlePlayProductWhere(input.selectedPhotoUrl
        ? { id: input.productId }
        : { OR: buildProductIdentityFilters(input.productId) }),
      include: {
        variations: { where: { active: true } },
        images: { where: visibleCatalogPhotos, select: { url: true } },
      },
    });
    if (!product) return apiError("Produto não encontrado.", 404);

    if (catalogPurchaseBlocked(product.purchaseMode, product.variations.length)) {
      return apiError(catalogReviewMessage, 409);
    }
    const variation = input.variationId
      ? product.variations.find((entry) => entry.id === input.variationId)
      : null;
    if (blingCommercialBlocked(product, variation)) return apiError(catalogReviewMessage, 409);
    if (variation && !variation.sku?.trim()) {
      return apiError("Esta opção está temporariamente indisponível.", 409);
    }
    if (input.variationId && !variation) {
      return apiError("Variação não encontrada.", 404);
    }
    if (!input.variationId && product.variations.length > 0) {
      return apiError("Selecione uma variação do produto.", 422);
    }
    const selectedPhotoUrl = input.selectedPhotoUrl
      ? catalogCartPhoto(input.selectedPhotoUrl, product, variation)
      : undefined;
    if (input.selectedPhotoUrl && !selectedPhotoUrl) {
      return apiError("A foto escolhida não pertence a esta opção. Atualize o produto e escolha novamente.", 422);
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
        const existing = await tx.cartItem.findFirst({
          where: {
            cartId: cart.id,
            productId: product.id,
            variationId: variation?.id ?? null,
            selectedPhotoUrl: selectedPhotoUrl ?? null,
          },
        });
        const quantity = input.mode === "SET"
          ? input.quantity
          : (existing?.quantity ?? 0) + input.quantity;
        const availableStock = product.sharedVariationStock ? product.stock : variation?.stock ?? product.stock;
        const otherOptions = await tx.cartItem.aggregate({
          where: {
            cartId: cart.id, productId: product.id,
            variationId: product.sharedVariationStock ? undefined : variation?.id ?? null,
            id: existing ? { not: existing.id } : undefined,
          },
          _sum: { quantity: true },
        });
        if (quantity + (otherOptions?._sum.quantity ?? 0) > availableStock) {
          throw new Error("CART_STOCK_EXCEEDED");
        }
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
              selectedPhotoUrl,
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
    if (error instanceof CheckoutError) return apiError(error.message, error.status);
    if (error instanceof z.ZodError) return apiError(error.issues[0].message, 422);
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
