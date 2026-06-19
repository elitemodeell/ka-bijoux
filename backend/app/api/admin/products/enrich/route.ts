export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { enrichRecentBlingProducts } from "@/lib/product-enrichment";
import { apiError, apiSuccess } from "@/lib/utils";

const enrichSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const data = enrichSchema.parse(body);
    const result = await enrichRecentBlingProducts({ limit: data.limit });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.errors[0].message, 422);
    console.error(error);
    return apiError("Erro ao enriquecer produtos importados da Bling.", 500);
  }
}
