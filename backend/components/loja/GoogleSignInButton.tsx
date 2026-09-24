"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { googleOAuthCallbackUrl, safeAuthRedirect } from "@/lib/auth-redirect";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function GoogleSignInButton() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const next = safeAuthRedirect(searchParams.get("next"));
      const redirectTo = googleOAuthCallbackUrl(window.location.origin, next);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          scopes: "openid email profile",
          queryParams: { prompt: "select_account" },
        },
      });

      if (oauthError) throw oauthError;
    } catch {
      setError("Não foi possível iniciar o login com Google. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-800 shadow-sm transition hover:border-pink-200 hover:bg-pink-50/40 focus:outline-none focus:ring-4 focus:ring-pink-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {loading ? "Abrindo o Google…" : "Continuar com Google"}
      </button>
      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.35Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.9A6 6 0 0 1 6.08 12c0-.66.11-1.3.31-1.9V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.49l3.35-2.59Z" />
      <path fill="#EA4335" d="M12 5.97c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.59C7.18 7.73 9.39 5.97 12 5.97Z" />
    </svg>
  );
}
