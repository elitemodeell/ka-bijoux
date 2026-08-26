export const dynamic = 'force-dynamic';
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCustomer, requireAdmin } from "@/lib/auth";
import { assertPaymentMethodAvailable, PaymentUnavailableError, processPayment } from "@/lib/payment";
import { calculateShipping } from "@/lib/shipping";
import { apiSuccess, apiError, generateOrderNumber } from "@/lib/utils";
import { OrderStatus, ShippingType, PaymentMethod } from "@prisma/client";
import { isIosAppRequest, isRestrictedIosProduct } from "@/lib/mobile-client";

const checkoutSchema = z.object({
  addressId: z.string().optional(),
  shippingType: z.nativeEnum(ShippingType),
  shippingPrice: z.number().min(0),
  paymentMethod: z.nativeEnum(PaymentMethod),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

function checkoutRequestHash(data: z.infer<typeof checkoutSchema>) {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

async function finishPayment(
  order: { id: string; orderNumber: string; total: unknown },
  customerId: string,
  paymentMethod: PaymentMethod,
  idempotencyKey: string,
) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, email: true, cpf: true, phone: true },
  });
  if (!customer) throw new PaymentUnavailableError();

  let result;
  try {
    result = await processPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.total),
      method: paymentMethod,
      customer,
    });
  } catch (error) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.FALHA_NO_PAGAMENTO,
        statusHistory: {
          create: {
            status: OrderStatus.FALHA_NO_PAGAMENTO,
            note: "Falha segura ao iniciar pagamento",
          },
        },
      },
    });
    throw error;
  }

  await prisma.payment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      provider: "ASAAS",
      method: paymentMethod,
      status: "AGUARDANDO",
      amount: Number(order.total),
      gatewayId: result.gatewayId,
      externalPaymentId: result.gatewayId,
      externalReference: order.orderNumber,
      idempotencyKey,
      environment:
        process.env.ASAAS_ENVIRONMENT?.trim().toLowerCase() === "production"
          ? "PRODUCTION"
          : "SANDBOX",
      pixCode: result.pixCode,
      pixExpiration: result.pixExpiration,
      checkoutUrl: result.checkoutUrl,
      gatewayData: result.checkoutUrl ? { checkoutUrl: result.checkoutUrl } : undefined,
    },
    update: {},
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.AGUARDANDO_PAGAMENTO,
      statusHistory: { create: { status: OrderStatus.AGUARDANDO_PAGAMENTO } },
    },
  });
  const cart = await prisma.cart.findUnique({ where: { customerId } });
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  return prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: true,
      payment: true,
      customer: { select: { id: true, name: true, email: true } },
      address: true,
    },
  });
}

// POST /api/orders — Cliente finaliza compra
export async function POST(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const body = await req.json();
    const data = checkoutSchema.parse(body);
    assertPaymentMethodAvailable(data.paymentMethod);
    const idempotencyKey = req.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || !/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
      return apiError("Não foi possível iniciar o pagamento com segurança.", 422);
    }

    const requestHash = checkoutRequestHash(data);
    const previousOrder = await prisma.order.findFirst({
      where: { customerId: customer.id, checkoutIdempotencyKey: idempotencyKey },
      include: { items: true, payment: true, address: true },
    });
    if (previousOrder) {
      if (previousOrder.checkoutRequestHash !== requestHash) {
        return apiError("Esta chave de pagamento já foi usada com outros dados.", 409);
      }
      if (previousOrder.payment) return apiSuccess(previousOrder);
      const resumed = await finishPayment(previousOrder, customer.id, data.paymentMethod, idempotencyKey);
      return apiSuccess(resumed, 201);
    }

    const cart = await prisma.cart.findUnique({
      where: { customerId: customer.id },
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1, orderBy: { order: "asc" } }, category: true, subcategory: true } },
            variation: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) return apiError("Carrinho vazio.", 400);
    if (isIosAppRequest(req) && cart.items.some((item) => isRestrictedIosProduct(item.product))) {
      return apiError("O carrinho contém item indisponível neste dispositivo. Ajuste o carrinho pelo site.", 409);
    }

    // Validar endereço e recalcular o frete no servidor.
    if (data.shippingType !== ShippingType.RETIRADA && !data.addressId) {
      return apiError("Endereço de entrega obrigatório.", 400);
    }
    const address = data.addressId
      ? await prisma.address.findFirst({ where: { id: data.addressId, customerId: customer.id } })
      : null;
    if (data.addressId && !address) return apiError("Endereço de entrega inválido.", 400);

    let shippingConfig = await prisma.storeSettings.findFirst();
    if (!shippingConfig) shippingConfig = await prisma.storeSettings.create({ data: {} });
    const destinationZip = address?.zipCode ?? shippingConfig.storeZipCode;
    const shippingOptions = await calculateShipping(
      destinationZip,
      cart.items.map((item) => ({
        weight: Number(item.product.weight),
        height: Number(item.product.height),
        width: Number(item.product.width),
        length: Number(item.product.length),
        quantity: item.quantity,
      })),
      {
        correiosEnabled: shippingConfig.correiosEnabled,
        mototaxiEnabled: shippingConfig.mototaxiEnabled,
        storePickupEnabled: shippingConfig.storePickupEnabled,
        mototaxiPrice: Number(shippingConfig.mototaxiPrice),
      },
    );
    const validShipping = shippingOptions.some((option) =>
      option.available && option.type === data.shippingType && Math.abs(option.price - data.shippingPrice) < 0.01
    );
    if (!validShipping) return apiError("Opção de frete inválida ou desatualizada.", 409);

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
        checkoutIdempotencyKey: idempotencyKey,
        checkoutRequestHash: requestHash,
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

    const finalOrder = await finishPayment(
      order,
      customer.id,
      data.paymentMethod,
      idempotencyKey,
    );

    return apiSuccess(finalOrder, 201);
  } catch (e) {
    if (e instanceof PaymentUnavailableError) return apiError("Pagamento temporariamente indisponível", 503);
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
