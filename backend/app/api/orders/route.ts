import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCustomer, requireAdmin } from "@/lib/auth";
import { processPayment } from "@/lib/payment";
import { apiSuccess, apiError, generateOrderNumber } from "@/lib/utils";
import { OrderStatus, ShippingType, PaymentMethod } from "@prisma/client";

const checkoutSchema = z.object({
  addressId: z.string().optional(),
  shippingType: z.nativeEnum(ShippingType),
  shippingPrice: z.number().min(0),
  paymentMethod: z.nativeEnum(PaymentMethod),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  card: z
    .object({
      token: z.string(),
      installments: z.number().int().min(1).max(12),
      holderName: z.string(),
    })
    .optional(),
});

// POST /api/orders — Cliente finaliza compra
export async function POST(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const body = await req.json();
    const data = checkoutSchema.parse(body);

    const cart = await prisma.cart.findUnique({
      where: { customerId: customer.id },
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1, orderBy: { order: "asc" } } } },
            variation: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) return apiError("Carrinho vazio.", 400);

    // Validar endereço (obrigatório para entrega, opcional para retirada)
    if (data.shippingType !== ShippingType.RETIRADA && !data.addressId) {
      return apiError("Endereço de entrega obrigatório.", 400);
    }

    // Verificar estoque de todos os itens
    for (const item of cart.items) {
      const stock = item.variation?.stock ?? item.product.stock;
      if (stock < item.quantity) {
        return apiError(`Produto "${item.product.name}" sem estoque suficiente.`, 400);
      }
    }

    // Calcular totais
    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0
    );
    const total = subtotal + data.shippingPrice;

    const orderNumber = generateOrderNumber();

    // Criar pedido com todos os itens
    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: OrderStatus.CRIADO,
        customerId: customer.id,
        addressId: data.addressId,
        shippingType: data.shippingType,
        shippingPrice: data.shippingPrice,
        subtotal,
        total,
        notes: data.notes,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            variationId: item.variationId,
            productName: item.product.name,
            productImage: item.product.images[0]?.url,
            variationName: item.variation
              ? `${item.variation.name}: ${item.variation.value}`
              : null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: Number(item.unitPrice) * item.quantity,
          })),
        },
        statusHistory: {
          create: { status: OrderStatus.CRIADO, note: "Pedido criado" },
        },
      },
      include: {
        items: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    // Processar pagamento
    const paymentResult = await processPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: total,
      method: data.paymentMethod,
      customer: { name: customer.name, email: customer.email },
      card: data.card,
    });

    const paymentStatus = paymentResult.success ? "AGUARDANDO" : "RECUSADO";

    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: data.paymentMethod,
        status: paymentStatus as "AGUARDANDO" | "RECUSADO",
        amount: total,
        gatewayId: paymentResult.gatewayId,
        pixCode: paymentResult.pixCode,
        pixExpiration: paymentResult.pixExpiration,
      },
    });

    // Atualizar status do pedido
    const newStatus =
      data.paymentMethod === PaymentMethod.PIX
        ? OrderStatus.AGUARDANDO_PAGAMENTO
        : paymentResult.success
        ? OrderStatus.PAGAMENTO_APROVADO
        : OrderStatus.AGUARDANDO_PAGAMENTO;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        statusHistory: {
          create: { status: newStatus },
        },
      },
    });

    // Baixar estoque apenas se pagamento aprovado (cartão)
    if (newStatus === OrderStatus.PAGAMENTO_APROVADO) {
      await decreaseStock(cart.items);
    }

    // Limpar carrinho
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        payment: true,
        customer: { select: { id: true, name: true, email: true } },
        address: true,
      },
    });

    return apiSuccess(finalOrder, 201);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    console.error(e);
    return apiError("Erro ao finalizar pedido.", 500);
  }
}

// GET /api/orders — Admin lista todos | Cliente lista os seus
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Tenta autenticar como admin primeiro
    const adminHeader = req.headers.get("x-admin-request");
    if (adminHeader === "true") {
      await requireAdmin(req);

      const status = searchParams.get("status");
      const page = Number(searchParams.get("page") ?? 1);
      const pageSize = 20;
      const skip = (page - 1) * pageSize;

      const where = status ? { status: status as OrderStatus } : {};
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            customer: { select: { id: true, name: true, email: true } },
            items: { include: { product: { include: { images: { take: 1 } } } } },
            payment: true,
            address: true,
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        prisma.order.count({ where }),
      ]);

      return apiSuccess({ orders, total, page, totalPages: Math.ceil(total / pageSize) });
    }

    // Cliente vê seus próprios pedidos
    const customer = await requireCustomer(req);
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        items: { include: { product: { include: { images: { take: 1 } } } } },
        payment: true,
        address: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(orders);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao buscar pedidos.", 500);
  }
}

async function decreaseStock(items: Array<{ productId: string; variationId: string | null; quantity: number }>) {
  for (const item of items) {
    if (item.variationId) {
      await prisma.productVariation.update({
        where: { id: item.variationId },
        data: { stock: { decrement: item.quantity } },
      });
    } else {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          soldCount: { increment: item.quantity },
        },
      });
    }
  }
}
