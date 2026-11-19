export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { CatalogPhotoError, catalogPhotoPath, normalizeCatalogPhoto } from "@/lib/catalog-photo";
import { apiError, apiSuccess } from "@/lib/utils";

const maxSize = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) return apiError("Envie uma imagem valida.", 422);
    if (file.size > maxSize) return apiError("Imagem muito grande.", 422);
    const productValue = formData.get("productId");
    const variationValue = formData.get("variationId");
    const productId = typeof productValue === "string" ? productValue : null;
    const variationId = typeof variationValue === "string" ? variationValue : null;
    if (productId && !await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })) {
      return apiError("Produto não encontrado.", 404);
    }
    if (variationId && (!productId || !await prisma.productVariation.findFirst({
      where: { id: variationId, productId },
      select: { id: true },
    }))) {
      return apiError("A variação não pertence ao produto.", 422);
    }
    const { normalized, fingerprint } = await normalizeCatalogPhoto(Buffer.from(await file.arrayBuffer()));
    const fileName = catalogPhotoPath(productId, variationId, fingerprint);
    if (productId) {
      const suffix = `/${fingerprint}.webp`;
      const [galleryConflict, variationConflict] = await Promise.all([
        prisma.productImage.findFirst({
          where: { productId: { not: productId }, url: { endsWith: suffix } }, select: { id: true },
        }),
        prisma.productVariation.findFirst({
          where: { productId: { not: productId }, imageUrl: { endsWith: suffix } }, select: { id: true },
        }),
      ]);
      if (galleryConflict || variationConflict) {
        return apiError("O mesmo conteúdo visual já está vinculado a outro produto.", 409);
      }
    }
    const bucket = supabaseAdmin.storage.from("products");
    const { error } = await bucket.upload(fileName, normalized, {
      contentType: "image/webp", cacheControl: "31536000", upsert: false,
    });
    if (error && !("statusCode" in error && String(error.statusCode) === "409") &&
        !("status" in error && String(error.status) === "409")) {
      return apiError("O armazenamento recusou o envio da foto.", 502);
    }
    const { data: { publicUrl: url } } = bucket.getPublicUrl(fileName);

    return apiSuccess({ url, fileName }, 201);
  } catch (error) {
    if (error instanceof CatalogPhotoError) return apiError(error.message, 422);
    if (error instanceof Error && error.message.toLowerCase().includes("autorizado")) {
      return apiError("Acesso nao autorizado.", 401);
    }
    return apiError("Erro ao enviar imagem.", 500);
  }
}
