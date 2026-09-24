import {
  ContentClassification,
  DistributionChannel,
  PlayStoreStatus,
  PolicyReviewStatus,
  Prisma,
} from "@prisma/client";
import type { NextRequest } from "next/server";
import { toPublicOrder } from "@/lib/checkout/public-order";

export const GOOGLE_PLAY_ALLOWED_CLASSIFICATIONS = [
  ContentClassification.GENERAL,
  ContentClassification.LINGERIE_NEUTRAL,
] as const;

export const GOOGLE_PLAY_NEUTRAL_ITEM_NAME = "Item adquirido em outro canal";
export const GOOGLE_PLAY_BLOCKED_CATEGORY_SLUGS = ["sex-shop", "lingerie"] as const;

const INTERNAL_PLAY_POLICY_FIELDS = new Set([
  "distributionChannels",
  "playStoreStatus",
  "playStoreReviewedAt",
  "playStoreReviewedBy",
  "playStoreReviewNotes",
  "contentClassification",
  "policyReviewStatus",
  "policyReviewedAt",
  "policyReviewedBy",
  "policyReviewNotes",
]);

export function toGooglePlayPublicData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(toGooglePlayPublicData) as T;
  }
  if (!value || typeof value !== "object") return value;
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !INTERNAL_PLAY_POLICY_FIELDS.has(key))
      .map(([key, nested]) => [key, toGooglePlayPublicData(nested)])
  ) as T;
}

type PolicyRecord = {
  active?: boolean;
  isActive?: boolean;
  distributionChannels?: DistributionChannel[];
  playStoreStatus?: PlayStoreStatus;
  contentClassification?: ContentClassification;
  policyReviewStatus?: PolicyReviewStatus;
};

export function isGooglePlayMobilePath(pathname: string) {
  return pathname === "/api/mobile" || pathname.startsWith("/api/mobile/");
}

export function isGooglePlayMobileRequest(req: Pick<NextRequest, "nextUrl">) {
  return isGooglePlayMobilePath(req.nextUrl.pathname);
}

export function isGooglePlayEligibleRecord(record: PolicyRecord | null | undefined) {
  if (!record) return false;
  if (record.active === false || record.isActive === false) return false;
  return (
    record.distributionChannels?.includes(DistributionChannel.GOOGLE_PLAY) === true &&
    record.playStoreStatus === PlayStoreStatus.PLAY_ALLOWED
  );
}

export function googlePlayCategoryWhere(
  extra?: Prisma.CategoryWhereInput
): Prisma.CategoryWhereInput {
  const policy: Prisma.CategoryWhereInput = {
    active: true,
    slug: { notIn: [...GOOGLE_PLAY_BLOCKED_CATEGORY_SLUGS] },
    distributionChannels: { has: DistributionChannel.GOOGLE_PLAY },
    playStoreStatus: PlayStoreStatus.PLAY_ALLOWED,
  };
  return extra ? { AND: [policy, extra] } : policy;
}

export function googlePlayProductWhere(
  extra?: Prisma.ProductWhereInput
): Prisma.ProductWhereInput {
  const policy: Prisma.ProductWhereInput = {
    active: true,
    distributionChannels: { has: DistributionChannel.GOOGLE_PLAY },
    playStoreStatus: PlayStoreStatus.PLAY_ALLOWED,
    category: { is: googlePlayCategoryWhere() },
  };
  return extra ? { AND: [policy, extra] } : policy;
}

export function googlePlayCouponWhere(
  extra?: Prisma.CouponWhereInput
): Prisma.CouponWhereInput {
  const policy: Prisma.CouponWhereInput = {
    active: true,
    distributionChannels: { has: DistributionChannel.GOOGLE_PLAY },
    playStoreStatus: PlayStoreStatus.PLAY_ALLOWED,
  };
  return extra ? { AND: [policy, extra] } : policy;
}

export function googlePlayStoryGroupWhere(
  extra?: Prisma.StoryGroupWhereInput
): Prisma.StoryGroupWhereInput {
  const policy: Prisma.StoryGroupWhereInput = {
    isActive: true,
    distributionChannels: { has: DistributionChannel.GOOGLE_PLAY },
    playStoreStatus: PlayStoreStatus.PLAY_ALLOWED,
  };
  return extra ? { AND: [policy, extra] } : policy;
}

export function googlePlayStoryItemWhere(
  extra?: Prisma.StoryItemWhereInput
): Prisma.StoryItemWhereInput {
  const policy: Prisma.StoryItemWhereInput = {
    isActive: true,
    distributionChannels: { has: DistributionChannel.GOOGLE_PLAY },
    playStoreStatus: PlayStoreStatus.PLAY_ALLOWED,
  };
  return extra ? { AND: [policy, extra] } : policy;
}

export function googlePlayNotificationWhere(
  extra?: Prisma.NotificationWhereInput
): Prisma.NotificationWhereInput {
  const policy: Prisma.NotificationWhereInput = {
    distributionChannels: { has: DistributionChannel.GOOGLE_PLAY },
    playStoreStatus: PlayStoreStatus.PLAY_ALLOWED,
  };
  return extra ? { AND: [policy, extra] } : policy;
}

export function googlePlayReviewWhere(
  extra?: Prisma.ReviewWhereInput
): Prisma.ReviewWhereInput {
  const policy: Prisma.ReviewWhereInput = {
    approved: true,
    distributionChannels: { has: DistributionChannel.GOOGLE_PLAY },
    playStoreStatus: PlayStoreStatus.PLAY_ALLOWED,
    product: { is: googlePlayProductWhere() },
  };
  return extra ? { AND: [policy, extra] } : policy;
}

type OrderWithPolicyItems = {
  items?: Array<{
    id?: unknown;
    productId?: unknown;
    variationId?: unknown;
    productName?: unknown;
    productImage?: unknown;
    variationName?: unknown;
    quantity?: unknown;
    unitPrice?: unknown;
    totalPrice?: unknown;
    product?: PolicyRecord | null;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

export function toGooglePlayPublicOrder(order: OrderWithPolicyItems) {
  const safe = toPublicOrder(order) as OrderWithPolicyItems;
  const sourceItems = Array.isArray(order.items) ? order.items : [];
  const safeItems = Array.isArray(safe.items) ? safe.items : [];

  return {
    ...safe,
    items: safeItems.map((item, index) => {
      if (isGooglePlayEligibleRecord(sourceItems[index]?.product)) {
        const { product: _internalPolicyProduct, ...publicItem } = item;
        return toGooglePlayPublicData(publicItem);
      }
      return {
        id: item.id,
        productId: null,
        variationId: null,
        productName: GOOGLE_PLAY_NEUTRAL_ITEM_NAME,
        productImage: null,
        variationName: null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        externalChannelItem: true,
      };
    }),
  };
}

export function googlePlayReviewApprovalData(reviewer: string, notes: string) {
  return {
    distributionChannels: [
      DistributionChannel.WEB_FULL,
      DistributionChannel.GOOGLE_PLAY,
      DistributionChannel.ADMIN,
    ],
    playStoreStatus: PlayStoreStatus.PLAY_ALLOWED,
    playStoreReviewedAt: new Date(),
    playStoreReviewedBy: reviewer,
    playStoreReviewNotes: notes,
    policyReviewStatus: PolicyReviewStatus.APPROVED,
    policyReviewedAt: new Date(),
    policyReviewedBy: reviewer,
    policyReviewNotes: notes,
  };
}
