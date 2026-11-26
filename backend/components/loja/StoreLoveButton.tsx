"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const visitorStorageKey = "ka-store-love-visitor-v1";

function persistentVisitorId() {
  let id = window.localStorage.getItem(visitorStorageKey);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(visitorStorageKey, id);
  }
  return id;
}

export default function StoreLoveButton() {
  const [count, setCount] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async (token?: string) => {
    const visitorId = persistentVisitorId();
    const response = await fetch("/api/store-likes", {
      headers: {
        "x-ka-store-visitor": visitorId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Curtidas indisponíveis");
    const payload = await response.json();
    setCount(payload.data.count);
    setLiked(payload.data.liked);
  }, []);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | undefined;
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const [{ data }, listener] = await Promise.all([
          supabase.auth.getSession(),
          Promise.resolve(supabase.auth.onAuthStateChange((_event, session) => {
            if (active) void refresh(session?.access_token).catch(() => undefined);
          })),
        ]);
        subscription = listener.data.subscription;
        if (active) await refresh(data.session?.access_token);
      } catch {
        if (active) await refresh().catch(() => undefined);
      }
    };
    void load();
    return () => { active = false; subscription?.unsubscribe(); };
  }, [refresh]);

  async function toggle() {
    if (saving || count === null) return;
    setSaving(true);
    const previous = { liked, count };
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount(Math.max(0, count + (nextLiked ? 1 : -1)));
    try {
      const visitorId = persistentVisitorId();
      const { data: session } = await getSupabaseBrowserClient().auth.getSession();
      const response = await fetch("/api/store-likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ka-store-visitor": visitorId,
          ...(session.session?.access_token ? { Authorization: `Bearer ${session.session.access_token}` } : {}),
        },
        body: JSON.stringify({ visitorId, liked: nextLiked }),
      });
      if (!response.ok) throw new Error("Curtida não foi salva");
      const payload = await response.json();
      setCount(payload.data.count);
      setLiked(payload.data.liked);
    } catch {
      setLiked(previous.liked);
      setCount(previous.count);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={saving || count === null}
      aria-pressed={liked}
      aria-label={liked ? "Retirar curtida da KA Bijoux" : "Curtir a KA Bijoux"}
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full text-pink-600 transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-70 sm:gap-2"
    >
      <svg className={`h-5 w-5 transition-transform duration-200 ${liked ? "scale-110 fill-pink-500" : "fill-transparent"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
      <span className="whitespace-nowrap text-[10px] font-bold sm:text-xs">Amor pela KA</span>
      <span className="rounded-full border border-pink-200 px-2 py-1 text-[9px] font-bold tabular-nums sm:px-2.5 sm:text-[11px]">
        {count === null ? "—" : new Intl.NumberFormat("pt-BR").format(count)}
      </span>
    </button>
  );
}
