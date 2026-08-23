import * as WebBrowser from "expo-web-browser";
import type { Session } from "@supabase/supabase-js";
import axios from "axios";

import { api } from "@/services/api";
import { getSupabaseClient, SUPABASE_MOBILE_CONFIGURED } from "@/lib/supabase";
import { useAuthStore, type Customer } from "@/stores/authStore";

WebBrowser.maybeCompleteAuthSession();

export const MOBILE_GOOGLE_AUTH_REDIRECT_URL = "com.kabijoux.app://auth/callback";

export type GoogleAuthResult =
  | { status: "authenticated"; customer: Customer }
  | { status: "cancelled" };

export class GoogleAuthError extends Error {
  constructor(
    public readonly code:
      | "not_configured"
      | "provider_unavailable"
      | "invalid_callback"
      | "session_exchange_failed"
      | "customer_link_failed"
      | "network_error",
    message: string,
  ) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

let pendingCompletion: { code: string; promise: Promise<GoogleAuthResult> } | null = null;

function callbackCode(callbackUrl: string) {
  let url: URL;
  try {
    url = new URL(callbackUrl);
  } catch {
    throw new GoogleAuthError("invalid_callback", "O retorno do Google não é válido.");
  }

  if (
    url.protocol !== "com.kabijoux.app:" ||
    url.hostname !== "auth" ||
    url.pathname !== "/callback"
  ) {
    throw new GoogleAuthError("invalid_callback", "O retorno do Google não pertence ao aplicativo KA Bijoux.");
  }

  const oauthError = url.searchParams.get("error");
  if (oauthError === "access_denied") return null;
  if (oauthError) {
    throw new GoogleAuthError("provider_unavailable", "O Google não concluiu a autenticação.");
  }

  const code = url.searchParams.get("code")?.trim();
  if (!code) {
    throw new GoogleAuthError("invalid_callback", "O Google não retornou um código de autenticação válido.");
  }
  return code;
}

async function linkCustomer(session: Session): Promise<Customer> {
  try {
    const response = await api.post(
      "/api/auth/google/complete",
      undefined,
      { headers: { Authorization: `Bearer ${session.access_token}` } },
    );
    const customer = response.data?.data?.customer as Customer | undefined;
    if (!customer?.id || !customer.email || !customer.name) {
      throw new GoogleAuthError("customer_link_failed", "O perfil da conta não foi concluído.");
    }
    return customer;
  } catch (error) {
    if (error instanceof GoogleAuthError) throw error;
    if (axios.isAxiosError(error) && !error.response) {
      throw new GoogleAuthError("network_error", "Sem conexão com o servidor. Tente novamente.");
    }
    throw new GoogleAuthError(
      "customer_link_failed",
      "Não foi possível vincular sua conta com segurança. Use o acesso por e-mail ou tente novamente.",
    );
  }
}

export async function completeGoogleOAuthCode(code: string): Promise<GoogleAuthResult> {
  const normalizedCode = code.trim();
  if (!normalizedCode) {
    throw new GoogleAuthError("invalid_callback", "Código de autenticação ausente.");
  }

  if (pendingCompletion?.code === normalizedCode) return pendingCompletion.promise;

  const promise = (async () => {
    let session: Session | null = null;
    try {
      const supabase = getSupabaseClient();
      const exchanged = await supabase.auth.exchangeCodeForSession(normalizedCode);
      if (exchanged.error || !exchanged.data.session) {
        throw new GoogleAuthError(
          "session_exchange_failed",
          "Não foi possível concluir a sessão do Google. Tente novamente.",
        );
      }
      session = exchanged.data.session;
      const customer = await linkCustomer(session);
      await useAuthStore.getState().completeSupabaseLogin({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        customer,
      });
      return { status: "authenticated", customer } as const;
    } catch (error) {
      if (session) await getSupabaseClient().auth.signOut({ scope: "local" }).catch(() => undefined);
      if (error instanceof GoogleAuthError) throw error;
      throw new GoogleAuthError(
        "session_exchange_failed",
        "Não foi possível concluir o login com Google. Tente novamente.",
      );
    }
  })();

  const trackedPromise = promise.finally(() => {
    if (pendingCompletion?.code === normalizedCode) pendingCompletion = null;
  });
  pendingCompletion = { code: normalizedCode, promise: trackedPromise };
  return trackedPromise;
}

export async function completeGoogleOAuthCallback(callbackUrl: string): Promise<GoogleAuthResult> {
  const code = callbackCode(callbackUrl);
  if (!code) return { status: "cancelled" };
  return completeGoogleOAuthCode(code);
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  if (!SUPABASE_MOBILE_CONFIGURED) {
    throw new GoogleAuthError(
      "not_configured",
      "O login com Google ainda não está configurado nesta instalação.",
    );
  }

  const supabase = getSupabaseClient();
  const started = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: MOBILE_GOOGLE_AUTH_REDIRECT_URL,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });

  if (started.error || !started.data.url) {
    throw new GoogleAuthError(
      "provider_unavailable",
      "O login com Google não está disponível agora. Tente novamente mais tarde.",
    );
  }

  const browserResult = await WebBrowser.openAuthSessionAsync(
    started.data.url,
    MOBILE_GOOGLE_AUTH_REDIRECT_URL,
  );

  if (browserResult.type === "cancel" || browserResult.type === "dismiss") {
    return { status: "cancelled" };
  }
  if (browserResult.type !== "success" || !browserResult.url) {
    throw new GoogleAuthError(
      "provider_unavailable",
      "O Google não concluiu a autenticação.",
    );
  }

  return completeGoogleOAuthCallback(browserResult.url);
}

export function googleAuthErrorMessage(error: unknown) {
  if (error instanceof GoogleAuthError) return error.message;
  return "Não foi possível entrar com Google. Verifique sua conexão e tente novamente.";
}
