export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCustomerFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// GET /api/products/[id]/reviews — avaliações aprovadas do produto
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: params.id, approved: true },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const total = reviews.length;
    const avgRating =
      total > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / total
        : 0;

    return apiSuccess({ reviews, total, avgRating: Math.round(avgRating * 10) / 10 });
  } catch {
    return apiError("Erro ao buscar avaliações.", 500);
  }
}

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// POST /api/products/[id]/reviews — criar/atualizar avaliação (autenticado)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await getCustomerFromRequest(req);
    if (!customer) return apiError("Faça login para avaliar.", 401);

    // Verifica se o cliente comprou o produto
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId: params.id,
        order: {
          customerId: customer.id,
          status: { in: ["ENTREGUE", "PRONTO_PARA_RETIRADA"] },
        },
      },
    });

    if (!hasPurchased) {
      return apiError("Você só pode avaliar produtos que já comprou.", 403);
    }

    const body = await req.json();
    const { rating, comment } = createSchema.parse(body);

    const review = await prisma.review.upsert({
      where: { customerId_productId: { customerId: customer.id, productId: params.id } },
      create: { customerId: customer.id, productId: params.id, rating, comment, approved: false },
      update: { rating, comment, approved: false, updatedAt: new Date() },
      include: { customer: { select: { name: true } } },
    });

    return apiSuccess(review, 201);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro ao salvar avaliação.", 500);
  }
}
