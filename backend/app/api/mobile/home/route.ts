import { prisma } from "@/lib/prisma";
import {
  googlePlayCategoryWhere,
  googlePlayProductWhere,
  googlePlayReviewWhere,
  googlePlayStoryGroupWhere,
  googlePlayStoryItemWhere,
  toGooglePlayPublicData,
} from "@/lib/google-play-distribution";
import {
  HOME_BENEFITS,
  HOME_FINAL_CTA,
  HOME_QUICK_CATEGORIES,
  HOME_SECTION_DEFINITIONS,
  pickHomeBadge,
  getHomePresentation,
} from "@/lib/home-content";
import { getHomeSections } from "@/lib/home-sections";
import { HIDDEN_HOME_SHORTCUT_STORY_IDS, serializeStoryGroup } from "@/lib/stories";
import { apiError, apiSuccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const itemPolicy = googlePlayStoryItemWhere();
    const [sections, categories, categoryCounts, stories, reviews] = await Promise.all([
      getHomeSections({ googlePlay: true }),
      prisma.category.findMany({
        where: googlePlayCategoryWhere({ parentId: null }),
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true, description: true, imageUrl: true },
      }),
      prisma.product.groupBy({
        by: ["categoryId"],
        where: googlePlayProductWhere({ images: { some: {} } }),
        _count: { _all: true },
      }),
      prisma.storyGroup.findMany({
        where: googlePlayStoryGroupWhere({
          id: { notIn: [...HIDDEN_HOME_SHORTCUT_STORY_IDS] },
          items: { some: itemPolicy },
        }),
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        include: {
          items: {
            where: itemPolicy,
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      }),
      prisma.review.findMany({
        where: googlePlayReviewWhere({ comment: { not: null } }),
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          customer: {
            select: {
              name: true,
              addresses: {
                take: 1,
                orderBy: { isDefault: "desc" },
                select: { city: true, state: true },
              },
            },
          },
        },
      }),
    ]);

    const counts = new Map(categoryCounts.map((entry) => [entry.categoryId, entry._count._all]));
    const presentation = getHomePresentation();
    const productSections = HOME_SECTION_DEFINITIONS.map((definition) => ({
      id: definition.id,
      label: definition.label,
      title: definition.title,
      subtitle: definition.subtitle,
      route: definition.route,
      moreLabel: definition.moreLabel,
      badgeSeal: definition.badgeSeal === true,
      background: definition.background,
      products: sections[definition.key].map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        promotionalPrice: product.promotionalPrice,
        stock: product.stock,
        images: product.images,
        variations: product.variations,
        badge: pickHomeBadge(product.id, definition.badges),
      })),
    }));

    const payload = {
      schemaVersion: 2,
      generatedAt: new Date().toISOString(),
      theme: { name: presentation.theme, seasonalDecoration: presentation.seasonalDecoration },
      announcements: presentation.announcements,
      banners: presentation.banners,
      campaign: presentation.campaign,
      quickCategories: HOME_QUICK_CATEGORIES.filter((category) => category.playAllowed),
      categories: categories
        .map((category) => ({ ...category, mobileProductCount: counts.get(category.id) ?? 0 }))
        .filter((category) => category.mobileProductCount > 0),
      stories: stories.map(serializeStoryGroup),
      sections: productSections,
      benefits: HOME_BENEFITS,
      finalCta: HOME_FINAL_CTA,
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        customerName: review.customer.name,
        city: review.customer.addresses[0]?.city ?? null,
        state: review.customer.addresses[0]?.state ?? null,
        createdAt: review.createdAt.toISOString(),
      })),
    };

    const response = apiSuccess(toGooglePlayPublicData(payload));
    response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return response;
  } catch (error) {
    console.error("[mobile-home] Failed to load Google Play home", error);
    return apiError("Erro ao carregar a home.", 500);
  }
}
