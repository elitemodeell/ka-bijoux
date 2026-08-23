export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { isSupabaseAuthTransitionEnabled, refreshSupabaseSession, sessionResponse } from "@/lib/supabase-auth";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { apiError, apiSuccess } from "@/lib/utils";

const schema = z.object({ refreshToken: z.string().min(40).max(2048) });

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMITS.auth);
  if (limited) return limited;
  if (!isSupabaseAuthTransitionEnabled()) return apiError("Renovação de sessão indisponível.", 409);

  try {
    const { refreshToken } = schema.parse(await req.json());
    const result = await refreshSupabaseSession(refreshToken);
    if (result.error || !result.data.session) return apiError("Sessão inválida ou expirada.", 401);
    const response = apiSuccess(sessionResponse(result.data.session, result.data.user));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return apiError("Sessão inválida ou expirada.", 401);
    return apiError("Não foi possível renovar a sessão.", 503);
  }
}
