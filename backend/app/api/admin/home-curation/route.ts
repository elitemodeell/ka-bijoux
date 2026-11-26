import { NextRequest } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { getHomeCurationCandidates } from "@/lib/home-sections";
import { visibleCatalogPhotos } from "@/lib/catalog-photo";

const orderSchema = z.object({
  productIds: z.array(z.string().min(1)).max(30),
}).superRefine(({ productIds }, context) => {
  if (new Set(productIds).size !== productIds.length) {
    context.addIssue({ code: "custom", message: "Cada produto pode aparecer uma única vez na curadoria." });
  }
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const [candidates, ordered] = await Promise.all([
      getHomeCurationCandidates(true),
      prisma.product.findMany({
        where: { homeSortOrder: { not: null }, category: { slug: { not: "sex-shop" } } },
        orderBy: [{ homeSortOrder: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          sku: true,
          homeSortOrder: true,
          stock: true,
          active: true,
          category: { select: { name: true, slug: true } },
          images: { where: visibleCatalogPhotos, orderBy: { order: "asc" }, take: 1, select: { url: true } },
        },
        take: 100,
      }),
    ]);

    return apiSuccess({ candidates, ordered });
  } catch (error) {
    if (error instanceof Error && (error.message === "Não autorizado" || error.message === "Acesso não autorizado")) return apiError("Não autorizado.", 401);
    return apiError("Não foi possível carregar a curadoria da vitrine.", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
    const parsed = orderSchema.safeParse(await req.json());
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Ordem inválida.", 422);

    const { productIds } = parsed.data;
    const [candidates, currentlyOrdered] = await Promise.all([
      getHomeCurationCandidates(true),
      prisma.product.findMany({
        where: { homeSortOrder: { not: null }, category: { slug: { not: "sex-shop" } } },
        select: { id: true },
      }),
    ]);
    const allowedIds = new Set([...candidates.map(({ id }) => id), ...currentlyOrdered.map(({ id }) => id)]);
    if (productIds.some((id) => !allowedIds.has(id))) {
      return apiError("A curadoria aceita somente produtos disponíveis ou itens que já estavam ordenados e aguardam regularização.", 422);
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: { homeSortOrder: { not: null }, category: { slug: { not: "sex-shop" } } },
        data: { homeSortOrder: null },
      });
      for (const [index, id] of productIds.entries()) {
        await tx.product.update({ where: { id }, data: { homeSortOrder: index + 1 } });
      }
    }, { isolationLevel: "Serializable" });

    revalidateTag("ka-home-sections", { expire: 0 });
    return apiSuccess({ saved: productIds.length });
  } catch (error) {
    if (error instanceof Error && (error.message === "Não autorizado" || error.message === "Acesso não autorizado")) return apiError("Não autorizado.", 401);
    return apiError("Não foi possível salvar a ordem da vitrine.", 500);
  }
}
