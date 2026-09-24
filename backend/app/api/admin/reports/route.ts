export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// GET /api/admin/reports?period=6
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const requestedMonths = Number(url.searchParams.get("period") ?? "6");
    const months = Number.isFinite(requestedMonths)
      ? Math.min(Math.max(Math.trunc(requestedMonths), 1), 12)
      : 6;
    const reportNow = new Date();
    const periodStart = new Date(
      reportNow.getFullYear(),
      reportNow.getMonth() - (months - 1),
      1
    );
    periodStart.setHours(0, 0, 0, 0);

    const [payments, topProducts, ordersByStatus, paymentMethods, topCustomers] =
      await Promise.all([
        // Settled payments in the period; paidAt is the financial event date.
        prisma.payment.findMany({
          where: {
            status: PaymentStatus.PAGO,
            paidAt: { gte: periodStart },
          },
          select: { paidAt: true, amount: true },
          orderBy: { paidAt: "asc" },
        }),

        // Top products from orders whose payment remains settled.
        prisma.orderItem.groupBy({
          by: ["productId"],
          where: {
            order: {
              payment: {
                is: {
                  status: PaymentStatus.PAGO,
                  paidAt: { gte: periodStart },
                },
              },
            },
          },
          _sum: { quantity: true, totalPrice: true },
          orderBy: { _sum: { totalPrice: "desc" } },
          take: 10,
        }),

        // Order statuses only for financially settled orders in the period.
        prisma.order.groupBy({
          by: ["status"],
          where: {
            payment: {
              is: {
                status: PaymentStatus.PAGO,
                paidAt: { gte: periodStart },
              },
            },
          },
          _count: { id: true },
          _sum: { total: true },
        }),

        // Revenue by payment method, dated by settlement.
        prisma.payment.groupBy({
          by: ["method"],
          where: {
            status: PaymentStatus.PAGO,
            paidAt: { gte: periodStart },
          },
          _sum: { amount: true },
          _count: { id: true },
        }),

        // Top customers by settled order value.
        prisma.order.groupBy({
          by: ["customerId"],
          where: {
            payment: {
              is: {
                status: PaymentStatus.PAGO,
                paidAt: { gte: periodStart },
              },
            },
          },
          _sum: { total: true },
          _count: { id: true },
          orderBy: { _sum: { total: "desc" } },
          take: 5,
        }),
      ]);

    const monthlyMap = new Map<string, { revenue: number; count: number }>();
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(
        reportNow.getFullYear(),
        reportNow.getMonth() - i,
        1
      );
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { revenue: 0, count: 0 });
    }
    for (const payment of payments) {
      if (!payment.paidAt) continue;
      const key = `${payment.paidAt.getFullYear()}-${String(
        payment.paidAt.getMonth() + 1
      ).padStart(2, "0")}`;
      const bucket = monthlyMap.get(key);
      if (bucket) {
        bucket.revenue += Number(payment.amount);
        bucket.count += 1;
      }
    }
    const monthlyRevenue = Array.from(monthlyMap.entries()).map(
      ([month, data]) => ({ month, ...data })
    );

    const productIds = topProducts.map((product) => product.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((product) => [product.id, product.name]));
    const topProductsEnriched = topProducts.map((product) => ({
      productId: product.productId,
      name: productMap.get(product.productId) ?? "Produto removido",
      quantitySold: product._sum?.quantity ?? 0,
      revenue: Number(product._sum?.totalPrice ?? 0),
    }));

    const customerIds = topCustomers.map((customer) => customer.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, email: true },
    });
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
    const topCustomersEnriched = topCustomers.map((customer) => ({
      customerId: customer.customerId,
      name: customerMap.get(customer.customerId)?.name ?? "Cliente removido",
      email: customerMap.get(customer.customerId)?.email ?? "",
      orders: customer._count.id,
      revenue: Number(customer._sum.total ?? 0),
    }));

    const totalRevenue = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );
    const totalOrders = payments.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return apiSuccess({
      period: { months, start: periodStart },
      monthlyRevenue,
      topProducts: topProductsEnriched,
      ordersByStatus: ordersByStatus.map((status) => ({
        status: status.status,
        count: status._count.id,
        revenue: Number(status._sum.total ?? 0),
      })),
      paymentMethods: paymentMethods.map((method) => ({
        method: method.method,
        count: method._count.id,
        revenue: Number(method._sum.amount ?? 0),
      })),
      topCustomers: topCustomersEnriched,
      totalRevenue,
      totalOrders,
      avgTicket,
    });
  } catch (error) {
    console.error(error);
    return apiError("Erro ao gerar relatórios.", 500);
  }
}