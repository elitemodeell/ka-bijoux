import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { catalogCartPhoto, visibleCatalogPhotos } from "@/lib/catalog-photo";
import { googlePlayProductWhere } from "@/lib/google-play-distribution";
import { CheckoutError, priceCart } from "./domain";

export const directSelectionSchema = z.object({
  productId: z.string().min(1).max(200),
  variationId: z.string().min(1).max(200).optional(),
  selectedPhotoUrl: z.string().min(1).max(4096).optional(),
  quantity: z.number().int().min(1).max(99),
}).strict();

export type DirectSelection = z.infer<typeof directSelectionSchema>;

export async function readDirectSelection(db: Pick<Prisma.TransactionClient, "product">, selection: DirectSelection) {
  const product = await db.product.findFirst({
    where: googlePlayProductWhere({ id: selection.productId }),
    include: {
      images: { where: visibleCatalogPhotos, orderBy: [{ order: "asc" }, { id: "asc" }] },
      variations: { where: { active: true } },
      category: true,
      _count: { select: { variations: { where: { active: true } } } },
    },
  });
  if (!product) throw new CheckoutError("Produto indisponível.", 404, "CATALOG_ITEM_UNAVAILABLE");
  const variation = product.variations.find(({ id }) => id === selection.variationId) ?? null;
  const photo = catalogCartPhoto(selection.selectedPhotoUrl, product, variation);
  if (selection.selectedPhotoUrl && !photo) {
    throw new CheckoutError("Selecione novamente a foto desta opção.", 422, "CATALOG_PHOTO_CHANGED");
  }
  const item = {
    id: "direct-selection",
    productId: product.id,
    variationId: selection.variationId ?? null,
    selectedPhotoUrl: photo,
    quantity: selection.quantity,
    product,
    variation,
  };
  const [priced] = priceCart([item]);
  return { ...item, unitPrice: priced.unitPriceCents / 100 };
}
