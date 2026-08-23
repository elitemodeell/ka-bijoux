export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getSupabaseUser, isSupabaseAuthTransitionEnabled } from "@/lib/supabase-auth";
import {
  completeGoogleCustomerLink,
  GoogleCustomerLinkError,
  publicGoogleCustomer,
} from "@/lib/google-auth-customer";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { apiError, apiSuccess } from "@/lib/utils";

function bearerToken(req: NextRequest) {
  const authorization = req.headers.get("authorization")?.trim();
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMITS.auth);
  if (limited) return limited;

  if (!isSupabaseAuthTransitionEnabled()) {
    return apiError("Serviço de autenticação temporariamente indisponível.", 503);
  }

  const accessToken = bearerToken(req);
  if (!accessToken) return apiError("Não autorizado.", 401);

  try {
    // getUser valida o JWT no servidor Supabase; nenhum dado de identidade do
    // cliente ou do corpo da requisição é aceito como fonte de confiança.
    const { data, error } = await getSupabaseUser(accessToken);
    if (error || !data.user) return apiError("Não autorizado.", 401);

    const result = await completeGoogleCustomerLink(data.user);
    const response = apiSuccess({
      customer: publicGoogleCustomer(result.customer),
      authUserId: data.user.id,
      provider: "google" as const,
      created: result.created,
      linked: result.linked,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof GoogleCustomerLinkError) {
      if (error.status === 409) {
        return apiError(
          "Não foi possível vincular esta conta Google ao cadastro existente.",
          409
        );
      }
      return apiError("Não foi possível concluir o login com Google.", error.status);
    }
    // Não registrar token, identidade, e-mail ou detalhes internos.
    console.error("google auth customer completion failed");
    return apiError("Serviço de autenticação temporariamente indisponível.", 503);
  }
}
