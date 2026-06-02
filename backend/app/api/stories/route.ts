export const dynamic = "force-dynamic";

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

    return apiSuccess(groups.map(serializeStoryGroup));
  } catch {
    return apiError("Erro ao buscar stories.", 500);
  }
}
