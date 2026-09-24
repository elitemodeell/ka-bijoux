import { prisma } from "@/lib/prisma";
import {
  googlePlayStoryGroupWhere,
  googlePlayStoryItemWhere,
  toGooglePlayPublicData,
} from "@/lib/google-play-distribution";
import { serializeStoryGroup } from "@/lib/stories";
import { apiError, apiSuccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const itemPolicy = googlePlayStoryItemWhere();
    const groups = await prisma.storyGroup.findMany({
      where: googlePlayStoryGroupWhere({ items: { some: itemPolicy } }),
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        items: {
          where: itemPolicy,
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    const response = apiSuccess(toGooglePlayPublicData(groups.map(serializeStoryGroup)));
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch {
    return apiError("Erro ao buscar stories.", 500);
  }
}
