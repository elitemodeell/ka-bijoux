export const revalidate = 60;

import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { serializeStoryGroup } from "@/lib/stories";

export async function GET() {
  try {
    const groups = await prisma.storyGroup.findMany({
      where: {
        isActive: true,
        items: { some: { isActive: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        items: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    const response = apiSuccess(groups.map(serializeStoryGroup));
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch {
    return apiError("Erro ao buscar stories.", 500);
  }
}
