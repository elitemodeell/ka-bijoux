export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { uploadToStorage } from "@/lib/supabase";
import { apiError, apiSuccess } from "@/lib/utils";

const allowedImages = new Set(["jpg", "jpeg", "png", "webp"]);
const allowedVideos = new Set(["mp4", "webm", "mov"]);
const maxSizeByKind = { image: 8 * 1024 * 1024, video: 80 * 1024 * 1024 };

function getExtension(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName) return byName;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "video/mp4") return "mp4";
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  return "";
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) return apiError("Envie um arquivo válido.", 422);

    const extension = getExtension(file);
    const kind = allowedImages.has(extension)
      ? "image"
      : allowedVideos.has(extension)
        ? "video"
        : null;

    if (!kind) {
      return apiError("Tipo de arquivo não permitido. Use jpg, jpeg, png, webp, mp4, webm ou mov.", 422);
    }
    if (file.size > maxSizeByKind[kind]) {
      return apiError(kind === "image" ? "Imagem muito grande." : "Vídeo muito grande.", 422);
    }

    const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
    const bucket = kind === "video" ? "stories-videos" : "stories";
    const url = await uploadToStorage(bucket, fileName, file);

    return apiSuccess({ url, type: kind, fileName }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("autorizado")) {
      return apiError("Acesso não autorizado.", 401);
    }
    return apiError("Erro ao enviar arquivo.", 500);
  }
}
