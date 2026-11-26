export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { serializeStoryGroup } from "@/lib/stories";
import { apiError, apiSuccess } from "@/lib/utils";

const updateStorySchema = z.object({
  title: z.string().trim().min(2, "Informe o título do story.").optional(),
  category: z.enum(["OFFICIAL", "CUSTOMER", "REVIEW", "HIGHLIGHT"]).optional(),
  reviewId: z.string().trim().nullable().optional(),
  coverImageUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value === "" ? null : value)),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  customerConsentConfirmed: z.boolean().optional(),
});

function authError(error: unknown) {
  if (error instanceof Error && error.message.toLowerCase().includes("autorizado")) {
    return apiError("Acesso não autorizado.", 401);
  }
  return apiError("Erro ao processar story.", 500);
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireAdmin(req);

    const story = await prisma.storyGroup.findUnique({
      where: { id: params.id },
      include: {
        review: { select: { rating: true, comment: true, customer: { select: { name: true } }, product: { select: { name: true } } } },
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!story) return apiError("Story não encontrado.", 404);
    return apiSuccess(serializeStoryGroup(story));
  } catch (error) {
    return authError(error);
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const admin = await requireAdmin(req);

    const input = updateStorySchema.parse(await req.json());
    const current = await prisma.storyGroup.findUnique({
      where: { id: params.id },
      select: { category: true, reviewId: true, isActive: true, customerConsentConfirmedAt: true, customerConsentConfirmedBy: true },
    });
    if (!current) return apiError("Story não encontrado.", 404);
    const nextCategory = input.category ?? current.category;
    const nextReviewId = input.reviewId !== undefined ? input.reviewId : current.reviewId;
    const consentRevoked = input.customerConsentConfirmed === false;
    const nextIsActive = (input.isActive ?? current.isActive) && !consentRevoked;
    const consentConfirmed = input.customerConsentConfirmed === true
      ? new Date()
      : input.customerConsentConfirmed === false
        ? null
        : current.customerConsentConfirmedAt;
    if (nextCategory === "REVIEW" && nextIsActive) {
      if (!nextReviewId || !consentConfirmed) return apiError("Vincule uma avaliação aprovada e confirme a autorização do cliente.", 422);
      const approvedReview = await prisma.review.findFirst({
        where: { id: nextReviewId, approved: true },
        select: { id: true, customerId: true, productId: true },
      });
      if (!approvedReview) return apiError("A avaliação vinculada não está aprovada.", 422);
      const verifiedPurchase = await prisma.orderItem.findFirst({
        where: {
          productId: approvedReview.productId,
          order: {
            customerId: approvedReview.customerId,
            status: { in: ["ENTREGUE", "PRONTO_PARA_RETIRADA"] },
          },
        },
        select: { id: true },
      });
      if (!verifiedPurchase) return apiError("A avaliação não possui uma compra confirmada.", 422);
    }
    const data = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      category: nextCategory,
      reviewId: nextCategory === "REVIEW" ? nextReviewId : null,
      isActive: nextIsActive && (!["CUSTOMER", "REVIEW"].includes(nextCategory) || Boolean(consentConfirmed)),
      ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } : {}),
      customerConsentConfirmedAt: ["CUSTOMER", "REVIEW"].includes(nextCategory) ? consentConfirmed : null,
      customerConsentConfirmedBy: ["CUSTOMER", "REVIEW"].includes(nextCategory)
        ? input.customerConsentConfirmed === true
          ? admin.id
          : input.customerConsentConfirmed === false
            ? null
            : current.customerConsentConfirmedBy
        : null,
    };
    const story = await prisma.storyGroup.update({
      where: { id: params.id },
      data,
      include: {
        review: { select: { rating: true, comment: true, customer: { select: { name: true } }, product: { select: { name: true } } } },
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return apiSuccess(serializeStoryGroup(story));
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.issues[0].message, 422);
    return authError(error);
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireAdmin(req);
    await prisma.storyGroup.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Story excluído." });
  } catch (error) {
    return authError(error);
  }
}
