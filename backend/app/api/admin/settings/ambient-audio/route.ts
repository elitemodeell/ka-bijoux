export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { uploadToStorage } from "@/lib/supabase";
import { apiError, apiSuccess } from "@/lib/utils";

const MAX_AUDIO_SIZE = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".mp3") || file.type !== "audio/mpeg") {
      return apiError("Envie a gravação oficial no formato MP3.", 422);
    }
    if (file.size < 1024 || file.size > MAX_AUDIO_SIZE) {
      return apiError("O arquivo MP3 deve ter entre 1 KB e 8 MB.", 422);
    }

    const signature = Buffer.from(await file.slice(0, 4).arrayBuffer());
    const isId3 = signature.subarray(0, 3).toString("ascii") === "ID3";
    const isMpegFrame = signature[0] === 0xff && (signature[1] & 0xe0) === 0xe0;
    if (!isId3 && !isMpegFrame) return apiError("O arquivo não contém uma assinatura MP3 válida.", 422);

    const fileName = `seasonal-audio/${Date.now()}-${randomUUID()}.mp3`;
    const url = await uploadToStorage("stories", fileName, file);
    return apiSuccess({ url, fileName }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("autorizado")) {
      return apiError("Acesso não autorizado.", 401);
    }
    return apiError("Erro ao enviar a música sazonal.", 500);
  }
}
