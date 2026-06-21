"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TouchEvent } from "react";
import Link from "next/link";
import { DEFAULT_STORY_COVER, type StoryGroup, type StoryItem } from "@/types/stories";
import {
  copaBannerHref,
  copaBannerImage,
} from "@/lib/campaign-media";

const seenStorageKey = "ka-bijoux-seen-stories";
const storyLogo = "/images/brand/ka-bijoux-logo-story-icon.png";
const HERO_IMAGE_DURATION = 3000;
const storyHighlightCovers = {
  novidades: "/images/stories/highlights/novidades.jpg",
  promocoes: "/images/stories/highlights/promocoes.jpg",
  lancamentos: "/images/stories/highlights/lancamentos.jpg",
  clientes: "/images/stories/highlights/clientes.jpg",
  ofertas: "/images/stories/highlights/ofertas.jpg",
} as const;
const storyHighlightCoverEntries = Object.entries(storyHighlightCovers);

const heroSlides = [
  {
    title: "Copa do Prazer",
    subtitle: "Produtos que vão elevar a sua experiência.",
    cta: "Quero Aproveitar",
    href: "/categoria/sex-shop",
    image: "/banners/banner-copa-do-prazer-2.png",
    mobileImage: "/banners/banner-copa-do-prazer-2026-vertical.jpg",
    objectPosition: "center",
  },
  {
    title: "Novidades KA Bijoux",
    subtitle: "Os acessórios que estão conquistando Itaúna.",
    cta: "Ver Novidades",
    href: "/produtos?new=true",
    image: "/banners/banner-ka-bijoux-novidades.png",
    mobileImage: "/banners/mobile/banner-ka-bijoux-novidades-mobile.png",
    objectPosition: "center",
  },
  {
    title: "Lançamentos Lingerie",
    subtitle: "Lingeries que despertam desejos.",
    cta: "Ver Lingerie",
    href: "/categoria/lingerie",
    image: "/banners/banner-lingeries-desejos.png",
    mobileImage: "/banners/mobile/banner-lingeries-desejos-mobile-modelos.jpg",
    objectPosition: "center",
  },
  {
    title: "Promoções Especiais",
    subtitle: "Ofertas imperdíveis para você aproveitar agora.",
    cta: "Ver Promoções",
    href: "/categoria/sex-shop/geis-e-cremes",
    image: "/banners/banner-close-love-oferta.png",
    mobileImage: "/banners/mobile/banner-close-love-oferta-mobile.png",
    objectPosition: "center",
  },
];

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
        const res = await fetch("/api/stories");
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

      <div className="relative z-10 pb-10 pt-0 sm:pb-12 sm:pt-3">
        <MainHeroCarousel />
        <StorySpotlight
          groups={visibleGroups}
          loading={loading}
          onOpenGroup={openGroup}
          seenIds={seenIds}
        />
        <CopaDoPrazerBanner />
        <CopaPromoStrip />
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

type StorySpotlightProps = {
  groups: StoryGroup[];
  loading: boolean;
  onOpenGroup: (index: number) => void;
  seenIds: Set<string>;
};

function StorySpotlight({ groups, loading, onOpenGroup, seenIds }: StorySpotlightProps) {
  return (
    <section className="mx-auto mt-4 max-w-7xl px-4 sm:mt-6 sm:px-6" aria-label="Stories KA Bijoux">
      <div className="relative overflow-hidden rounded-[28px] border border-pink-100/80 bg-gradient-to-br from-white via-pink-50 to-rose-50 p-4 shadow-[0_18px_54px_rgba(255,77,109,0.14)] sm:p-5 lg:p-6">
        <span className="ka-story-spotlight-shine" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[#f9d976]/25 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-20 left-8 h-40 w-40 rounded-full bg-pink-300/22 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-7">
          <div className="text-center lg:w-[310px] lg:shrink-0 lg:text-left">
            <p className="ka-story-attention-label mx-auto inline-flex items-center justify-center rounded-full border border-pink-200/80 bg-white/88 px-4 py-2 text-[12px] font-black uppercase tracking-[0.16em] text-pink-600 shadow-sm backdrop-blur lg:mx-0">
              ✨ VEJA NOSSOS STORIES
            </p>
            <p className="mx-auto mt-3 max-w-[300px] text-sm font-semibold leading-relaxed text-gray-700 lg:mx-0">
              Arraste para o lado e descubra novidades, promoções e lançamentos.
            </p>
            <span className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-600 to-pink-400 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-white shadow-[0_12px_26px_rgba(236,72,153,0.24)] lg:mx-0">
              Arraste
              <span className="ka-story-arrow text-lg leading-none" aria-hidden="true">→</span>
            </span>
          </div>

          <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-1">
            <div className="flex min-w-max snap-x snap-mandatory items-start gap-5 px-1 sm:gap-7 lg:min-w-0 lg:justify-center">
              {loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="w-[88px] shrink-0 animate-pulse text-center sm:w-[96px]">
                      <div className="mx-auto h-20 w-20 rounded-full bg-pink-100 sm:h-24 sm:w-24" />
                      <div className="mx-auto mt-3 h-3 w-16 rounded-full bg-pink-100/80" />
                    </div>
                  ))
                : groups.map((group, index) => {
                    const coverMedia = getStoryCoverMedia(group);
                    const hasSeen = seenIds.has(group.id);

                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => onOpenGroup(index)}
                        className="group w-[88px] shrink-0 snap-start text-center outline-none sm:w-[96px]"
                        aria-label={`Abrir story ${group.title}`}
                      >
                        <span
                          className={`ka-story-ring mx-auto flex h-20 w-20 items-center justify-center rounded-full p-[4px] transition-transform duration-300 group-hover:scale-[1.04] sm:h-24 sm:w-24 ${
                            hasSeen ? "ka-story-ring-seen" : "ka-story-ring-unseen"
                          }`}
                        >
                          <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.78)]">
                            <StoryCover media={coverMedia} title={group.title} />
                          </span>
                        </span>
                        <span className="mt-3 block truncate text-[12px] font-bold leading-tight text-gray-800 sm:text-[13px]">
                          {group.title}
                        </span>
                      </button>
                    );
                  })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CopaDoPrazerBanner() {
  return (
    <section className="mx-auto mt-6 max-w-7xl px-4 sm:mt-8 sm:px-6" aria-label="Copa do Prazer">
      <Link href={copaBannerHref} className="group block" aria-label="Copa do Prazer 2026 — Quero aproveitar">
        <div className="overflow-hidden rounded-[28px] shadow-[0_24px_70px_rgba(236,72,153,0.20)] transition-transform duration-300 group-hover:scale-[1.005]">
          {/* portrait image: full height on mobile, capped on desktop */}
          <img
            src={copaBannerImage}
            alt="Copa do Prazer 2026 — Promoções campeãs para você aproveitar"
            loading="eager"
            decoding="async"
            className="w-full object-cover object-top sm:max-h-[600px] lg:max-h-[700px]"
          />
        </div>
      </Link>
    </section>
  );
}

function CopaPromoStrip() {
  return (
    <section className="mx-auto mt-4 max-w-7xl px-4 sm:mt-5 sm:px-6" aria-label="Campeões de vendas">
      <Link
        href={copaBannerHref}
        className="ka-copa-promo-strip group flex flex-col gap-4 rounded-[24px] bg-gradient-to-r from-pink-700 via-pink-500 to-pink-400 p-5 text-white shadow-[0_20px_54px_rgba(236,72,153,0.24)] sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <span className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/12 text-4xl shadow-inner backdrop-blur" aria-hidden="true">
            🏆
          </span>
          <span>
            <span className="block text-xl font-black uppercase leading-tight sm:text-2xl">
              A COPA DO PRAZER JÁ COMEÇOU!
            </span>
            <span className="mt-1 block text-sm font-semibold text-yellow-100 sm:text-base">
              Confira nossos campeões de vendas
            </span>
          </span>
        </span>
        <span className="ka-btn inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-pink-600 shadow-[0_14px_30px_rgba(0,0,0,0.14)] sm:min-w-[190px]">
          EU QUERO
          <span className="text-xl leading-none transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
        </span>
      </Link>
    </section>
  );
}

function MainHeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const goToSlide = useCallback((index: number) => {
    setActiveSlide((index + heroSlides.length) % heroSlides.length);
  }, []);

  const goNextSlide = useCallback(() => {
    setActiveSlide((current) => (current + 1) % heroSlides.length);
  }, []);

  const goPreviousSlide = useCallback(() => {
    setActiveSlide((current) => (current - 1 + heroSlides.length) % heroSlides.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timeout = window.setTimeout(goNextSlide, HERO_IMAGE_DURATION);
    return () => window.clearTimeout(timeout);
  }, [activeSlide, goNextSlide, paused]);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
    setPaused(true);
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    touchDeltaX.current = (event.touches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
  }

  function handleTouchEnd() {
    if (Math.abs(touchDeltaX.current) > 40) {
      if (touchDeltaX.current < 0) goNextSlide();
      else goPreviousSlide();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setTimeout(() => setPaused(false), 1000);
  }

  return (
    <div className="px-2 pt-2 pb-0 sm:px-4">
      <div
        className="relative overflow-hidden rounded-[24px] shadow-[0_8px_32px_rgba(236,72,153,0.18)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex aspect-[4/5] transition-transform duration-500 ease-out sm:aspect-[16/7] lg:aspect-[16/6]"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          {heroSlides.map((slide, index) => (
            <Link
              key={slide.title}
              href={slide.href}
              className="relative block h-full min-w-full overflow-hidden bg-pink-50 text-left"
              aria-label={slide.title}
              tabIndex={index === activeSlide ? 0 : -1}
            >
              <picture className="block h-full w-full">
                <source media="(max-width: 639px)" srcSet={slide.mobileImage} />
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="h-full w-full object-cover"
                  style={{ objectPosition: slide.objectPosition }}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              </picture>

              <span className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black/45 via-black/12 to-transparent sm:h-28" aria-hidden="true" />

              <span className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-2 px-4 pb-4 sm:px-5 sm:pb-4">
                <span className="flex flex-col gap-0.5">
                  <span className="text-xs font-black text-white drop-shadow-md sm:text-sm line-clamp-1">
                    {slide.title}
                  </span>
                  {slide.subtitle && (
                    <span className="hidden text-[11px] font-medium text-white/80 drop-shadow sm:block sm:text-xs line-clamp-1">
                      {slide.subtitle}
                    </span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-gradient-to-r from-pink-600 to-pink-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white shadow-[0_4px_16px_rgba(236,72,153,0.5)] sm:px-5 sm:py-2 sm:text-xs">
                  {slide.cta}
                </span>
              </span>
            </Link>
          ))}
        </div>

        {/* dot indicators */}
        <div className="absolute inset-x-0 bottom-2.5 z-40 flex items-center justify-center gap-1.5">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={(e) => { e.preventDefault(); goToSlide(index); }}
              className={`transition-all duration-300 rounded-full ${
                index === activeSlide
                  ? "h-1.5 w-5 bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.7)]"
                  : "h-1.5 w-1.5 bg-white/70 hover:bg-white"
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
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
        preload="none"
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
