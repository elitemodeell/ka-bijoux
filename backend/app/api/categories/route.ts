import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError, slugify } from "@/lib/utils";

// GET /api/categories — Pública
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: { _count: { select: { products: { where: { active: true } } } } },
    });
    return apiSuccess(categories);
  } catch {
    return apiError("Erro ao buscar categorias.", 500);
  }
}

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  order: z.number().int().default(0),
  active: z.boolean().default(true),
});

// POST /api/categories — Admin
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const data = createSchema.parse(body);

    const slug = slugify(data.name);
    const category = await prisma.category.create({ data: { ...data, slug } });
    return apiSuccess(category, 201);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro ao criar categoria.", 500);
  }
}
