import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { apiError, apiSuccess } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "customer-avatars";
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60;

async function signedAvatar(avatarPath: string | null) {
  if (!avatarPath) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(avatarPath, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) throw new Error("AVATAR_SIGNING_FAILED");
  return data.signedUrl;
}

function unauthorized(error: unknown) {
  return error instanceof Error && error.message === "N\u00e3o autorizado";
}

export async function GET(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const profile = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: { avatarPath: true },
    });
    if (!profile) return apiError("Perfil n\u00e3o encontrado.", 404, "PROFILE_NOT_FOUND");
    return apiSuccess({ avatarUrl: await signedAvatar(profile.avatarPath) });
  } catch (error) {
    if (unauthorized(error)) return apiError("Sess\u00e3o expirada. Entre novamente.", 401, "SESSION_EXPIRED");
    return apiError("N\u00e3o foi poss\u00edvel carregar a foto do perfil.", 503, "AVATAR_UNAVAILABLE");
  }
}

export async function POST(req: NextRequest) {
  let uploadedPath: string | null = null;
  try {
    const customer = await requireCustomer(req);
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return apiError("Selecione uma foto para enviar.", 422, "AVATAR_FILE_REQUIRED");
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES || file.type !== "image/webp") {
      return apiError("A foto deve estar em WebP e ter no m\u00e1ximo 2 MB.", 422, "AVATAR_FILE_INVALID");
    }

    let normalized: Buffer;
    try {
      const source = Buffer.from(await file.arrayBuffer());
      const image = sharp(source, { limitInputPixels: 12_000_000, failOn: "error" });
      const metadata = await image.metadata();
      if (metadata.format !== "webp" || (metadata.pages ?? 1) !== 1 || !metadata.width || !metadata.height ||
          Math.min(metadata.width, metadata.height) < 200) {
        return apiError("A imagem n\u00e3o parece ser uma foto WebP v\u00e1lida.", 422, "AVATAR_FILE_INVALID");
      }
      normalized = await image
        .rotate()
        .resize(512, 512, { fit: "cover", position: "centre", withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
    } catch {
      return apiError("N\u00e3o foi poss\u00edvel processar esta foto. Escolha outra imagem.", 422, "AVATAR_IMAGE_INVALID");
    }

    const previous = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: { avatarPath: true },
    });
    if (!previous) return apiError("Perfil n\u00e3o encontrado.", 404, "PROFILE_NOT_FOUND");

    uploadedPath = `${customer.id}/${randomUUID()}.webp`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(uploadedPath, normalized, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) throw new Error("AVATAR_UPLOAD_FAILED");

    const avatarUrl = await signedAvatar(uploadedPath);

    await prisma.customer.update({
      where: { id: customer.id },
      data: { avatarPath: uploadedPath },
    });

    if (previous.avatarPath) {
      void supabaseAdmin.storage.from(BUCKET).remove([previous.avatarPath]).catch(() => undefined);
    }
    return apiSuccess({ avatarUrl });
  } catch (error) {
    if (uploadedPath) await supabaseAdmin.storage.from(BUCKET).remove([uploadedPath]).catch(() => undefined);
    if (unauthorized(error)) return apiError("Sess\u00e3o expirada. Entre novamente.", 401, "SESSION_EXPIRED");
    return apiError("N\u00e3o foi poss\u00edvel salvar a foto. Tente novamente.", 503, "AVATAR_UPLOAD_FAILED");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const profile = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: { avatarPath: true },
    });
    if (!profile) return apiError("Perfil n\u00e3o encontrado.", 404, "PROFILE_NOT_FOUND");
    await prisma.customer.update({
      where: { id: customer.id },
      data: { avatarPath: null },
    });
    if (profile.avatarPath) {
      const { error } = await supabaseAdmin.storage.from(BUCKET).remove([profile.avatarPath]);
      if (error) console.error("Falha ao remover objeto privado de avatar", { customerId: customer.id });
    }
    return apiSuccess({ avatarUrl: null });
  } catch (error) {
    if (unauthorized(error)) return apiError("Sess\u00e3o expirada. Entre novamente.", 401, "SESSION_EXPIRED");
    return apiError("N\u00e3o foi poss\u00edvel remover a foto do perfil.", 503, "AVATAR_REMOVE_FAILED");
  }
}
