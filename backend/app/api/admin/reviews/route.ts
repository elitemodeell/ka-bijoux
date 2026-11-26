export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// GET /api/admin/reviews — lista avaliações pendentes
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const pending = url.searchParams.get("pending") !== "false";

    const reviews = await prisma.review.findMany({
      where: pending ? { approved: false, policyReviewStatus: { not: "BLOCKED" } } : { approved: true },
      include: {
        customer: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const [customerIds, productIds] = [
      [...new Set(reviews.map((review) => review.customerId))],
      [...new Set(reviews.map((review) => review.productId))],
    ];
    const verifiedOrders = reviews.length ? await prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: {
          customerId: { in: customerIds },
          status: { in: ["ENTREGUE", "PRONTO_PARA_RETIRADA"] },
        },
      },
      select: { productId: true, order: { select: { customerId: true } } },
    }) : [];
    const verifiedPairs = new Set(verifiedOrders.map((item) => `${item.order.customerId}:${item.productId}`));

    return apiSuccess(reviews.map((review) => ({
      ...review,
      verifiedPurchase: verifiedPairs.has(`${review.customerId}:${review.productId}`),
    })));
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao buscar avaliações.", 500);
  }
}
