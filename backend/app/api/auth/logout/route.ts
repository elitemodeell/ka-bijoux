export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { isSupabaseAuthTransitionEnabled, signOutSupabaseSession } from "@/lib/supabase-auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return apiError("Não autorizado.", 401);
  if (!isSupabaseAuthTransitionEnabled()) return apiSuccess({ revoked: false, legacySession: true });
  const result = await signOutSupabaseSession(token, "local");
  if (result.error) return apiError("Não foi possível encerrar a sessão.", 401);
  const response = apiSuccess({ revoked: true });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
