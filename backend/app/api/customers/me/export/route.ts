export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiError } from "@/lib/utils";

// GET /api/customers/me/export — exporta todos os dados do cliente (LGPD Art. 18)
export async function GET(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);

    const [profile, addresses, orders, favorites, notifications, consentLogs] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: customer.id },
        select: { id: true, name: true, email: true, phone: true, cpf: true, createdAt: true },
      }),
      prisma.address.findMany({
        where: { customerId: customer.id },
        select: { label: true, street: true, number: true, complement: true, neighborhood: true, city: true, state: true, zipCode: true, isDefault: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: { customerId: customer.id },
        select: {
          orderNumber: true, status: true, total: true, shippingType: true,
          createdAt: true,
          items: { select: { productName: true, quantity: true, unitPrice: true } },
          payment: { select: { method: true, status: true, amount: true, paidAt: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.favorite.findMany({
        where: { customerId: customer.id },
        include: { product: { select: { name: true, slug: true } } },
      }),
      prisma.notification.findMany({
        where: { customerId: customer.id },
        select: { type: true, title: true, body: true, read: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.consentLog.findMany({
        where: { customerId: customer.id },
        select: { version: true, createdAt: true },
      }),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      dataController: "KA Bijoux — Itaúna/MG — contato@kabijoux.com.br",
      profile,
      addresses,
      orders,
      favorites: favorites.map((f) => ({ product: f.product.name, slug: f.product.slug, addedAt: f.createdAt })),
      notifications,
      consentHistory: consentLogs,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ka-bijoux-meus-dados-${customer.id}.json"`,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao exportar dados.", 500);
  }
}
