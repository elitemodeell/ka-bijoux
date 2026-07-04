import { NextRequest } from "next/server";
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
  { params }: { params: { id: string; variationId: string } }
) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const data = updateSchema.parse(body);

    if (data.isDefault === true) {
      await prisma.productVariation.updateMany({
        where: { productId: params.id, id: { not: params.variationId } },
        data: { isDefault: false },
      });
    }

    const variation = await prisma.productVariation.update({
      where: { id: params.variationId },
      data: {
        ...data,
        sku: data.sku ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
      },
    });

    return apiSuccess(variation);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro ao atualizar variação.", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; variationId: string } }
) {
  try {
    await requireAdmin(req);
    await prisma.productVariation.delete({ where: { id: params.variationId } });
    return apiSuccess({ message: "Variação removida." });
  } catch {
    return apiError("Erro ao remover variação.", 500);
  }
}
