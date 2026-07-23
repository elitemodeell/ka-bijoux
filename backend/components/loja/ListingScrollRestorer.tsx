"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MAX_SAVED_AGE_MS = 30 * 60 * 1000;

export default function ListingScrollRestorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    const key = `ka-bijoux:list-scroll:${pathname}${search ? `?${search}` : ""}`;
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return;

    let saved: { y?: number; savedAt?: number };
    try {
      saved = JSON.parse(raw) as { y?: number; savedAt?: number };
    } catch {
      window.sessionStorage.removeItem(key);
      return;
    }

    const targetY = Number(saved.y);
    const savedAt = Number(saved.savedAt);
    if (
      !Number.isFinite(targetY) ||
      targetY <= 0 ||
      !Number.isFinite(savedAt) ||
      Date.now() - savedAt > MAX_SAVED_AGE_MS
    ) {
      window.sessionStorage.removeItem(key);
      return;
    }

    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    let frame = 0;
    let attempts = 0;
    let settleTimer = 0;

    const restore = () => {
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (maxY >= targetY || attempts >= 20) {
        const finalY = Math.min(targetY, maxY);
        window.scrollTo({ top: finalY, behavior: "auto" });
        settleTimer = window.setTimeout(() => {
          window.scrollTo({ top: finalY, behavior: "auto" });
          window.sessionStorage.removeItem(key);
          window.history.scrollRestoration = previousRestoration;
        }, 120);
        return;
      }

      attempts += 1;
      frame = window.requestAnimationFrame(restore);
    };

    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(restore);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.history.scrollRestoration = previousRestoration;
    };
  }, [pathname, search]);

  return null;
}
