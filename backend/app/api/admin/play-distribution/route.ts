import { NextRequest } from "next/server";
import {
  ContentClassification,
  DistributionChannel,
  PlayStoreStatus,
  PolicyReviewStatus,
} from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

const entitySchema = z.enum([
  "PRODUCT",
  "CATEGORY",
  "STORY_GROUP",
  "STORY_ITEM",
  "COUPON",
  "NOTIFICATION",
  "REVIEW",
]);

const updateSchema = z
  .object({
    entity: entitySchema,
    id: z.string().min(1),
    action: z.enum(["APPROVE", "BLOCK", "REVIEW_REQUIRED"]),
    classification: z.nativeEnum(ContentClassification),
    notes: z.string().trim().min(10).max(2000),
    confirmation: z.string().optional(),
  })
  .strict();

const policySelect = {
  id: true,
  distributionChannels: true,
  playStoreStatus: true,
  playStoreReviewedAt: true,
  playStoreReviewedBy: true,
  playStoreReviewNotes: true,
  contentClassification: true,
  policyReviewStatus: true,
  policyReviewedAt: true,
  policyReviewedBy: true,
  policyReviewNotes: true,
} as const;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const [products, categories, storyGroups, storyItems] = await Promise.all([
      prisma.product.findMany({
        select: {
          ...policySelect,
          name: true,
          slug: true,
          category: { select: { name: true, slug: true } },
        },
        orderBy: [{ playStoreStatus: "asc" }, { name: "asc" }],
        take: 500,
      }),
      prisma.category.findMany({
        select: { ...policySelect, name: true, slug: true },
        orderBy: [{ playStoreStatus: "asc" }, { name: "asc" }],
      }),
      prisma.storyGroup.findMany({
        select: { ...policySelect, title: true, coverImageUrl: true },
        orderBy: [{ playStoreStatus: "asc" }, { title: "asc" }],
      }),
      prisma.storyItem.findMany({
        select: {
          ...policySelect,
          type: true,
          mediaUrl: true,
          text: true,
          storyGroup: { select: { title: true } },
        },
        orderBy: [{ playStoreStatus: "asc" }, { createdAt: "desc" }],
      }),
    ]);
    return apiSuccess({ products, categories, storyGroups, storyItems });
  } catch (error) {
    if (error instanceof Error && error.message.includes("autorizado")) {
      return apiError("Não autorizado.", 401);
    }
    return apiError("Erro ao carregar revisão de distribuição.", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const input = updateSchema.parse(await req.json());
    const isAllowedClassification =
      input.classification === ContentClassification.GENERAL ||
      input.classification === ContentClassification.LINGERIE_NEUTRAL;

    if (input.action === "APPROVE") {
      if (input.confirmation !== "HABILITAR_GOOGLE_PLAY") {
        return apiError("Confirmação explícita obrigatória.", 422);
      }
      if (!isAllowedClassification) {
        return apiError("Classificação não permitida no canal Google Play.", 422);
      }
    }

    const common = {
      playStoreStatus:
        input.action === "APPROVE"
          ? PlayStoreStatus.PLAY_ALLOWED
          : input.action === "BLOCK"
            ? PlayStoreStatus.PLAY_BLOCKED
            : PlayStoreStatus.PLAY_REVIEW_REQUIRED,
      playStoreReviewedAt: new Date(),
      playStoreReviewedBy: admin.id,
      playStoreReviewNotes: input.notes,
      contentClassification: input.classification,
      policyReviewStatus:
        input.action === "APPROVE"
          ? PolicyReviewStatus.APPROVED
          : input.action === "BLOCK"
            ? PolicyReviewStatus.BLOCKED
            : PolicyReviewStatus.REVIEW_REQUIRED,
      distributionChannels:
        input.action === "APPROVE"
          ? [
              DistributionChannel.WEB_FULL,
              DistributionChannel.GOOGLE_PLAY,
              DistributionChannel.ADMIN,
            ]
          : [DistributionChannel.WEB_FULL, DistributionChannel.ADMIN],
      policyReviewedAt: new Date(),
      policyReviewedBy: admin.id,
      policyReviewNotes: input.notes,
    };

    switch (input.entity) {
      case "PRODUCT":
        await prisma.product.update({ where: { id: input.id }, data: common });
        break;
      case "CATEGORY":
        await prisma.category.update({ where: { id: input.id }, data: common });
        break;
      case "STORY_GROUP":
        await prisma.storyGroup.update({ where: { id: input.id }, data: common });
        break;
      case "STORY_ITEM":
        await prisma.storyItem.update({ where: { id: input.id }, data: common });
        break;
      case "COUPON":
        await prisma.coupon.update({ where: { id: input.id }, data: common });
        break;
      case "NOTIFICATION":
        await prisma.notification.update({ where: { id: input.id }, data: common });
        break;
      case "REVIEW":
        await prisma.review.update({ where: { id: input.id }, data: common });
        break;
    }

    return apiSuccess({ updated: true });
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    if (error instanceof Error && error.message.includes("autorizado")) {
      return apiError("Não autorizado.", 401);
    }
    return apiError("Erro ao atualizar distribuição.", 500);
  }
}
