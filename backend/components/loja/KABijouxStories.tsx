"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_STORY_COVER, type StoryGroup, type StoryItem } from "@/types/stories";

const seenStorageKey = "ka-bijoux-seen-stories";
const storyLogo = "/images/brand/ka-bijoux-logo-story-icon.png";
const storyHeaderLogo = "/images/brand/ka-bijoux-logo-header-640.png";
const storyHighlightCovers = {
  novidades: "/images/stories/highlights/novidades.jpg",
  promocoes: "/images/stories/highlights/promocoes.jpg",
  lancamentos: "/images/stories/highlights/lancamentos.jpg",
  clientes: "/images/stories/highlights/clientes.jpg",
  ofertas: "/images/stories/highlights/ofertas.jpg",
} as const;
const storyHighlightCoverEntries = Object.entries(storyHighlightCovers);

const fallbackGroups: StoryGroup[] = [
  {
    id: "demo-novidades",
    title: "Novidades",
    cover: storyHighlightCovers.novidades,
    isActive: true,
    sortOrder: 1,
    items: [
      createStoryImage("demo-novidades-1", "/images/stories/demo-ka-bijoux/story-whatsapp-image-01.jpeg", 1),
      createStoryVideo("demo-novidades-2", "/videos/stories/demo-ka-bijoux/story-whatsapp-video-01.mp4", 2),
    ],
  },
  {
    id: "demo-promocoes",
    title: "Promoções",
    cover: storyHighlightCovers.promocoes,
    isActive: true,
    sortOrder: 2,
    items: [
      createStoryImage("demo-promocoes-1", "/images/stories/demo-ka-bijoux/story-whatsapp-image-02.jpeg", 1),
      createStoryVideo("demo-promocoes-2", "/videos/stories/demo-ka-bijoux/story-whatsapp-video-02.mp4", 2),
    ],
  },
  {
    id: "demo-lancamentos",
    title: "Lançamentos",
    cover: storyHighlightCovers.lancamentos,
    isActive: true,
    sortOrder: 3,
    items: [
      createStoryVideo("demo-lancamentos-1", "/videos/stories/demo-ka-bijoux/story-whatsapp-video-03.mp4", 1),
    ],
  },
  {
    id: "demo-clientes",
    title: "Clientes",
    cover: storyHighlightCovers.clientes,
    isActive: true,
    sortOrder: 4,
    items: [
      createStoryVideo("demo-clientes-1", "/videos/stories/demo-ka-bijoux/story-whatsapp-video-04.mp4", 1),
    ],
  },
  {
    id: "demo-ofertas",
    title: "Ofertas",
    cover: storyHighlightCovers.ofertas,
    isActive: true,
    sortOrder: 5,
    items: [
      createStoryVideo("demo-ofertas-1", "/videos/stories/demo-ka-bijoux/story-whatsapp-video-05.mp4", 1),
    ],
  },
];

function createStoryImage(id: string, src: string, sortOrder: number) {
  return {
    id,
    type: "image" as const,
    src,
    mediaUrl: src,
    duration: 5,
    isActive: true,
    sortOrder,
  };
}

function createStoryVideo(id: string, src: string, sortOrder: number) {
  return {
    id,
    type: "video" as const,
    src,
    mediaUrl: src,
    isActive: true,
    sortOrder,
  };
}

type StoryCoverMedia = {
  type: StoryItem["type"];
  src: string;
  poster?: string | null;
  fallbackSrc: string;
};

type StoryItemWithCoverMeta = StoryItem & {
  poster?: string | null;
  posterUrl?: string | null;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
};

function normalizeStoryKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getStoryHighlightCover(group: Pick<StoryGroup, "id" | "title">) {
  const titleKey = normalizeStoryKey(group.title);
  const idKey = normalizeStoryKey(group.id);
  const match = storyHighlightCoverEntries.find(
    ([key]) => titleKey.includes(key) || idKey.includes(key)
  );

  return match?.[1] ?? null;
}

function getStoryItemSrc(item: StoryItem) {
  return item.src || item.mediaUrl || "";
}

function getStoryItemPoster(item: StoryItem) {
  const media = item as StoryItemWithCoverMeta;
  return media.posterUrl || media.poster || media.thumbnailUrl || media.thumbnail || null;
}

function isLogoCover(src: string) {
  return src === storyLogo || src === DEFAULT_STORY_COVER;
}

function storyCoverImageClassName(src: string) {
  return `h-full w-full ${isLogoCover(src) ? "object-contain p-2" : "object-cover"}`;
}

function getStoryCoverMedia(group: StoryGroup): StoryCoverMedia {
  const highlightCover = getStoryHighlightCover(group);

  if (highlightCover) {
    return {
      type: "image",
      src: highlightCover,
      fallbackSrc: DEFAULT_STORY_COVER,
    };
  }

  const fallbackSrc = group.cover || group.coverImageUrl || DEFAULT_STORY_COVER;
  const validItems = group.items.filter((item) => Boolean(getStoryItemSrc(item)));
  const lastItem = validItems[validItems.length - 1];

  if (!lastItem) {
    return {
      type: "image",
      src: fallbackSrc,
      fallbackSrc: DEFAULT_STORY_COVER,
    };
  }

  return {
    type: lastItem.type,
    src: getStoryItemSrc(lastItem),
    poster: getStoryItemPoster(lastItem),
    fallbackSrc,
  };
}

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
        cover:
          getStoryHighlightCover(storyGroup) ||
          storyGroup.cover ||
          storyGroup.coverImageUrl ||
          storyLogo,
        items,
      };
    })
    .filter((group): group is StoryGroup => Boolean(group && group.items.length > 0));
}

export default function KABijouxStories() {
  const [groups, setGroups] = useState<StoryGroup[]>(fallbackGroups);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryGroup | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const timerRef = useRef<number | null>(null);
  const errorSkipTimeoutRef = useRef<number | null>(null);

  const visibleGroups = useMemo(
    () => groups.filter((group) => group.items.length > 0),
    [groups]
  );
  const allStoriesItems = useMemo<StoryItem[]>(
    () => visibleGroups.flatMap((group) => group.items),
    [visibleGroups]
  );
  const activeGroup = activeStoryGroup;
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

  const openGroup = useCallback(
    (index: number) => {
      const group = visibleGroups[index];
      if (!group) return;

      setActiveStoryGroup(group);
      setActiveItemIndex(0);
      markSeen(group.id);
    },
    [markSeen, visibleGroups]
  );

  const openAllStories = useCallback(() => {
    if (allStoriesItems.length === 0) return;

    setActiveStoryGroup({
      id: "all-demo-stories",
      title: "KA Bijoux",
      cover: storyLogo,
      isActive: true,
      sortOrder: 0,
      items: allStoriesItems,
    });
    setActiveItemIndex(0);
    visibleGroups.forEach((group) => markSeen(group.id));
  }, [allStoriesItems, markSeen, visibleGroups]);

  const closeViewer = useCallback(() => {
    setActiveStoryGroup(null);
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
      setActiveStoryGroup(null);
      return 0;
    });
  }, [activeGroup]);

  const goPrevious = useCallback(() => {
    setProgress(0);
    setMediaError(false);
    setActiveItemIndex((itemIndex) => {
      if (itemIndex > 0) return itemIndex - 1;

      return itemIndex;
    });
  }, []);

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
  }, [activeStoryGroup, activeItemIndex]);

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
    <section className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-x-0 top-10 z-0 mx-auto h-56 max-w-[440px]" aria-hidden="true">
        <span
          className="ka-header-sparkle"
          style={{ left: "13%", top: "28%", animationDelay: "1.1s", animationDuration: "6.4s" }}
        />
        <span
          className="ka-header-sparkle"
          style={{ left: "24%", top: "70%", animationDelay: "2.3s", animationDuration: "7.1s" }}
        />
        <span
          className="ka-header-glint"
          style={{ left: "50%", top: "18%", animationDelay: "1.9s", animationDuration: "7.4s" }}
        />
        <span
          className="ka-header-sparkle"
          style={{ left: "67%", top: "74%", animationDelay: "4.2s", animationDuration: "6.9s" }}
        />
        <span
          className="ka-header-sparkle"
          style={{ left: "83%", top: "38%", animationDelay: "3.4s", animationDuration: "7s" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-6 pt-4 text-center sm:pb-8 sm:pt-6">
        <button
          type="button"
          onClick={openAllStories}
          disabled={loading || allStoriesItems.length === 0}
          className="group mx-auto block text-center outline-none disabled:cursor-default"
          aria-label="Abrir Stories KA Bijoux"
        >
          <span className="mx-auto flex h-[178px] w-[178px] items-center justify-center rounded-full bg-[conic-gradient(from_210deg,#ec4899,#d946ef,#fb7185,#fb923c,#ec4899)] p-1.5 shadow-[0_18px_50px_rgba(236,72,153,0.22)] transition-transform duration-200 group-hover:scale-[1.02] sm:h-[210px] sm:w-[210px]">
            <span className="flex h-full w-full items-center justify-center rounded-full border-[6px] border-white bg-white p-5 shadow-inner">
              <picture>
                <source srcSet="/images/brand/ka-bijoux-logo-header-640.webp" type="image/webp" />
                <img
                  src={storyHeaderLogo}
                  alt="KA Bijoux"
                  className="h-auto w-full max-w-[150px] object-contain sm:max-w-[178px]"
                />
              </picture>
            </span>
          </span>
          <span className="mt-3 block text-sm font-semibold text-pink-500">
            Ver Stories
          </span>
          <span className="mt-1 block text-xs font-medium text-gray-500">
            Toque para ver nossas novidades
          </span>
        </button>

        <div className="mt-5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-start gap-4 px-1 sm:justify-center sm:gap-6">
            {loading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="w-[74px] shrink-0 animate-pulse">
                    <div className="mx-auto h-16 w-16 rounded-full bg-pink-100" />
                    <div className="mx-auto mt-2 h-2.5 w-12 rounded-full bg-pink-50" />
                  </div>
                ))
              : visibleGroups.map((group, index) => {
                  const coverMedia = getStoryCoverMedia(group);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => openGroup(index)}
                      className="group w-[74px] shrink-0 text-center outline-none"
                      aria-label={`Abrir story ${group.title}`}
                    >
                      <span className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[conic-gradient(from_210deg,#ec4899,#d946ef,#fb7185,#fb923c,#ec4899)] p-[3px] shadow-[0_8px_24px_rgba(255,77,109,0.20)] transition-transform duration-200 group-hover:scale-[1.04]">
                        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white">
                          <StoryCover media={coverMedia} title={group.title} />
                        </span>
                      </span>
                      <span className="mt-2 block truncate text-[11px] font-semibold leading-tight text-gray-700">
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
                  src={storyLogo}
                  alt=""
                  className="h-8 w-8 rounded-full border border-white/40 bg-white object-contain p-1"
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
                <StoryFallback title={activeGroup.title} />
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
                  alt={activeGroup.title}
                  className="h-full w-full object-cover"
                  loading="eager"
                  onError={() => setMediaError(true)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StoryCover({ media, title }: { media: StoryCoverMedia; title: string }) {
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(media.type !== "video");

  useEffect(() => {
    setFailed(false);
    setPosterFailed(false);
    setVideoReady(media.type !== "video");
  }, [media.poster, media.src, media.type]);

  if (failed) {
    const fallbackSrc = media.fallbackSrc || DEFAULT_STORY_COVER;

    return (
      <img
        src={fallbackSrc}
        alt={title}
        loading="lazy"
        className={storyCoverImageClassName(fallbackSrc)}
        onError={() => {
          if (fallbackSrc !== DEFAULT_STORY_COVER) setFailed(true);
        }}
      />
    );
  }

  if (media.type === "image" || (media.poster && !posterFailed)) {
    const coverSrc = media.type === "video" ? media.poster || media.src : media.src;

    return (
      <img
        src={coverSrc}
        alt={title}
        loading="lazy"
        className={storyCoverImageClassName(coverSrc)}
        onError={() => {
          if (media.type === "video" && media.poster) {
            setPosterFailed(true);
            return;
          }
          setFailed(true);
        }}
      />
    );
  }

  const fallbackSrc = media.fallbackSrc || DEFAULT_STORY_COVER;

  return (
    <span className="relative block h-full w-full overflow-hidden rounded-full bg-pink-50">
      <img
        src={fallbackSrc}
        alt=""
        loading="lazy"
        className={`absolute inset-0 transition-opacity duration-300 ${storyCoverImageClassName(fallbackSrc)} ${
          videoReady ? "opacity-0" : "opacity-100"
        }`}
        onError={() => setFailed(true)}
      />
      <video
        src={media.src}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        className={`h-full w-full object-cover transition-opacity duration-300 ${videoReady ? "opacity-100" : "opacity-0"}`}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          try {
            if (video.duration > 0 && video.currentTime < 0.05) video.currentTime = 0.05;
          } catch {
            setVideoReady(true);
          }
        }}
        onLoadedData={() => setVideoReady(true)}
        onSeeked={() => setVideoReady(true)}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

function StoryFallback({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#1d0710] via-[#351029] to-[#120710] px-8 text-center">
      <img
        src={storyLogo}
        alt=""
        className="mb-6 h-28 w-28 rounded-full border border-white/15 bg-white object-contain p-3"
      />
      <p className="text-2xl font-bold text-white">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        Conteúdo indisponível. Pulando para o próximo story.
      </p>
    </div>
  );
}
