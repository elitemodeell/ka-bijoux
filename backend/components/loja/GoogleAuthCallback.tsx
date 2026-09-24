"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeAuthRedirect } from "@/lib/auth-redirect";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type CallbackState = "loading" | "error";

export default function GoogleAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);
  const [state, setState] = useState<CallbackState>("loading");
  const [message, setMessage] = useState("Concluindo sua entrada com Google…");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function finishGoogleSignIn() {
      const oauthError = searchParams.get("error");
      const code = searchParams.get("code");
      if (oauthError || !code) {
        setMessage("O login com Google foi cancelado ou não pôde ser concluído.");
        setState("error");
        return;
      }

      let supabase: ReturnType<typeof getSupabaseBrowserClient> | null = null;
      try {
        supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session?.access_token) throw error ?? new Error("Sessão ausente");

        const response = await fetch("/api/auth/google/complete", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) throw new Error("Vínculo de cliente recusado");

        router.replace(safeAuthRedirect(searchParams.get("next")));
        router.refresh();
      } catch {
        await supabase?.auth.signOut({ scope: "local" }).catch(() => undefined);
        setMessage("Não foi possível concluir sua entrada. Tente novamente.");
        setState("error");
      }
    }

    void finishGoogleSignIn();
  }, [router, searchParams]);

  return (
    <div className="text-center" aria-live="polite">
      {state === "loading" ? (
        <span className="mx-auto mb-5 block h-10 w-10 animate-spin rounded-full border-4 border-pink-100 border-t-pink-500" aria-hidden="true" />
      ) : (
        <span className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-xl text-red-600" aria-hidden="true">!</span>
      )}
      <p className="text-sm font-semibold text-gray-700">{message}</p>
      {state === "error" && (
        <Link href="/entrar" className="mt-5 inline-flex rounded-full bg-pink-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-pink-600">
          Voltar para entrar
        </Link>
      )}
    </div>
  );
}
