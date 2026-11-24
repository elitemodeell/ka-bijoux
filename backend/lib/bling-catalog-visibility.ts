import { blingCommercialEnforced } from "@/lib/catalog-purchase-mode";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { visibleCatalogPhotos } from "@/lib/catalog-photo";

export function blingPublicProductWhere(): Prisma.ProductWhereInput {
  if (!blingCommercialEnforced()) return {};
  return {
    blingId: { not: null },
    blingVerifiedSku: { equals: prisma.product.fields.sku },
    AND: [{
      OR: [
        { purchaseMode: "OPTIONS", variations: { some: blingPublicVariationWhere() } },
        { NOT: { purchaseMode: "OPTIONS" }, images: { some: visibleCatalogPhotos } },
        { purchaseMode: null, images: { some: visibleCatalogPhotos } },
      ],
    }],
  };
}

export function blingPublicVariationWhere(): Prisma.ProductVariationWhereInput {
  if (!blingCommercialEnforced()) return { active: true };
  return {
    active: true,
    blingId: { not: null },
    blingVerifiedSku: { equals: prisma.productVariation.fields.sku },
    approvedImageUrl: { equals: prisma.productVariation.fields.imageUrl },
  };
}
