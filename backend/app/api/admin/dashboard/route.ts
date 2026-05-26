export const dynamic = 'force-dynamic';
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";

// GET /api/admin/dashboard
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalOrders,
      pendingOrders,
      totalProducts,
      lowStockProducts,
      totalCustomers,
      todayOrders,
      monthOrders,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.CRIADO,
              OrderStatus.AGUARDANDO_PAGAMENTO,
              OrderStatus.PAGAMENTO_APROVADO,
              OrderStatus.EM_SEPARACAO,
            ],
          },
        },
      }),
      prisma.product.count({ where: { active: true } }),
      prisma.product.count({
        where: { active: true, stock: { lte: prisma.product.fields.minStock } },
      }).catch(() =>
        // fallback: estoque < 5
        prisma.product.count({ where: { active: true, stock: { lte: 5 } } })
      ),
      prisma.customer.count({ where: { active: true } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: { not: OrderStatus.CANCELADO } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: monthStart }, status: { not: OrderStatus.CANCELADO } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          customer: { select: { id: true, name: true } },
          payment: true,
        },
      }),
    ]);

    const totalRevenue = Number(monthOrders._sum.total ?? 0);
    const todayRevenue = Number(todayOrders._sum.total ?? 0);

    return apiSuccess({
      totalRevenue,
      totalOrders,
      pendingOrders,
      totalProducts,
      lowStockProducts,
      totalCustomers,
      todayRevenue,
      monthRevenue: totalRevenue,
      todayOrders: todayOrders._count,
      monthOrders: monthOrders._count,
      recentOrders,
    });
  } catch (e) {
    console.error(e);
    return apiError("Erro ao carregar dashboard.", 500);
  }
}
