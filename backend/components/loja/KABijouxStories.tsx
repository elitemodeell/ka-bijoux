"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_STORY_COVER, type StoryGroup } from "@/types/stories";

const seenStorageKey = "ka-bijoux-seen-stories";

const fallbackGroups: StoryGroup[] = [
  {
    id: "demo-novidades",
    title: "Novidades",
    cover: "/images/stories/novidades-cover.jpg",
    isActive: true,
    sortOrder: 1,
    items: [
      {
        id: "demo-novidades-1",
        type: "video",
        src: "/videos/stories/novidade-1.mp4",
        mediaUrl: "/videos/stories/novidade-1.mp4",
        text: "Novidades escolhidas com carinho para voce.",
        isActive: true,
        sortOrder: 1,
      },
    ],
  },
  {
    id: "demo-promocoes",
    title: "Promoções",
    cover: "/images/stories/promocoes-cover.jpg",
    isActive: true,
    sortOrder: 2,
    items: [
      {
        id: "demo-promocoes-1",
        type: "video",
        src: "/videos/stories/promocao-1.mp4",
        mediaUrl: "/videos/stories/promocao-1.mp4",
        text: "Achadinhos especiais da KA Bijoux.",
        isActive: true,
        sortOrder: 1,
      },
      {
        id: "demo-promocoes-2",
        type: "video",
        src: "/videos/stories/promocao-2.mp4",
        mediaUrl: "/videos/stories/promocao-2.mp4",
        text: "Promoções para renovar o visual.",
        isActive: true,
        sortOrder: 2,
      },
    ],
  },
  {
    id: "demo-lancamentos",
    title: "Lançamentos",
    cover: "/images/stories/lancamentos-cover.jpg",
    isActive: true,
    sortOrder: 3,
    items: [
      {
        id: "demo-lancamentos-1",
        type: "video",
        src: "/videos/stories/lancamento-1.mp4",
        mediaUrl: "/videos/stories/lancamento-1.mp4",
        text: "Peças novas chegando na vitrine.",
        isActive: true,
        sortOrder: 1,
      },
    ],
  },
  {
    id: "demo-clientes",
    title: "Clientes",
    cover: "/images/stories/clientes-cover.jpg",
    isActive: true,
    sortOrder: 4,
    items: [
      {
        id: "demo-clientes-1",
        type: "video",
        src: "/videos/stories/cliente-1.mp4",
        mediaUrl: "/videos/stories/cliente-1.mp4",
        text: "Momentos de quem ama KA Bijoux.",
        isActive: true,
        sortOrder: 1,
      },
    ],
  },
];

function normalizeGroups(data: unknown): StoryGroup[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((group) => {
      if (!group || typeof group !== "object") return null;

      const storyGroup = group as StoryGroup;
      const items = Array.isArray(storyGroup.items)
        ? storyGroup.items
            .map((item) => ({
              ...item,
              src: item.src || item.mediaUrl,
              mediaUrl: item.mediaUrl || item.src,
            }))
            .filter((item) => Boolean(item.src || item.mediaUrl))
        : [];

      return {
        ...storyGroup,
        cover: storyGroup.cover || storyGroup.coverImageUrl || DEFAULT_STORY_COVER,
        items,
      };
    })
    .filter((group): group is StoryGroup => Boolean(group && group.items.length > 0));
}

export default function KABijouxStories() {
  const [groups, setGroups] = useState<StoryGroup[]>(fallbackGroups);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const timerRef = useRef<number | null>(null);
  const errorSkipTimeoutRef = useRef<number | null>(null);

  const visibleGroups = useMemo(
    () => groups.filter((group) => group.items.length > 0),
    [groups]
  );
  const activeGroup = activeGroupIndex !== null ? visibleGroups[activeGroupIndex] : null;
  const activeItem = activeGroup?.items[activeItemIndex] ?? null;

  useEffect(() => {
    const stored = window.localStorage.getItem(seenStorageKey);
    if (stored) {
      try {
        setSeenIds(new Set(JSON.parse(stored)));
      } catch {
        setSeenIds(new Set());
      }
    }
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadStories() {
      try {
        const res = await fetch("/api/stories", { cache: "no-store" });
        const json = await res.json();
        if (alive && res.ok) {
          const apiGroups = normalizeGroups(json.data);
          setGroups(apiGroups.length > 0 ? apiGroups : fallbackGroups);
        }
      } catch {
        if (alive) setGroups(fallbackGroups);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadStories();
    return () => {
      alive = false;
    };
  }, []);

  const markSeen = useCallback((groupId: string) => {
    setSeenIds((current) => {
      const next = new Set(current);
      next.add(groupId);
      window.localStorage.setItem(seenStorageKey, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const closeViewer = useCallback(() => {
    setActiveGroupIndex(null);
    setActiveItemIndex(0);
    setProgress(0);
    setMediaError(false);
  }, []);

  const goNext = useCallback(() => {
    setProgress(0);
    setMediaError(false);
    setActiveItemIndex((itemIndex) => {
      if (!activeGroup) return itemIndex;
      if (itemIndex < activeGroup.items.length - 1) return itemIndex + 1;

      setActiveGroupIndex((groupIndex) => {
        if (groupIndex === null) return null;
        const nextGroupIndex = groupIndex + 1;
        if (nextGroupIndex >= visibleGroups.length) return null;
        markSeen(visibleGroups[nextGroupIndex].id);
        return nextGroupIndex;
      });

      return 0;
    });
  }, [activeGroup, markSeen, visibleGroups]);

  const goPrevious = useCallback(() => {
    setProgress(0);
    setMediaError(false);
    setActiveItemIndex((itemIndex) => {
      if (itemIndex > 0) return itemIndex - 1;

      setActiveGroupIndex((groupIndex) => {
        if (groupIndex === null || groupIndex === 0) return groupIndex;
        const previousGroupIndex = groupIndex - 1;
        const previousGroup = visibleGroups[previousGroupIndex];
        setActiveItemIndex(Math.max(previousGroup.items.length - 1, 0));
        return previousGroupIndex;
      });

      return itemIndex;
    });
  }, [visibleGroups]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.cancelAnimationFrame(timerRef.current);
      if (errorSkipTimeoutRef.current) window.clearTimeout(errorSkipTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setProgress(0);
    setMediaError(false);
    if (errorSkipTimeoutRef.current) window.clearTimeout(errorSkipTimeoutRef.current);
  }, [activeGroupIndex, activeItemIndex]);

  useEffect(() => {
    if (!activeItem || (activeItem.type === "video" && !mediaError)) return;

    const duration = Math.max(activeItem.duration ?? 5, 1) * 1000;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const value = Math.min(((now - startedAt) / duration) * 100, 100);
      setProgress(value);
      if (value >= 100) {
        goNext();
        return;
      }
      timerRef.current = window.requestAnimationFrame(tick);
    };

    timerRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (timerRef.current) window.cancelAnimationFrame(timerRef.current);
    };
  }, [activeItem, mediaError, goNext]);

  useEffect(() => {
    if (!mediaError || !activeItem) return;

    errorSkipTimeoutRef.current = window.setTimeout(() => {
      goNext();
    }, 1100);

    return () => {
      if (errorSkipTimeoutRef.current) window.clearTimeout(errorSkipTimeoutRef.current);
    };
  }, [activeItem, goNext, mediaError]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeViewer();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrevious();
    }

    if (activeGroup) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeGroup, closeViewer, goNext, goPrevious]);

  if (!loading && visibleGroups.length === 0) return null;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-0 pb-5 pt-2 sm:px-6 sm:pb-7 sm:pt-3">
        <div className="overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-start gap-4 sm:justify-center sm:gap-6">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="w-[74px] shrink-0 animate-pulse">
                    <div className="mx-auto h-16 w-16 rounded-full bg-pink-100" />
                    <div className="mx-auto mt-2 h-2.5 w-12 rounded-full bg-pink-50" />
                  </div>
                ))
              : visibleGroups.map((group, index) => {
                  const seen = seenIds.has(group.id);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => {
                        setActiveGroupIndex(index);
                        setActiveItemIndex(0);
                        markSeen(group.id);
                      }}
                      className="group w-[74px] shrink-0 text-center outline-none"
                      aria-label={`Abrir story ${group.title}`}
                    >
                      <span
                        className={`mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full p-[3px] transition-transform duration-200 group-hover:scale-[1.04] ${
                          seen
                            ? "bg-gray-200"
                            : "bg-gradient-to-tr from-pink-500 via-fuchsia-400 to-purple-600 shadow-[0_8px_24px_rgba(255,77,109,0.20)]"
                        }`}
                      >
                        <span className="block h-full w-full overflow-hidden rounded-full border-2 border-white bg-pink-50">
                          <StoryCover src={group.cover || DEFAULT_STORY_COVER} title={group.title} />
                        </span>
                      </span>
                      <span
                        className={`mt-2 block truncate text-[11px] font-semibold leading-tight ${
                          seen ? "text-gray-400" : "text-gray-700"
                        }`}
                      >
                        {group.title}
                      </span>
                    </button>
                  );
                })}
          </div>
        </div>
      </div>

      {activeGroup && activeItem && (
        <div className="fixed inset-0 z-[90] bg-black text-white">
          <div className="absolute inset-x-0 top-0 z-20 px-3 pt-3 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
            <div className="flex gap-1">
              {activeGroup.items.map((item, index) => (
                <span key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                  <span
                    className="block h-full rounded-full bg-white transition-[width] duration-100"
                    style={{
                      width:
                        index < activeItemIndex
                          ? "100%"
                          : index === activeItemIndex
                            ? `${progress}%`
                            : "0%",
                    }}
                  />
                </span>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src={activeGroup.cover || DEFAULT_STORY_COVER}
                  alt=""
                  className="h-8 w-8 rounded-full border border-white/40 object-cover"
                />
                <span className="truncate text-sm font-semibold">{activeGroup.title}</span>
              </div>
              <button
                type="button"
                onClick={closeViewer}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white backdrop-blur transition-colors hover:bg-white/20"
                aria-label="Fechar story"
              >
                x
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={goPrevious}
            className="absolute left-0 top-0 z-10 h-full w-1/2"
            aria-label="Story anterior"
          />
          <button
            type="button"
            onClick={goNext}
            className="absolute right-0 top-0 z-10 h-full w-1/2"
            aria-label="Proximo story"
          />

          <div className="relative z-0 flex h-full w-full items-center justify-center">
            <div className="relative h-full w-full overflow-hidden bg-[#10070c] sm:h-[86vh] sm:max-h-[780px] sm:w-[430px] sm:rounded-[28px] sm:border sm:border-white/10">
              {mediaError || !activeItem.src ? (
                <StoryFallback title={activeGroup.title} text={activeItem.text} />
              ) : activeItem.type === "video" ? (
                <video
                  key={activeItem.id}
                  src={activeItem.src}
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                  onEnded={goNext}
                  onError={() => setMediaError(true)}
                  onTimeUpdate={(event) => {
                    const video = event.currentTarget;
                    if (video.duration > 0) setProgress((video.currentTime / video.duration) * 100);
                  }}
                />
              ) : (
                <img
                  key={activeItem.id}
                  src={activeItem.src}
                  alt={activeItem.text || activeGroup.title}
                  className="h-full w-full object-cover"
                  loading="eager"
                  onError={() => setMediaError(true)}
                />
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-6 pb-8 pt-28">
                {(activeItem.text || activeItem.linkUrl) && (
                  <div className="pointer-events-auto mx-auto max-w-sm text-center">
                    {activeItem.text && (
                      <p className="mb-4 text-xl font-semibold leading-snug text-white drop-shadow-sm">
                        {activeItem.text}
                      </p>
                    )}
                    {activeItem.linkUrl && (
                      <a
                        href={activeItem.linkUrl}
                        className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-pink-600 shadow-[0_14px_36px_rgba(0,0,0,0.28)] transition-transform hover:scale-[1.03]"
                      >
                        {activeItem.buttonText || "Ver agora"}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StoryCover({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <img
      src={failed ? DEFAULT_STORY_COVER : src}
      alt={title}
      loading="lazy"
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function StoryFallback({ title, text }: { title: string; text?: string | null }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#1d0710] via-[#351029] to-[#120710] px-8 text-center">
      <img
        src={DEFAULT_STORY_COVER}
        alt=""
        className="mb-6 h-28 w-28 rounded-full border border-white/15 object-contain p-3"
      />
      <p className="text-2xl font-bold text-white">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        {text || "Conteúdo em preparação. Volte em instantes para ver a novidade."}
      </p>
    </div>
  );
}
