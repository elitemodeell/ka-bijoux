"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const STORAGE_KEY = "ka-product-favorites-v1";
type FavoriteIndex = Map<string, string>;

let sessionRequest: Promise<{ token: string; userId: string } | null> | null = null;
const favoriteIndexByUser = new Map<string, FavoriteIndex>();
const favoriteRequestByUser = new Map<string, Promise<FavoriteIndex>>();

function getSessionOnce() {
  if (!sessionRequest) {
    try {
      sessionRequest = getSupabaseBrowserClient().auth.getSession()
        .then(({ data }) => data.session ? { token: data.session.access_token, userId: data.session.user.id } : null)
        .catch(() => null)
        .finally(() => { sessionRequest = null; });
    } catch {
      sessionRequest = Promise.resolve(null).finally(() => { sessionRequest = null; });
    }
  }
  return sessionRequest;
}

function readGuestFavorites() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return new Set<string>(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

async function loadFavoriteIndex(userId: string, token: string) {
  const cached = favoriteIndexByUser.get(userId);
  if (cached) return cached;
  const pending = favoriteRequestByUser.get(userId);
  if (pending) return pending;
  const request = fetch("/api/customers/me/favorites", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).then(async (response) => {
    if (!response.ok) throw new Error("Não foi possível carregar favoritos");
    const payload = await response.json();
    const index = new Map<string, string>();
    for (const favorite of payload.data ?? []) {
      if (typeof favorite.id === "string" && typeof favorite.favoriteId === "string") index.set(favorite.id, favorite.favoriteId);
    }
    favoriteIndexByUser.set(userId, index);
    return index;
  }).finally(() => favoriteRequestByUser.delete(userId));
  favoriteRequestByUser.set(userId, request);
  return request;
}

export default function ProductFavoriteButton({ productId, productName }: { productId: string; productName: string }) {
  const [favorite, setFavorite] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const session = await getSessionOnce();
      if (!active) return;
      if (!session) {
        setFavorite(readGuestFavorites().has(productId));
        return;
      }
      try {
        const index = await loadFavoriteIndex(session.userId, session.token);
        if (active) setFavorite(index.has(productId));
      } catch {
        if (active) setFavorite(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [productId]);

  async function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    const previous = favorite;
    setFavorite(!previous);
    try {
      const session = await getSessionOnce();
      if (!session) {
        const favorites = readGuestFavorites();
        if (previous) favorites.delete(productId); else favorites.add(productId);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
        window.dispatchEvent(new CustomEvent("ka:product-favorites-updated", { detail: [...favorites] }));
        return;
      }

      const index = await loadFavoriteIndex(session.userId, session.token);
      const existingId = index.get(productId);
      if (existingId) {
        const response = await fetch(`/api/customers/me/favorites/${encodeURIComponent(existingId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (!response.ok) throw new Error("Não foi possível remover favorito");
        index.delete(productId);
      } else {
        const response = await fetch("/api/customers/me/favorites", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (!response.ok) throw new Error("Não foi possível salvar favorito");
        const payload = await response.json();
        if (typeof payload.data?.id === "string") index.set(productId, payload.data.id);
        else favoriteIndexByUser.delete(session.userId);
      }
      setFavorite(!existingId);
    } catch {
      setFavorite(previous);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={favorite ? `Remover ${productName} dos favoritos` : `Adicionar ${productName} aos favoritos`}
      aria-pressed={favorite}
      className="absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-rose-600 shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-70"
    >
      <svg viewBox="0 0 24 24" className={`h-[19px] w-[19px] ${favorite ? "fill-rose-500" : "fill-transparent"}`} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    </button>
  );
}
