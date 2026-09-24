import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  googlePlayProductWhere,
  isGooglePlayEligibleRecord,
} from "@/lib/google-play-distribution";

type Db = PrismaClient | Prisma.TransactionClient;

export const googlePlayCartInclude = Prisma.validator<Prisma.CartInclude>()({
  items: {
    where: { product: { is: googlePlayProductWhere() } },
    include: {
      product: {
        include: {
          images: { orderBy: { order: "asc" }, take: 1 },
        },
      },
      variation: true,
    },
    orderBy: { createdAt: "asc" },
  },
});

export async function sanitizeGooglePlayCart(
  customerId: string,
  db: Db = prisma
) {
  const cart = await db.cart.upsert({
    where: { customerId },
    update: {},
    create: { customerId },
    select: { id: true },
  });

  const currentItems = await db.cartItem.findMany({
    where: { cartId: cart.id },
    select: {
      id: true,
      product: {
        select: {
          active: true,
          distributionChannels: true,
          playStoreStatus: true,
          contentClassification: true,
          policyReviewStatus: true,
          category: {
            select: {
              active: true,
              distributionChannels: true,
              playStoreStatus: true,
              contentClassification: true,
              policyReviewStatus: true,
            },
          },
        },
      },
    },
  });

  const blockedIds = currentItems
    .filter(
      (item) =>
        !isGooglePlayEligibleRecord(item.product) ||
        !isGooglePlayEligibleRecord(item.product.category)
    )
    .map((item) => item.id);

  if (blockedIds.length) {
    await db.cartItem.deleteMany({
      where: { cartId: cart.id, id: { in: blockedIds } },
    });
  }

  const safeCart = await db.cart.findUniqueOrThrow({
    where: { id: cart.id },
    include: googlePlayCartInclude,
  });

  return {
    ...safeCart,
    items: safeCart.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      product: {
        ...item.product,
        price: Number(item.product.price),
        promotionalPrice: item.product.promotionalPrice
          ? Number(item.product.promotionalPrice)
          : null,
      },
      variation: item.variation
        ? {
            ...item.variation,
            priceModifier: Number(item.variation.priceModifier),
          }
        : null,
    })),
    removedItemCount: blockedIds.length,
  };
}

export function googlePlayCartTotals(
  cart: Awaited<ReturnType<typeof sanitizeGooglePlayCart>>
) {
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.quantity * Number(item.unitPrice),
    0
  );
  return {
    subtotal,
    total: subtotal,
    itemCount: cart.items.length,
  };
}
