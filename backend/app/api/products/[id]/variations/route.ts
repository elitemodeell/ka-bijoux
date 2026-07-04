import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

const variationSchema = z.object({
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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const variations = await prisma.productVariation.findMany({
      where: { productId: params.id },
      orderBy: { order: "asc" },
    });
    return apiSuccess(variations);
  } catch {
    return apiError("Erro ao buscar variações.", 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const data = variationSchema.parse(body);

    if (data.isDefault) {
      await prisma.productVariation.updateMany({
        where: { productId: params.id },
        data: { isDefault: false },
      });
    }

    const variation = await prisma.productVariation.create({
      data: {
        productId: params.id,
        name: data.name,
        value: data.value,
        sku: data.sku || null,
        imageUrl: data.imageUrl || null,
        stock: data.stock,
        priceModifier: data.priceModifier,
        isDefault: data.isDefault,
        order: data.order,
        active: data.active,
      },
    });

    return apiSuccess(variation, 201);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro ao criar variação.", 500);
  }
}
