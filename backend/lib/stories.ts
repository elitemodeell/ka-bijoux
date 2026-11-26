import type { Prisma } from "@prisma/client";
import { DEFAULT_STORY_COVER, type StoryGroup, type StoryItem } from "@/types/stories";

type PrismaStoryItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  mediaUrl: string;
  duration: number;
  text: string | null;
  buttonText: string | null;
  linkUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaStoryGroup = {
  id: string;
  title: string;
  category: "OFFICIAL" | "CUSTOMER" | "REVIEW" | "HIGHLIGHT";
  reviewId: string | null;
  review: { rating: number; comment: string | null; customer: { name: string }; product: { name: string } } | null;
  coverImageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  expiresAt: Date | null;
  customerConsentConfirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: PrismaStoryItem[];
};

export const storyGroupInclude = {
  items: {
    orderBy: { sortOrder: "asc" as const },
  },
};

// Seeded shortcut groups duplicate the six Home category buttons and use
// promotional placeholder media. Keep them editable in Admin, but do not show
// them as customer Stories until they are replaced by genuine published media.
export const HIDDEN_HOME_SHORTCUT_STORY_IDS = [
  "story-novidades",
  "story-promocoes",
  "story-lancamentos",
  "story-ofertas",
] as const;

export function normalizeStoryItemType(type: string): "IMAGE" | "VIDEO" {
  return type.toLowerCase() === "video" ? "VIDEO" : "IMAGE";
}

export function serializeStoryItem(item: PrismaStoryItem): StoryItem {
  const type = item.type === "VIDEO" ? "video" : "image";

  return {
    id: item.id,
    type,
    src: item.mediaUrl,
    mediaUrl: item.mediaUrl,
    duration: item.duration,
    text: item.text,
    buttonText: item.buttonText,
    link: item.linkUrl,
    linkUrl: item.linkUrl,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function serializeStoryGroup(group: PrismaStoryGroup): StoryGroup {
  const cover = group.coverImageUrl || DEFAULT_STORY_COVER;

  return {
    id: group.id,
    title: group.title,
    category: group.category,
    reviewId: group.reviewId,
    review: group.review ? {
      rating: group.review.rating,
      comment: group.review.comment,
      customerName: group.review.customer.name.trim().split(/\s+/)[0] ?? "Cliente",
      productName: group.review.product.name,
    } : null,
    cover,
    coverImageUrl: group.coverImageUrl,
    isActive: group.isActive,
    sortOrder: group.sortOrder,
    expiresAt: group.expiresAt?.toISOString() ?? null,
    customerConsentConfirmedAt: group.customerConsentConfirmedAt?.toISOString() ?? null,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    items: group.items.map(serializeStoryItem),
  };
}

export function publicStoryGroupWhere(now = new Date()): Prisma.StoryGroupWhereInput {
  return {
    AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      {
        OR: [
          { category: { notIn: ["CUSTOMER", "REVIEW"] } },
          { category: "CUSTOMER", customerConsentConfirmedAt: { not: null } },
          {
            category: "REVIEW",
            customerConsentConfirmedAt: { not: null },
            review: { is: { approved: true } },
          },
        ],
      },
    ],
  };
}
