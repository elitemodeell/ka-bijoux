import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import axios from "axios";

import { api } from "@/services/api";
import { getSupabaseClient, SUPABASE_MOBILE_CONFIGURED } from "@/lib/supabase";
import { useAuthStore, type Customer } from "@/stores/authStore";

export type AppleAuthResult =
  | { status: "authenticated"; customer: Customer }
  | { status: "cancelled" };

export class AppleAuthError extends Error {
  constructor(
    public readonly code: "not_available" | "not_configured" | "invalid_credential" | "customer_link_failed" | "network_error",
    message: string,
  ) {
    super(message);
    this.name = "AppleAuthError";
  }
}

function displayName(credential: AppleAuthentication.AppleAuthenticationCredential) {
  const parts = [credential.fullName?.givenName, credential.fullName?.middleName, credential.fullName?.familyName]
    .filter((part): part is string => Boolean(part?.trim()));
  return parts.join(" ").replace(/\s+/g, " ").trim() || undefined;
}

export async function signInWithApple(): Promise<AppleAuthResult> {
  if (!SUPABASE_MOBILE_CONFIGURED) {
    throw new AppleAuthError("not_configured", "O login com Apple não está configurado nesta instalação.");
  }
  if (!(await AppleAuthentication.isAvailableAsync())) {
    throw new AppleAuthError("not_available", "O login com Apple não está disponível neste dispositivo.");
  }

  const rawNonce = Crypto.randomUUID();
  try {
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) {
      throw new AppleAuthError("invalid_credential", "A Apple não retornou uma credencial válida.");
    }

    const supabase = getSupabaseClient();
    const signedIn = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (signedIn.error || !signedIn.data.session) {
      throw new AppleAuthError("invalid_credential", "Não foi possível validar a credencial da Apple.");
    }

    const session = signedIn.data.session;
    const firstAuthorizationName = displayName(credential);
    if (firstAuthorizationName) {
      await supabase.auth.updateUser({ data: { full_name: firstAuthorizationName } });
    }
    const response = await api.post("/api/auth/apple/complete", undefined, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const customer = response.data?.data?.customer as Customer | undefined;
    if (!customer?.id || !customer.email || !customer.name) {
      throw new AppleAuthError("customer_link_failed", "O perfil da conta não foi concluído.");
    }
    await useAuthStore.getState().completeSupabaseLogin({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      customer,
    });
    return { status: "authenticated", customer };
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "ERR_REQUEST_CANCELED") return { status: "cancelled" };
    if (error instanceof AppleAuthError) throw error;
    await getSupabaseClient().auth.signOut({ scope: "local" }).catch(() => undefined);
    if (axios.isAxiosError(error) && !error.response) {
      throw new AppleAuthError("network_error", "Sem conexão com o servidor. Tente novamente.");
    }
    throw new AppleAuthError("customer_link_failed", "Não foi possível concluir o login com Apple.");
  }
}

export function appleAuthErrorMessage(error: unknown) {
  return error instanceof AppleAuthError ? error.message : "Não foi possível concluir o login com Apple.";
}
