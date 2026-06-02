export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { serializeStoryGroup } from "@/lib/stories";
import { apiError, apiSuccess } from "@/lib/utils";

const updateStorySchema = z.object({
  title: z.string().trim().min(2, "Informe o título do story.").optional(),
  coverImageUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value === "" ? null : value)),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

function authError(error: unknown) {
  if (error instanceof Error && error.message.toLowerCase().includes("autorizado")) {
    return apiError("Acesso não autorizado.", 401);
  }
  return apiError("Erro ao processar story.", 500);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);

    const story = await prisma.storyGroup.findUnique({
      where: { id: params.id },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!story) return apiError("Story não encontrado.", 404);
    return apiSuccess(serializeStoryGroup(story));
  } catch (error) {
    return authError(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);

    const data = updateStorySchema.parse(await req.json());
    const story = await prisma.storyGroup.update({
      where: { id: params.id },
      data,
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return apiSuccess(serializeStoryGroup(story));
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    return authError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    await prisma.storyGroup.delete({ where: { id: params.id } });
    return apiSuccess({ message: "Story excluído." });
  } catch (error) {
    return authError(error);
  }
}
