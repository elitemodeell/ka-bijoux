export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

const allowedImages = new Set(["jpg", "jpeg", "png", "webp"]);
const maxSize = 8 * 1024 * 1024;

function getExtension(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName) return byName;

  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return "";
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiError("Envie uma imagem valida.", 422);
    }

    const extension = getExtension(file);
    if (!allowedImages.has(extension)) {
      return apiError("Tipo de imagem nao permitido. Use jpg, jpeg, png ou webp.", 422);
    }

    if (file.size > maxSize) {
      return apiError("Imagem muito grande.", 422);
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
    const destination = path.join(uploadDir, fileName);
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(destination, bytes);

    return apiSuccess({
      url: `/uploads/products/${fileName}`,
      fileName,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("autorizado")) {
      return apiError("Acesso nao autorizado.", 401);
    }
    return apiError("Erro ao enviar imagem.", 500);
  }
}
