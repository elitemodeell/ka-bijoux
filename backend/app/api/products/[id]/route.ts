import { NextRequest } from "next/server";
import { belongsToCatalogGallery, isKaCatalogAsset, isOfficialCatalogPhoto, officialDatabaseGallery } from "@/lib/catalog-photo";
import { catalogGalleryForPurchase, catalogPurchaseBlocked, catalogPurchaseModes, validateCatalogOptions } from "@/lib/catalog-purchase-mode";
import { planKaPhotoPush } from "@/lib/bling-photo-push";
import { z } from "zod";
import { ProductEnrichmentStatus, ProductImportSource, ProductPublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { isAdultImageUrl, getBlingProductBySlug, findBlingProductForSource } from "@/lib/bling-catalog";

const productInclude = {
  category: true,
  subcategory: true,
  images: { orderBy: { order: "asc" as const } },
  variations: { where: { active: true }, orderBy: { order: "asc" as const } },
};

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    let isAdmin = false;
    try { await requireAdmin(req); isAdmin = true; } catch { /* public request */ }

    const activeFilter = isAdmin ? {} : { active: true };
    const detailInclude = isAdmin
      ? { ...productInclude, variations: { orderBy: { order: "asc" as const } } }
      : productInclude;

    // First: direct lookup by UUID or slug
    let product = await prisma.product.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }], ...activeFilter },
      include: detailInclude,
    });

    // Second: if not found, check Bling catalog for this slug to get blingId/sku,
    // then retry the DB query — same strategy the website uses
    if (!product) {
      const blingId = params.id.startsWith("bling-") ? params.id.slice(6) : null;
      const blingEntry = blingId
        ? findBlingProductForSource({ blingId })
        : getBlingProductBySlug(params.id);

      if (blingEntry) {
        const orFilters: { blingId?: string; sku?: string; slug?: string }[] = [];
        if (blingEntry.blingId) orFilters.push({ blingId: blingEntry.blingId });
        if (blingEntry.sku) orFilters.push({ sku: blingEntry.sku });
        if (orFilters.length) {
          product = await prisma.product.findFirst({
            where: { OR: orFilters, ...activeFilter },
            include: detailInclude,
          });
        }
      }
    }

    if (!product) return apiError("Produto nao encontrado.", 404);

    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, active: true, id: { not: product.id } },
      include: { images: { orderBy: { order: "asc" }, take: 1 }, category: true, subcategory: true },
      take: 6,
    });

    const isAdultProduct = product.category?.slug === "sex-shop";
    const officialImages = product.images.filter((img) => isOfficialCatalogPhoto(img.url, product.id, product.sku));
    const publicImages = isAdultProduct ? officialImages : officialImages.filter((img) => !isAdultImageUrl(img.url));
    const purchaseReviewRequired = catalogPurchaseBlocked(product.purchaseMode, product.variations.filter((option) => option.active).length);
    const filteredProduct = {
      ...product,
      purchaseReviewRequired,
      stock: !isAdmin && purchaseReviewRequired ? 0 : product.stock,
      images: isAdmin ? product.images : catalogGalleryForPurchase(publicImages, purchaseReviewRequired),
      variations: (!isAdmin && purchaseReviewRequired ? [] : product.variations).map((variation) => ({
        ...variation,
        imageUrl: isAdmin || (variation.imageUrl && isOfficialCatalogPhoto(variation.imageUrl, product.id, variation.sku, variation.id))
          ? variation.imageUrl
          : null,
      })),
    };
    const filteredRelated = related.map((r) => {
      const isAdultRelated = r.category?.slug === "sex-shop";
      const images = r.images.filter((img) => isOfficialCatalogPhoto(img.url, r.id, r.sku));
      return {
        ...r,
        images: isAdultRelated ? images : images.filter((img) => !isAdultImageUrl(img.url)),
      };
    });

    // Apply Bling catalog overlays: display name and current price
    // (same strategy the website uses — DB may have stale name/price from import)

    // A Bling complementa apenas preco; nome, descricao, categoria e imagens
    // continuam sendo o cadastro editado no site.
    const enrichedProduct = {
      ...filteredProduct,
      name: product.name,
      price: Number(product.price),
      promotionalPrice: product.promotionalPrice ? Number(product.promotionalPrice) : null,
      description: product.description,
    };

    return apiSuccess({ product: enrichedProduct, related: filteredRelated });
  } catch {
    return apiError("Erro ao buscar produto.", 500);
  }
}

const variationUpsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  value: z.string().min(1),
  sku: z.string().trim().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  stock: z.number().int().min(0).default(0),
  priceModifier: z.number().default(0),
  isDefault: z.boolean().default(false),
  order: z.number().int().default(0),
  active: z.boolean().default(true),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  images: z.array(z.object({ url: z.string(), alt: z.string().optional(), order: z.number().int().optional() })).optional(),
  variations: z.array(variationUpsertSchema).optional(),
  description: z.string().min(3).optional(),
  brand: z.string().trim().optional().nullable(),
  ean: z.string().trim().optional().nullable(),
  benefits: z.string().trim().optional().nullable(),
  howToUse: z.string().trim().optional().nullable(),
  composition: z.string().trim().optional().nullable(),
  careInstructions: z.string().trim().optional().nullable(),
  packageContents: z.string().trim().optional().nullable(),
  price: z.number().positive().optional(),
  promotionalPrice: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  width: z.number().positive().optional(),
  length: z.number().positive().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional().nullable(),
  sku: z.string().trim().optional().nullable(),
  blingId: z.string().trim().optional().nullable(),
  importSource: z.nativeEnum(ProductImportSource).optional(),
  enrichmentStatus: z.nativeEnum(ProductEnrichmentStatus).optional(),
  publicationStatus: z.nativeEnum(ProductPublicationStatus).optional(),
  searchTags: z.array(z.string().trim()).optional(),
  assortedColors: z.boolean().optional(),
  purchaseMode: z.enum(catalogPurchaseModes).nullable().optional(),
  sharedVariationStock: z.boolean().optional(),
  fixedColor: z.string().trim().min(1).max(100).nullable().optional(),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireAdmin(req);
    const body = await req.json();
    const data = updateSchema.parse(body);
    const importSource = data.importSource ?? (data.blingId ? ProductImportSource.BLING : undefined);
    const shouldQueueResearch =
      importSource === ProductImportSource.BLING && !data.enrichmentStatus;

    const { images, variations, ...rest } = data;
    if (rest.purchaseMode !== "REVIEW" && (rest.publicationStatus === "PUBLISHED" || rest.active === true)) {
      const currentImages = images
        ? images.map((image) => image.url)
        : (await prisma.productImage.findMany({ where: { productId: params.id }, select: { url: true } }))
          .map((image) => image.url);
      if (!officialDatabaseGallery(currentImages, params.id).length) {
        return apiError("Publique somente com foto própria aprovada.", 422);
      }
    }
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({
        where: { id: params.id },
        select: { sku: true, purchaseMode: true, sharedVariationStock: true, variations: true, images: { select: { url: true } } },
      });
      const mode = rest.purchaseMode === undefined ? current?.purchaseMode : rest.purchaseMode;
      const priorGallery = new Set(current?.images.map(({ url }) => url));
      const priorOptions = new Map(current?.variations.map(({ id, imageUrl }) => [id, imageUrl]));
      if (images?.some(({ url }) => !priorGallery.has(url) && (!isKaCatalogAsset(url) ||
          !isOfficialCatalogPhoto(url, params.id, rest.sku ?? current?.sku))) ||
          variations?.some(({ id, imageUrl, sku }) => imageUrl && priorOptions.get(id ?? "") !== imageUrl &&
            (!isKaCatalogAsset(imageUrl) || !isOfficialCatalogPhoto(imageUrl, params.id, sku, id)))) {
        return { catalogValidation: "Use uma foto oficial da KA Bijoux que corresponda ao produto ou à opção." } as const;
      }
      const options = (variations ?? current?.variations ?? []).map((option) => ({
        ...option,
        imageUrl: option.imageUrl && belongsToCatalogGallery(option.imageUrl, params.id, option.id)
          ? option.imageUrl
          : null,
      }));
      const validation = validateCatalogOptions(
        mode,
        rest.sharedVariationStock ?? current?.sharedVariationStock ?? false,
        options,
      );
      if (validation) return { catalogValidation: validation } as const;
      const product = await tx.product.update({
        where: { id: params.id },
        data: {
          ...rest,
          fixedColor: rest.assortedColors ? null : rest.fixedColor,
          importSource,
          enrichmentStatus: shouldQueueResearch
            ? ProductEnrichmentStatus.PENDING_RESEARCH
            : rest.enrichmentStatus,
          importedAt: importSource === ProductImportSource.BLING ? new Date() : undefined,
        },
        include: productInclude,
      });

      if (images) {
        await tx.productImage.deleteMany({ where: { productId: params.id } });
        if (images.length > 0) {
          await tx.productImage.createMany({
            data: [...new Map(images.map((image) => [image.url, image])).values()].map((img, i) => ({
              productId: params.id,
              url: img.url,
              alt: img.alt ?? product.name,
              order: img.order ?? i,
            })),
          });
        }
      }

      if (variations) {
        const incomingIds = variations.filter((v) => v.id).map((v) => v.id as string);
        await tx.productVariation.updateMany({
          where: { productId: params.id, id: { notIn: incomingIds } },
          data: { active: false, isDefault: false },
        });

        if (variations.some((v) => v.isDefault)) {
          const defaultId = variations.find((v) => v.isDefault)?.id;
          if (defaultId) {
            await tx.productVariation.updateMany({
              where: { productId: params.id, id: { not: defaultId } },
              data: { isDefault: false },
            });
          }
        }

        for (const v of variations) {
          if (v.id) {
            await tx.productVariation.update({
              where: { id: v.id, productId: params.id },
              data: {
                name: v.name, value: v.value,
                sku: v.sku || null, imageUrl: v.imageUrl || null,
                stock: v.stock, priceModifier: v.priceModifier,
                isDefault: v.isDefault, order: v.order, active: v.active,
              },
            });
          } else {
            await tx.productVariation.create({
              data: {
                productId: params.id,
                name: v.name, value: v.value,
                sku: v.sku || null, imageUrl: v.imageUrl || null,
                stock: v.stock, priceModifier: v.priceModifier,
                isDefault: v.isDefault, order: v.order, active: v.active,
              },
            });
          }
        }
      }

      return tx.product.findUnique({ where: { id: params.id }, include: productInclude });
    });
    if (updated && "catalogValidation" in updated) return apiError(updated.catalogValidation, 422);
    if (updated && (images || variations?.some((variation) => variation.imageUrl))) {
      const plan = planKaPhotoPush({
        productId: updated.id,
        blingId: updated.blingId,
        sku: updated.sku,
        images: updated.images,
        variations: updated.variations,
      });
      console.info(JSON.stringify({
        event: "ka-photo-push-prepared",
        productId: updated.id,
        sku: updated.sku,
        status: plan.status,
        reason: plan.reason,
        targets: plan.targets.length,
      }));
    }
    return apiSuccess(updated);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.issues[0].message, 422);
    return apiError("Erro ao atualizar produto.", 500);
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireAdmin(req);
    await prisma.product.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Produto removido." });
  } catch {
    return apiError("Erro ao remover produto.", 500);
  }
}
