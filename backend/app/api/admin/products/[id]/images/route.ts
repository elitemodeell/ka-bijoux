import { NextRequest } from "next/server";
import { z } from "zod";
import { ProductPublicationStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

const replaceImageSchema = z.object({
  url: z.string().min(1),
  alt: z.string().trim().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const data = replaceImageSchema.parse(body);

    const product = await prisma.product.findUnique({ where: { id: params.id } });
    if (!product) return apiError("Produto nao encontrado.", 404);

    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: product.id } }),
      prisma.productImage.create({
        data: {
          productId: product.id,
          url: data.url,
          alt: data.alt || product.name,
          order: 0,
        },
      }),
      prisma.product.update({
        where: { id: product.id },
        data: {
          publicationStatus:
            product.publicationStatus === ProductPublicationStatus.MISSING_IMAGE
              ? ProductPublicationStatus.PENDING_REVIEW
              : product.publicationStatus,
        },
      }),
    ]);

    return apiSuccess({ url: data.url });
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    return apiError("Erro ao trocar imagem do produto.", 500);
  }
}
