export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { normalizeStoryItemType, serializeStoryGroup } from "@/lib/stories";
import { apiError, apiSuccess } from "@/lib/utils";

const nullableText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

const itemSchema = z.object({
  type: z.enum(["image", "video"]).default("image"),
  mediaUrl: z.string().trim().min(1, "Informe a mídia do story."),
  duration: z.number().int().min(1).max(120).default(5),
  text: nullableText,
  buttonText: nullableText,
  linkUrl: nullableText,
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const createStorySchema = z.object({
  title: z.string().trim().min(2, "Informe o título do story."),
  coverImageUrl: nullableText,
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  items: z.array(itemSchema).optional(),
});

function authError(error: unknown) {
  if (error instanceof Error && error.message.toLowerCase().includes("autorizado")) {
    return apiError("Acesso não autorizado.", 401);
  }
  return apiError("Erro ao processar stories.", 500);
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const groups = await prisma.storyGroup.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return apiSuccess(groups.map(serializeStoryGroup));
  } catch (error) {
    return authError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const data = createStorySchema.parse(await req.json());
    const story = await prisma.storyGroup.create({
      data: {
        title: data.title,
        coverImageUrl: data.coverImageUrl,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        items: data.items?.length
          ? {
              create: data.items.map((item) => ({
                type: normalizeStoryItemType(item.type),
                mediaUrl: item.mediaUrl,
                duration: item.duration,
                text: item.text,
                buttonText: item.buttonText,
                linkUrl: item.linkUrl,
                isActive: item.isActive,
                sortOrder: item.sortOrder,
              })),
            }
          : undefined,
      },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return apiSuccess(serializeStoryGroup(story), 201);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    return authError(error);
  }
}
