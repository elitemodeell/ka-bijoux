import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { googlePlayProductWhere, toGooglePlayPublicData } from "@/lib/google-play-distribution";
import { apiError, apiSuccess } from "@/lib/utils";
import { isOfficialCatalogPhoto, visibleCatalogPhotos } from "@/lib/catalog-photo";
import { catalogGalleryForPurchase, catalogPurchaseBlocked } from "@/lib/catalog-purchase-mode";
import { linkedCatalogOptions } from "@/lib/linked-catalog-options";
import { catalogVariantsForSelection, saleReadyProduct, variationsShareSkuInventory } from "@/lib/catalog-storefront-eligibility";

const detailInclude = Prisma.validator<Prisma.ProductInclude>()({
  category: true,
  subcategory: true,
  images: { where: visibleCatalogPhotos, orderBy: { order: "asc" } },
  variations: { where: { active: true }, orderBy: { order: "asc" } },
});

function serialize<T extends {
  price: unknown;
  id: string;
  sku: string | null;
  promotionalPrice: unknown;
  stock: number;
  sharedVariationStock: boolean;
  purchaseMode: string | null;
  images: { url: string }[];
  variations: { id: string; sku: string | null; priceModifier: unknown; stock: number; imageUrl: string | null }[];
}>(product: T) {
  const images = product.images.filter(({ url }) => isOfficialCatalogPhoto(url, product.id, product.sku));
  const purchaseReviewRequired = catalogPurchaseBlocked(product.purchaseMode, product.variations.length);
  const sharedSkuInventory = variationsShareSkuInventory(product.sharedVariationStock, product.variations);
  return {
    ...product,
    price: Number(product.price),
    purchaseReviewRequired,
    stock: purchaseReviewRequired ? 0 : product.stock,
    images: catalogGalleryForPurchase(images, purchaseReviewRequired),
    variations: (purchaseReviewRequired ? [] : product.variations).map((variation) => ({
      ...variation,
      imageUrl: variation.imageUrl && isOfficialCatalogPhoto(variation.imageUrl, product.id, variation.sku, variation.id)
        ? variation.imageUrl
        : null,
      stock: sharedSkuInventory ? product.stock : variation.stock,
      priceModifier: Number(variation.priceModifier),
    })),
    promotionalPrice: product.promotionalPrice
      ? Number(product.promotionalPrice)
      : null,
  };
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const product = await prisma.product.findFirst({
      where: googlePlayProductWhere({
        OR: [{ id: params.id }, { slug: params.id }],
      }),
      include: detailInclude,
    });

    if (!product) return apiError("Produto não encontrado.", 404);

    const related = await prisma.product.findMany({
      where: googlePlayProductWhere({
        categoryId: product.categoryId,
        id: { not: product.id },
      }),
      include: {
        category: true,
        subcategory: true,
        images: { where: visibleCatalogPhotos, orderBy: { order: "asc" }, take: 1 },
        variations: { where: { active: true }, orderBy: { order: "asc" } },
      },
      take: 30,
    });

    const linkedOptions = await linkedCatalogOptions(product.id, googlePlayProductWhere({}));
    const currentLinkedOption = linkedOptions.find((option) => option.id === product.id);
    const missingConfirmedPhoto = Boolean(currentLinkedOption && !currentLinkedOption.imageUrl);
    const serializedProduct = serialize(product);
    const selectionVariations = catalogVariantsForSelection(serializedProduct);
    const sale = saleReadyProduct({ ...serializedProduct, variations: selectionVariations });
    if (!sale || missingConfirmedPhoto) return apiError("Produto nÃ£o encontrado.", 404);
    const publicProduct = { ...serializedProduct, ...sale };
    // The selector uses the complete confirmed commercial family. Stock-zero
    // or photo-pending children stay visible as unavailable instead of
    // disappearing after another option is selected.
    publicProduct.variations = selectionVariations;
    const relatedProducts = related.flatMap((entry) => {
      const serialized = serialize(entry);
      const eligible = saleReadyProduct(serialized);
      return eligible ? [{ ...serialized, ...eligible }] : [];
    }).slice(0, 6);
    return apiSuccess(toGooglePlayPublicData({
      product: {
        ...publicProduct,
        linkedOptions,
      },
      related: relatedProducts,
    }));
  } catch {
    return apiError("Erro ao buscar produto.", 500);
  }
}
