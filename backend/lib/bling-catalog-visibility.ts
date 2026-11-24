import { blingCommercialEnforced } from "@/lib/catalog-purchase-mode";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function blingPublicProductWhere(): Prisma.ProductWhereInput {
  if (!blingCommercialEnforced()) return {};
  return { blingId: { not: null }, blingVerifiedSku: { equals: prisma.product.fields.sku } };
}

export function blingPublicVariationWhere(): Prisma.ProductVariationWhereInput {
  if (!blingCommercialEnforced()) return { active: true };
  return {
    active: true,
    blingId: { not: null },
    blingVerifiedSku: { equals: prisma.productVariation.fields.sku },
  };
}
