import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError, paginate, slugify } from "@/lib/utils";

const productInclude = {
  category: true,
  images: { orderBy: { order: "asc" as const } },
  variations: { where: { active: true } },
};

// GET /api/products — Vitrine pública
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 20);
    const category = searchParams.get("category");
    const search = searchParams.get("q");
    const featured = searchParams.get("featured") === "true";
    const isNew = searchParams.get("new") === "true";
    const sort = searchParams.get("sort") ?? "createdAt";
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    const where: Record<string, unknown> = { active: true };
    if (category) where.category = { slug: category };
    if (featured) where.featured = true;
    if (isNew) where.isNew = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) (where.price as Record<string, unknown>).gte = parseFloat(minPrice);
      if (maxPrice) (where.price as Record<string, unknown>).lte = parseFloat(maxPrice);
    }

    const orderBy: Record<string, string> =
      sort === "price_asc" ? { price: "asc" }
      : sort === "price_desc" ? { price: "desc" }
      : sort === "best_sellers" ? { soldCount: "desc" }
      : { createdAt: "desc" };

    const { skip, take } = paginate(page, pageSize);

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, include: productInclude, orderBy, skip, take }),
      prisma.product.count({ where }),
    ]);

    return apiSuccess({
      products,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch {
    return apiError("Erro ao buscar produtos.", 500);
  }
}

// POST /api/products — Admin cria produto
const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  price: z.number().positive(),
  promotionalPrice: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0),
  minStock: z.number().int().min(0).default(5),
  weight: z.number().positive(),
  height: z.number().positive(),
  width: z.number().positive(),
  length: z.number().positive(),
  categoryId: z.string(),
  featured: z.boolean().default(false),
  isNew: z.boolean().default(true),
  active: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const data = createSchema.parse(body);

    const slug = slugify(data.name);
    const existing = await prisma.product.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    const product = await prisma.product.create({
      data: { ...data, slug: finalSlug },
      include: productInclude,
    });

    return apiSuccess(product, 201);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro ao criar produto.", 500);
  }
}
