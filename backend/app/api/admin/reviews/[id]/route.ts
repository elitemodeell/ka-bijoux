export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// PATCH /api/admin/reviews/[id] — aprovar ou rejeitar avaliação
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);
    const { approved } = await req.json() as { approved: boolean };

    if (typeof approved !== "boolean") return apiError("Campo approved obrigatório.", 400);

    if (!approved) {
      await prisma.review.delete({ where: { id: params.id } });
      return apiSuccess({ message: "Avaliação rejeitada e removida." });
    }

    const review = await prisma.review.update({
      where: { id: params.id },
      data: { approved: true },
    });

    return apiSuccess(review);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao moderar avaliação.", 500);
  }
}
