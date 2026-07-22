import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { buildProductIdentityFilters } from "@/lib/product-identity";

// GET /api/customers/me/favorites
export async function GET(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);

    const favorites = await prisma.favorite.findMany({
      where: { customerId: customer.id },
      include: {
        product: {
          include: { images: { orderBy: { order: "asc" }, take: 1 } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = favorites.map((f) => ({
      favoriteId: f.id,
      ...f.product,
      price: Number(f.product.price),
      promotionalPrice: f.product.promotionalPrice ? Number(f.product.promotionalPrice) : null,
    }));

    return apiSuccess(data);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado")
      return apiError("Não autorizado.", 401);
    return apiError("Erro ao buscar favoritos.", 500);
  }
}

// POST /api/customers/me/favorites
export async function POST(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const { productId } = await req.json();
    if (!productId) return apiError("productId é obrigatório.");

    const productFilters = buildProductIdentityFilters(productId);
    const product = await prisma.product.findFirst({
      where: { active: true, OR: productFilters },
    });
    if (!product) return apiError("Produto não encontrado.", 404);

    const existing = await prisma.favorite.findUnique({
      where: { customerId_productId: { customerId: customer.id, productId: product.id } },
    });
    if (existing) return apiSuccess({ id: existing.id, alreadyFavorited: true });

    const favorite = await prisma.favorite.create({
      data: { customerId: customer.id, productId: product.id },
    });

    return apiSuccess({ id: favorite.id }, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado")
      return apiError("Não autorizado.", 401);
    return apiError("Erro ao adicionar favorito.", 500);
  }
}
