"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type CustomerProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};

export default function CustomerAccount() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = getSupabaseBrowserClient();
      void supabase.auth.getSession().then(({ data }) => {
        if (active) setSession(data.session);
      });
      const listener = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (active) setSession(nextSession);
      });
      unsubscribe = () => listener.data.subscription.unsubscribe();
    } catch {
      setError("A autenticação está indisponível neste ambiente.");
      setSession(null);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setCustomer(null);
      return;
    }

    let active = true;
    void fetch("/api/customers/me", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Perfil indisponível");
        const payload = (await response.json()) as { data?: CustomerProfile };
        if (!payload.data) throw new Error("Perfil ausente");
        if (active) setCustomer(payload.data);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar os dados da sua conta.");
      });

    return () => {
      active = false;
    };
  }, [session?.access_token]);

  async function signOut() {
    if (signingOut || !session?.access_token) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      await getSupabaseBrowserClient().auth.signOut({ scope: "local" });
      setCustomer(null);
      setError(null);
    } finally {
      setSigningOut(false);
    }
  }

  if (session === undefined) {
    return <p className="text-center text-sm font-medium text-gray-500">Carregando sua conta…</p>;
  }

  if (!session) {
    return (
      <div className="text-center">
        <p className="text-sm leading-relaxed text-gray-600">Entre para consultar seus dados e continuar suas compras com segurança.</p>
        {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
        <Link href="/entrar?next=/conta" className="mt-6 inline-flex rounded-full bg-pink-500 px-7 py-3 text-sm font-bold text-white transition hover:bg-pink-600">
          Entrar na minha conta
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-pink-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-400">Conta Google conectada</p>
        <p className="mt-2 text-lg font-black text-gray-900">{customer?.name ?? session.user.user_metadata?.full_name ?? "Cliente KA"}</p>
        <p className="mt-1 break-all text-sm text-gray-600">{customer?.email ?? session.user.email}</p>
      </div>
      {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="w-full rounded-2xl border border-pink-200 px-5 py-3 text-sm font-bold text-pink-600 transition hover:bg-pink-50 disabled:opacity-60"
      >
        {signingOut ? "Saindo…" : "Sair da conta"}
      </button>
    </div>
  );
}
