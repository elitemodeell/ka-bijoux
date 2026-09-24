export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { isSupabaseAuthTransitionEnabled, signOutSupabaseSession } from "@/lib/supabase-auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return apiError("Não autorizado.", 401);
  if (!isSupabaseAuthTransitionEnabled()) return apiError("Logout global indisponível durante o modo legado.", 409);
  const result = await signOutSupabaseSession(token, "global");
  if (result.error) return apiError("Não foi possível encerrar as sessões.", 401);
  const response = apiSuccess({ revoked: true });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
