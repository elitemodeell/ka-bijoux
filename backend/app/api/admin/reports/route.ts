export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { OrderStatus, PaymentStatus } from "@prisma/client";

// GET /api/admin/reports?period=6
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const months = Math.min(Number(url.searchParams.get("period") ?? "6"), 12);

    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - months);
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const [orders, topProducts, ordersByStatus, paymentMethods, topCustomers] =
      await Promise.all([
        // All non-cancelled orders in period
        prisma.order.findMany({
          where: { createdAt: { gte: periodStart }, status: { not: OrderStatus.CANCELADO } },
          select: { createdAt: true, total: true },
          orderBy: { createdAt: "asc" },
        }),

        // Top selling products
        prisma.orderItem.groupBy({
          by: ["productId"],
          where: { order: { createdAt: { gte: periodStart }, status: { not: OrderStatus.CANCELADO } } },
          _sum: { quantity: true, totalPrice: true },
          orderBy: { _sum: { totalPrice: "desc" } },
          take: 10,
        }),

        // Orders count by status
        prisma.order.groupBy({
          by: ["status"],
          where: { createdAt: { gte: periodStart } },
          _count: { id: true },
          _sum: { total: true },
        }),

        // Revenue by payment method
        prisma.payment.groupBy({
          by: ["method"],
          where: { status: PaymentStatus.PAGO, createdAt: { gte: periodStart } },
          _sum: { amount: true },
          _count: { id: true },
        }),

        // Top customers by spend
        prisma.order.groupBy({
          by: ["customerId"],
          where: { createdAt: { gte: periodStart }, status: { not: OrderStatus.CANCELADO } },
          _sum: { total: true },
          _count: { id: true },
          orderBy: { _sum: { total: "desc" } },
          take: 5,
        }),
      ]);

    // Build monthly revenue buckets
    const monthlyMap = new Map<string, { revenue: number; count: number }>();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { revenue: 0, count: 0 });
    }
    for (const o of orders) {
      const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthlyMap.get(key);
      if (bucket) {
        bucket.revenue += Number(o.total);
        bucket.count += 1;
      }
    }
    const monthlyRevenue = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));

    // Enrich top products with name
    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));
    const topProductsEnriched = topProducts.map((p) => ({
      productId: p.productId,
      name: productMap.get(p.productId) ?? "Produto removido",
      quantitySold: p._sum?.quantity ?? 0,
      revenue: Number(p._sum?.totalPrice ?? 0),
    }));

    // Enrich top customers with name/email
    const customerIds = topCustomers.map((c) => c.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, email: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const topCustomersEnriched = topCustomers.map((c) => ({
      customerId: c.customerId,
      name: customerMap.get(c.customerId)?.name ?? "Cliente removido",
      email: customerMap.get(c.customerId)?.email ?? "",
      orders: c._count.id,
      revenue: Number(c._sum.total ?? 0),
    }));

    return apiSuccess({
      period: { months, start: periodStart },
      monthlyRevenue,
      topProducts: topProductsEnriched,
      ordersByStatus: ordersByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
        revenue: Number(s._sum.total ?? 0),
      })),
      paymentMethods: paymentMethods.map((m) => ({
        method: m.method,
        count: m._count.id,
        revenue: Number(m._sum.amount ?? 0),
      })),
      topCustomers: topCustomersEnriched,
    });
  } catch (e) {
    console.error(e);
    return apiError("Erro ao gerar relatórios.", 500);
  }
}
