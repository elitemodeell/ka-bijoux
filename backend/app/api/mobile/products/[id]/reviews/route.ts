import { NextRequest } from "next/server";
import { z } from "zod";
import { getCustomerFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  googlePlayProductWhere,
  googlePlayReviewWhere,
  toGooglePlayPublicData,
} from "@/lib/google-play-distribution";
import { apiError, apiSuccess } from "@/lib/utils";

const createSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
  })
  .strict();

async function findProduct(id: string) {
  return prisma.product.findFirst({
    where: googlePlayProductWhere({ OR: [{ id }, { slug: id }] }),
    select: { id: true },
  });
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const product = await findProduct(params.id);
    if (!product) return apiError("Produto não encontrado.", 404);
    const reviews = await prisma.review.findMany({
      where: googlePlayReviewWhere({ productId: product.id }),
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const total = reviews.length;
    const avgRating = total
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / total
      : 0;
    return apiSuccess(toGooglePlayPublicData({
      reviews,
      total,
      avgRating: Math.round(avgRating * 10) / 10,
    }));
  } catch {
    return apiError("Erro ao buscar avaliações.", 500);
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const customer = await getCustomerFromRequest(req);
    if (!customer) return apiError("Faça login para avaliar.", 401);
    const product = await findProduct(params.id);
    if (!product) return apiError("Produto não encontrado.", 404);
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId: product.id,
        order: {
          customerId: customer.id,
          status: { in: ["ENTREGUE", "PRONTO_PARA_RETIRADA"] },
        },
      },
      select: { id: true },
    });
    if (!hasPurchased) {
      return apiError("Você só pode avaliar produtos que já comprou.", 403);
    }
    const input = createSchema.parse(await req.json());
    const review = await prisma.review.upsert({
      where: {
        customerId_productId: {
          customerId: customer.id,
          productId: product.id,
        },
      },
      create: {
        customerId: customer.id,
        productId: product.id,
        rating: input.rating,
        comment: input.comment,
        approved: false,
      },
      update: {
        rating: input.rating,
        comment: input.comment,
        approved: false,
        playStoreStatus: "PLAY_REVIEW_REQUIRED",
        playStoreReviewedAt: null,
        playStoreReviewedBy: null,
        playStoreReviewNotes: null,
        distributionChannels: ["WEB_FULL", "ADMIN"],
        contentClassification: "UNCLASSIFIED",
        policyReviewStatus: "UNCLASSIFIED",
        policyReviewedAt: null,
        policyReviewedBy: null,
        policyReviewNotes: null,
      },
    });
    return apiSuccess(toGooglePlayPublicData(review), 201);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    return apiError("Erro ao salvar avaliação.", 500);
  }
}
