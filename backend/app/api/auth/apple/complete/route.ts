export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getSupabaseUser, isSupabaseAuthTransitionEnabled } from "@/lib/supabase-auth";
import {
  completeAppleCustomerLink,
  GoogleCustomerLinkError,
  publicGoogleCustomer,
} from "@/lib/google-auth-customer";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { apiError, apiSuccess } from "@/lib/utils";
import { exchangeAppleAuthorizationCode, storeAppleRefreshToken } from "@/lib/apple-sign-in";

function bearerToken(req: NextRequest) {
  const match = req.headers.get("authorization")?.trim().match(/^Bearer\s+([^\s]+)$/i);
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
    // Supabase valida assinatura, issuer, audience e expiração do identity token
    // Apple antes de emitir este access token. O backend volta a validar a sessão
    // e usa somente a identidade retornada pelo servidor Supabase.
    const { data, error } = await getSupabaseUser(accessToken);
    if (error || !data.user) return apiError("Não autorizado.", 401);

    const body = await req.json().catch(() => null) as { authorizationCode?: unknown } | null;
    const authorizationCode = typeof body?.authorizationCode === "string" ? body.authorizationCode.trim() : "";
    if (authorizationCode.length > 2048) {
      return apiError("Código de autorização Apple inválido.", 400);
    }

    const appleIdentity = data.user.identities?.find((identity) => identity.provider === "apple");
    const appleSubject = [appleIdentity?.identity_data?.sub, appleIdentity?.id]
      .find((value): value is string => typeof value === "string" && value.length > 0);
    if (!appleSubject) return apiError("Identidade Apple inválida.", 400);

    const appleTokens = authorizationCode
      ? await exchangeAppleAuthorizationCode(authorizationCode, appleSubject)
      : null;
    const result = await completeAppleCustomerLink(data.user);
    if (appleTokens) {
      await storeAppleRefreshToken({
        customerId: result.customer.id,
        authUserId: data.user.id,
        appleSubject,
        refreshToken: appleTokens.refreshToken,
      });
    }
    const response = apiSuccess({
      customer: publicGoogleCustomer(result.customer),
      authUserId: data.user.id,
      provider: "apple" as const,
      created: result.created,
      linked: result.linked,
      appleRevocationPrepared: appleTokens !== null,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof GoogleCustomerLinkError) {
      if (error.status === 409) {
        return apiError("Não foi possível vincular esta conta Apple ao cadastro existente.", 409);
      }
      return apiError("Não foi possível concluir o login com Apple.", error.status);
    }
    console.error("apple auth customer completion failed");
    return apiError("Serviço de autenticação temporariamente indisponível.", 503);
  }
}
