import { NextRequest } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProductIdentityFilters } from "@/lib/product-identity";
import { googlePlayProductWhere, toGooglePlayPublicData } from "@/lib/google-play-distribution";
import { apiError, apiSuccess } from "@/lib/utils";

const createSchema = z.object({ productId: z.string().min(1).max(200) }).strict();

export async function GET(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const favorites = await prisma.favorite.findMany({
      where: {
        customerId: customer.id,
        product: { is: googlePlayProductWhere() },
      },
      include: {
        product: {
          include: { images: { orderBy: { order: "asc" }, take: 1 } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(
      toGooglePlayPublicData(favorites.map((favorite) => ({
        favoriteId: favorite.id,
        ...favorite.product,
        price: Number(favorite.product.price),
        promotionalPrice: favorite.product.promotionalPrice
          ? Number(favorite.product.promotionalPrice)
          : null,
      })))
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    return apiError("Erro ao buscar favoritos.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const input = createSchema.parse(await req.json());
    const product = await prisma.product.findFirst({
      where: googlePlayProductWhere({
        OR: buildProductIdentityFilters(input.productId),
      }),
      select: { id: true },
    });
    if (!product) return apiError("Produto não encontrado.", 404);

    const favorite = await prisma.favorite.upsert({
      where: {
        customerId_productId: {
          customerId: customer.id,
          productId: product.id,
        },
      },
      create: { customerId: customer.id, productId: product.id },
      update: {},
      select: { id: true },
    });
    return apiSuccess({ id: favorite.id }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    return apiError("Erro ao adicionar favorito.", 500);
  }
}
