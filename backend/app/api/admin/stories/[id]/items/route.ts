export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { normalizeStoryItemType, serializeStoryItem } from "@/lib/stories";
import { apiError, apiSuccess } from "@/lib/utils";

const itemSchema = z.object({
  type: z.enum(["image", "video"]).default("image"),
  mediaUrl: z.string().trim().min(1, "Informe a mídia do story."),
  duration: z.number().int().min(1).max(120).default(5),
  text: z.string().trim().optional().nullable().transform((value) => (value ? value : null)),
  buttonText: z.string().trim().optional().nullable().transform((value) => (value ? value : null)),
  linkUrl: z.string().trim().optional().nullable().transform((value) => (value ? value : null)),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

function authError(error: unknown) {
  if (error instanceof Error && error.message.toLowerCase().includes("autorizado")) {
    return apiError("Acesso não autorizado.", 401);
  }
  return apiError("Erro ao processar item do story.", 500);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const data = itemSchema.parse(await req.json());

    const item = await prisma.storyItem.create({
      data: {
        storyGroupId: params.id,
        type: normalizeStoryItemType(data.type),
        mediaUrl: data.mediaUrl,
        duration: data.duration,
        text: data.text,
        buttonText: data.buttonText,
        linkUrl: data.linkUrl,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    return apiSuccess(serializeStoryItem(item), 201);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    return authError(error);
  }
}
