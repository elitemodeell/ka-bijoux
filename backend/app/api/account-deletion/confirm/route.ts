export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { executeAccountDeletion } from "@/lib/account-deletion";
import { apiError, apiSuccess } from "@/lib/utils";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";

const schema = z.object({
  token: z.string().min(32).max(128),
  confirmation: z.literal("EXCLUIR"),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMITS.accountDeletionIp);
  if (limited) return limited;

  try {
    const input = schema.parse(await req.json());
    const result = await executeAccountDeletion(input.token);
    if (result.status === "invalid") {
      return apiError("Este link é inválido, expirou ou já foi utilizado.", 410);
    }
    return apiSuccess({
      message: "Sua conta foi excluída e os dados de uso foram removidos.",
      retainedOrderData: result.retainedOrderData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Confirmação inválida.", 422);
    }
    console.error("account-deletion confirmation failed", error);
    return apiError("Não foi possível processar a exclusão.", 500);
  }
}
