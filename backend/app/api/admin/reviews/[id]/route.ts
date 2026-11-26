export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// PATCH /api/admin/reviews/[id] — aprovar ou rejeitar avaliação
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const admin = await requireAdmin(req);
    const { approved } = await req.json() as { approved: boolean };

    if (typeof approved !== "boolean") return apiError("Campo approved obrigatório.", 400);

    if (approved) {
      const candidate = await prisma.review.findUnique({
        where: { id: params.id },
        select: { id: true, customerId: true, productId: true },
      });
      if (!candidate) return apiError("Avaliação não encontrada.", 404);
      const verifiedPurchase = await prisma.orderItem.findFirst({
        where: {
          productId: candidate.productId,
          order: {
            customerId: candidate.customerId,
            status: { in: ["ENTREGUE", "PRONTO_PARA_RETIRADA"] },
          },
        },
        select: { id: true },
      });
      if (!verifiedPurchase) return apiError("A avaliação não possui uma compra confirmada.", 422);
    }

    const review = await prisma.review.update({
      where: { id: params.id },
      data: {
        approved,
        policyReviewStatus: approved ? "APPROVED" : "BLOCKED",
        policyReviewedAt: new Date(),
        policyReviewedBy: admin.id,
        policyReviewNotes: approved ? "Aprovada pela moderação administrativa." : "Ocultada pela moderação administrativa; registro preservado.",
        distributionChannels: approved ? ["WEB_FULL", "ADMIN"] : ["ADMIN"],
      },
    });

    return apiSuccess(review);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao moderar avaliação.", 500);
  }
}
