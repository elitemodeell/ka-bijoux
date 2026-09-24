export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { OrderStatus, Prisma, ShippingType } from "@prisma/client";
import { z } from "zod";
import { requireAdmin, requireCustomer } from "@/lib/auth";
import {
  createOrResumeCheckout,
  type CheckoutPaymentService,
} from "@/lib/checkout/checkout-service";
import { CheckoutError } from "@/lib/checkout/domain";
import { toPublicOrder } from "@/lib/checkout/public-order";
import {
  isGooglePlayMobileRequest,
  toGooglePlayPublicOrder,
} from "@/lib/google-play-distribution";
import {
  getPaymentService,
  getPaymentServiceForMethod,
} from "@/lib/payments/payment-service";
import { reconcileOrderPayment } from "@/lib/payments/webhook-processor";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { apiError, apiSuccess } from "@/lib/utils";

const checkoutSchema = z
  .object({
    addressId: z.string().min(1).max(100).optional(),
    shippingType: z.nativeEnum(ShippingType),
    shippingOptionId: z.string().trim().min(1).max(100).optional(),
    couponCode: z.string().trim().min(1).max(50).optional(),
    notes: z.string().trim().max(1000).optional(),
    idempotencyKey: z.string().uuid("Chave de idempotência inválida."),
    paymentMethod: z.enum(["PIX", "CREDIT_CARD", "BOLETO"]).default("PIX"),
    installmentCount: z.number().int().min(1).max(3).default(1),
  })
  .strict();

const orderQueryInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: {
    include: {
      product: {
        select: {
          images: { take: 1, orderBy: { order: "asc" } },
          active: true,
          distributionChannels: true,
          playStoreStatus: true,
          contentClassification: true,
          policyReviewStatus: true,
          category: {
            select: {
              active: true,
              distributionChannels: true,
              playStoreStatus: true,
              contentClassification: true,
              policyReviewStatus: true,
            },
          },
        },
      },
    },
  },
  payment: true,
  address: true,
  statusHistory: { orderBy: { createdAt: "desc" } },
});

// A configuração só é carregada quando uma cobrança realmente precisa ser criada.
const paymentService: CheckoutPaymentService = {
  assertAccountIdentity: () => getPaymentService().assertAccountIdentity(),
  findOrCreateCustomer: (request) =>
    getPaymentService().findOrCreateCustomer(request),
  createPixPayment: (request) => getPaymentService().createPixPayment(request),
  createCreditCardCheckout: (request) =>
    getPaymentServiceForMethod("CREDIT_CARD").createCreditCardCheckout(request),
  createBoletoPayment: (request) =>
    getPaymentServiceForMethod("BOLETO").createBoletoPayment(request),
  reconcileOrderPayment: async (orderId) => {
    const service = getPaymentService();
    await reconcileOrderPayment(orderId, service, `checkout:${orderId}`);
  },
};

// POST /api/orders — Pix implícito e cálculo financeiro integralmente no servidor.
export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, RATE_LIMITS.payment);
    if (limited) return limited;
    const customer = await requireCustomer(req);
    const input = checkoutSchema.parse(await req.json());
    const googlePlay = isGooglePlayMobileRequest(req);
    const order = await createOrResumeCheckout(
      customer.id,
      input,
      paymentService,
      { distribution: googlePlay ? "GOOGLE_PLAY" : "WEB_FULL" }
    );
    return apiSuccess(
      googlePlay ? toGooglePlayPublicOrder(order) : toPublicOrder(order),
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    if (error instanceof CheckoutError) {
      return apiError(error.message, error.status, error.code);
    }
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      return apiError("O checkout foi atualizado simultaneamente. Tente novamente.", 409);
    }
    console.error("Erro ao finalizar pedido:", error);
    return apiError("Erro ao finalizar pedido.", 500);
  }
}

// GET /api/orders — admin lista todos; cliente lista somente os seus.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminHeader = req.headers.get("x-admin-request");
    const googlePlay = isGooglePlayMobileRequest(req);

    if (!googlePlay && adminHeader === "true") {
      await requireAdmin(req);
      const status = searchParams.get("status");
      const page = Math.max(1, Number(searchParams.get("page") ?? 1));
      const pageSize = 20;
      const skip = (page - 1) * pageSize;
      const where = status ? { status: status as OrderStatus } : {};

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            ...orderQueryInclude,
            customer: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        prisma.order.count({ where }),
      ]);

      return apiSuccess({
        orders: orders.map(toPublicOrder),
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
      });
    }

    const customer = await requireCustomer(req);
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: orderQueryInclude,
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(
      orders.map((order) =>
        googlePlay ? toGooglePlayPublicOrder(order) : toPublicOrder(order)
      )
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    console.error("Erro ao buscar pedidos:", error);
    return apiError("Erro ao buscar pedidos.", 500);
  }
}
