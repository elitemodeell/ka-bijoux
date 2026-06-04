import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

const productInclude = {
  category: true,
  subcategory: true,
  images: { orderBy: { order: "asc" as const } },
  variations: { where: { active: true } },
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }], active: true },
      include: productInclude,
    });

    if (!product) return apiError("Produto nao encontrado.", 404);

    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, active: true, id: { not: product.id } },
      include: { images: { orderBy: { order: "asc" }, take: 1 }, category: true, subcategory: true },
      take: 6,
    });

    return apiSuccess({ product, related });
  } catch {
    return apiError("Erro ao buscar produto.", 500);
  }
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(3).optional(),
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
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const data = updateSchema.parse(body);

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
      include: productInclude,
    });

    return apiSuccess(product);
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
