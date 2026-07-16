import { NextRequest } from "next/server";
import { z } from "zod";
import { ProductEnrichmentStatus, ProductImportSource, ProductPublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { isAdultImageUrl } from "@/lib/bling-catalog";

const productInclude = {
  category: true,
  subcategory: true,
  images: { orderBy: { order: "asc" as const } },
  variations: { where: { active: true }, orderBy: { order: "asc" as const } },
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    let isAdmin = false;
    try { await requireAdmin(req); isAdmin = true; } catch { /* public request */ }

    const product = await prisma.product.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }], ...(isAdmin ? {} : { active: true }) },
      include: productInclude,
    });

    if (!product) return apiError("Produto nao encontrado.", 404);

    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, active: true, id: { not: product.id } },
      include: { images: { orderBy: { order: "asc" }, take: 1 }, category: true, subcategory: true },
      take: 6,
    });

    const isAdultProduct = product.category?.slug === "sex-shop";
    const filteredProduct = {
      ...product,
      images: isAdultProduct
        ? product.images
        : product.images.filter((img) => !isAdultImageUrl(img.url)),
    };
    const filteredRelated = related.map((r) => {
      const isAdultRelated = r.category?.slug === "sex-shop";
      return {
        ...r,
        images: isAdultRelated ? r.images : r.images.filter((img) => !isAdultImageUrl(img.url)),
      };
    });

    return apiSuccess({ product: filteredProduct, related: filteredRelated });
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
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const data = updateSchema.parse(body);
    const importSource = data.importSource ?? (data.blingId ? ProductImportSource.BLING : undefined);
    const shouldQueueResearch =
      importSource === ProductImportSource.BLING && !data.enrichmentStatus;

    const { images, variations, ...rest } = data;

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...rest,
        importSource,
        enrichmentStatus: shouldQueueResearch
          ? ProductEnrichmentStatus.PENDING_RESEARCH
          : rest.enrichmentStatus,
        importedAt: importSource === ProductImportSource.BLING ? new Date() : undefined,
      },
      include: productInclude,
    });

    if (images) {
      await prisma.productImage.deleteMany({ where: { productId: params.id } });
      if (images.length > 0) {
        await prisma.productImage.createMany({
          data: images.map((img, i) => ({
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
      await prisma.productVariation.deleteMany({
        where: { productId: params.id, id: { notIn: incomingIds } },
      });

      if (variations.some((v) => v.isDefault)) {
        const defaultId = variations.find((v) => v.isDefault)?.id;
        if (defaultId) {
          await prisma.productVariation.updateMany({
            where: { productId: params.id, id: { not: defaultId } },
            data: { isDefault: false },
          });
        }
      }

      for (const v of variations) {
        if (v.id) {
          await prisma.productVariation.update({
            where: { id: v.id },
            data: {
              name: v.name, value: v.value,
              sku: v.sku || null, imageUrl: v.imageUrl || null,
              stock: v.stock, priceModifier: v.priceModifier,
              isDefault: v.isDefault, order: v.order, active: v.active,
            },
          });
        } else {
          await prisma.productVariation.create({
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

    const updated = await prisma.product.findUnique({ where: { id: params.id }, include: productInclude });
    return apiSuccess(updated);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro ao atualizar produto.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    await prisma.product.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Produto removido." });
  } catch {
    return apiError("Erro ao remover produto.", 500);
  }
}
