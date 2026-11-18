import { NextRequest } from "next/server";
import { belongsToCatalogGallery } from "@/lib/catalog-photo";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
  sku: z.string().trim().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  stock: z.number().int().min(0).optional(),
  priceModifier: z.number().optional(),
  isDefault: z.boolean().optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string; variationId: string }> }
) {
  const params = await props.params;
  try {
    await requireAdmin(req);
    const body = await req.json();
    const data = updateSchema.parse(body);
    if (data.imageUrl && !belongsToCatalogGallery(data.imageUrl, params.id, params.variationId)) {
      return apiError("A foto está vinculada a outro produto ou variação.", 422);
    }

    const variation = await prisma.$transaction(async (tx) => {
      const updated = await tx.productVariation.update({
        where: { id: params.variationId, productId: params.id },
        data,
      });
      if (data.isDefault === true) {
        await tx.productVariation.updateMany({
          where: { productId: params.id, id: { not: params.variationId } },
          data: { isDefault: false },
        });
      }
      return updated;
    });

    return apiSuccess(variation);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.issues[0].message, 422);
    return apiError("Erro ao atualizar variação.", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string; variationId: string }> }
) {
  const params = await props.params;
  try {
    await requireAdmin(req);
    await prisma.productVariation.update({
      where: { id: params.variationId, productId: params.id },
      data: { active: false, isDefault: false },
    });
    return apiSuccess({ message: "Variação removida." });
  } catch {
    return apiError("Erro ao remover variação.", 500);
  }
}
