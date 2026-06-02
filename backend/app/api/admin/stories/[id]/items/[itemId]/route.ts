export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { normalizeStoryItemType, serializeStoryItem } from "@/lib/stories";
import { apiError, apiSuccess } from "@/lib/utils";

const updateItemSchema = z.object({
  type: z.enum(["image", "video"]).optional(),
  mediaUrl: z.string().trim().min(1, "Informe a mídia do story.").optional(),
  duration: z.number().int().min(1).max(120).optional(),
  text: z.string().trim().optional().nullable().transform((value) => (value === "" ? null : value)),
  buttonText: z.string().trim().optional().nullable().transform((value) => (value === "" ? null : value)),
  linkUrl: z.string().trim().optional().nullable().transform((value) => (value === "" ? null : value)),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

function authError(error: unknown) {
  if (error instanceof Error && error.message.toLowerCase().includes("autorizado")) {
    return apiError("Acesso não autorizado.", 401);
  }
  return apiError("Erro ao processar item do story.", 500);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    await requireAdmin(req);
    const body = updateItemSchema.parse(await req.json());
    const { type, ...rest } = body;

    const result = await prisma.storyItem.updateMany({
      where: { id: params.itemId, storyGroupId: params.id },
      data: {
        ...rest,
        ...(type ? { type: normalizeStoryItemType(type) } : {}),
      },
    });

    if (result.count === 0) return apiError("Item não encontrado.", 404);

    const item = await prisma.storyItem.findUniqueOrThrow({
      where: { id: params.itemId },
    });

    return apiSuccess(serializeStoryItem(item));
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    return authError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    await requireAdmin(req);
    const result = await prisma.storyItem.deleteMany({
      where: { id: params.itemId, storyGroupId: params.id },
    });
    if (result.count === 0) return apiError("Item não encontrado.", 404);
    return apiSuccess({ message: "Item excluído." });
  } catch (error) {
    return authError(error);
  }
}
