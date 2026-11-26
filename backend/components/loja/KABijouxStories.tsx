"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TouchEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { DEFAULT_STORY_COVER, type StoryGroup, type StoryItem } from "@/types/stories";
import { STORY_CATEGORY_LABELS, type StoryCategory } from "@/types/stories";
import { HOME_BENEFITS, type HomePresentation } from "@/lib/home-content";
import StoreLoveButton from "@/components/loja/StoreLoveButton";

const seenStorageKey = "ka-bijoux-seen-stories";
const storyLogo = "/images/brand/ka-bijoux-logo-story-icon.png";
const HERO_IMAGE_DURATION = 5000;
const storyCategories: StoryCategory[] = ["OFFICIAL", "CUSTOMER", "REVIEW", "HIGHLIGHT"];

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
        cover: storyGroup.cover || storyGroup.coverImageUrl || storyLogo,
        items,
      };
    })
    .filter((group): group is StoryGroup => Boolean(group && group.items.length > 0));
}

export default function KABijouxStories({ presentation }: { presentation: HomePresentation }) {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryGroup | null>(null);
  const [emptyStoryCategory, setEmptyStoryCategory] = useState<StoryCategory | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const timerRef = useRef<number | null>(null);
  const errorSkipTimeoutRef = useRef<number | null>(null);

  const visibleGroups = groups;
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
          setGroups(normalizeGroups(json.data));
        }
      } catch {
        if (alive) setGroups([]);
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

  const openCategory = useCallback(
    (category: StoryCategory) => {
      const categoryGroups = visibleGroups.filter((group) => group.category === category);
      const items = categoryGroups.flatMap((group) => group.items);
      if (!items.length) {
        setEmptyStoryCategory(category);
        return;
      }

      const first = categoryGroups[0];
      setEmptyStoryCategory(null);
      setActiveStoryGroup({
        ...first,
        id: `category-${category}`,
        title: STORY_CATEGORY_LABELS[category],
        items,
      });
      setActiveItemIndex(0);
      categoryGroups.forEach((group) => markSeen(group.id));
    },
    [markSeen, visibleGroups]
  );

  const closeViewer = useCallback(() => {
    setActiveStoryGroup(null);
    setEmptyStoryCategory(null);
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
        <SexShopMobileAccess />
        <MainHeroCarousel slides={presentation.banners} />
        <ChristmasBenefits />
        <StorySpotlight
          groups={visibleGroups}
          loading={loading}
          onOpenCategory={openCategory}
          seenIds={seenIds}
        />
        {presentation.seasonalDecoration ? <ChristmasDivider /> : null}
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
          {activeGroup.review ? (
            <div className="pointer-events-none absolute inset-x-4 bottom-7 z-[5] mx-auto max-w-md rounded-2xl border border-white/15 bg-black/60 p-4 text-white backdrop-blur-sm">
              <p className="text-sm tracking-widest text-amber-300" aria-label={`${activeGroup.review.rating} de 5 estrelas`}>
                {"★".repeat(activeGroup.review.rating)}{"☆".repeat(5 - activeGroup.review.rating)}
              </p>
              {activeGroup.review.comment ? <p className="mt-1 text-sm leading-relaxed">“{activeGroup.review.comment}”</p> : null}
              <p className="mt-2 text-xs text-pink-100">{activeGroup.review.customerName} · Compra verificada · {activeGroup.review.productName}</p>
            </div>
          ) : null}
        </div>
      )}
      {emptyStoryCategory && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-5" role="dialog" aria-modal="true" aria-labelledby="empty-story-title">
          <div className="relative w-full max-w-sm rounded-3xl border border-pink-100 bg-gradient-to-br from-white via-[#fff8fb] to-[#fff0f6] px-6 pb-7 pt-8 text-center shadow-2xl">
            <button type="button" onClick={() => setEmptyStoryCategory(null)} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-pink-600 shadow" aria-label="Fechar">×</button>
            <img src={storyLogo} alt="" className="mx-auto h-16 w-16 object-contain" />
            <h2 id="empty-story-title" className="mt-3 font-playfair text-2xl font-bold text-[#7c1534]">{STORY_CATEGORY_LABELS[emptyStoryCategory]}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">Ainda não há conteúdo publicado nesta seção. Volte em breve para conferir as novidades da KA Bijoux.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function SexShopMobileAccess() {
  return (
    <section className="mx-auto mb-3 mt-2 w-full px-1.5 sm:hidden" aria-label="Acesso ao Sex Shop">
      <Link
        href="/categoria/sex-shop"
        className="ka-btn group relative flex min-h-[102px] w-full items-center gap-3 overflow-hidden rounded-[30px] border border-white/25 px-4 py-4 text-white shadow-[0_24px_54px_rgba(126,9,49,0.36)] ring-1 ring-pink-100/45"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 32%), linear-gradient(116deg, rgba(64, 5, 29, 0.98) 0%, rgba(178, 15, 78, 0.96) 42%, rgba(255, 79, 135, 0.72) 62%, rgba(75, 5, 33, 0.96) 100%), url('/banners/ka-intima-hero-premium-mobile.webp')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
        aria-label="Entrar no Sex Shop - Lingerie e produtos especiais"
      >
        <span className="ka-story-spotlight-shine opacity-70" aria-hidden="true" />
        <span className="pointer-events-none absolute -left-8 -top-10 h-32 w-32 rounded-full bg-white/16 blur-2xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-7 -top-8 h-36 w-36 rounded-full bg-pink-200/24 blur-2xl transition-transform duration-500 group-hover:scale-110" aria-hidden="true" />
        <span className="pointer-events-none absolute bottom-0 left-10 h-px w-56 bg-gradient-to-r from-transparent via-white/65 to-transparent" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-9 right-10 h-24 w-24 rounded-[38%_62%_48%_52%] border border-white/16 bg-white/8 backdrop-blur-sm" aria-hidden="true" />
        <span className="pointer-events-none absolute right-[72px] top-4 h-10 w-10 rounded-full border border-white/12 bg-white/10" aria-hidden="true" />

        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-white/25 bg-white/16 shadow-[inset_0_0_22px_rgba(255,255,255,0.20),0_14px_26px_rgba(70,0,30,0.26)] backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
          <HeartIcon className="h-7 w-7 text-pink-50 drop-shadow-[0_0_10px_rgba(255,255,255,0.72)]" />
        </span>

        <span className="relative min-w-0 flex-1">
          <span className="mb-1 inline-flex rounded-full border border-white/18 bg-white/12 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-pink-50 backdrop-blur">
            Area especial
          </span>
          <span className="block truncate font-playfair text-[25px] font-bold leading-tight tracking-normal text-white drop-shadow-sm">
            Entrar no Sex Shop
          </span>
          <span className="mt-1 block truncate text-[13px] font-semibold leading-snug text-pink-50/95">
            Lingerie e produtos especiais
          </span>
        </span>

        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#b30f51] shadow-[0_14px_28px_rgba(80,0,32,0.28)] transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-105">
          <ChevronRightIcon className="h-5 w-5" />
        </span>
      </Link>

      <div className="mx-auto mt-2 flex max-w-[330px] items-center justify-center overflow-hidden rounded-full border border-pink-100 bg-white/94 text-[#b51655] shadow-[0_12px_28px_rgba(236,72,153,0.13)] backdrop-blur">
        <Link
          href="/categoria/lingerie"
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3 text-[13px] font-black"
        >
          <HeartIcon className="h-3.5 w-3.5 text-pink-400" />
          Lingerie
        </Link>
        <span className="h-5 w-px bg-pink-100" aria-hidden="true" />
        <Link
          href="/categoria/sex-shop"
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3 text-[13px] font-black"
        >
          Moda &Iacute;ntima
          <ChevronRightIcon className="h-3.5 w-3.5 text-pink-400" />
        </Link>
      </div>
    </section>
  );
}

type StorySpotlightProps = {
  groups: StoryGroup[];
  loading: boolean;
  onOpenCategory: (category: StoryCategory) => void;
  seenIds: Set<string>;
};

function StorySpotlight({ groups, loading, onOpenCategory, seenIds }: StorySpotlightProps) {
  const categoryGroups = new Map(storyCategories.map((category) => [category, groups.filter((group) => group.category === category)]));
  return (
    <section className="mx-auto mt-3 max-w-7xl px-2.5 sm:mt-5 sm:px-6" aria-label="Stories KA Bijoux">
      <div className="relative overflow-hidden rounded-[22px] border border-pink-100 bg-gradient-to-br from-white via-[#fff8fb] to-[#fff2f7] px-3 pb-3 pt-3.5 shadow-[0_12px_28px_rgba(236,72,153,0.10)] ring-1 ring-white/80 sm:rounded-[28px] sm:p-5">
        <span className="ka-story-spotlight-shine" aria-hidden="true" />

        <div className="relative z-10 mb-3 flex items-center justify-between gap-2 sm:gap-3">
          <h2 className="flex min-w-0 items-center gap-1 font-playfair text-[25px] font-bold leading-none tracking-normal text-[#151015] sm:text-4xl">
            Stories da <span className="inline-flex flex-col items-start"><img src={storyLogo} alt="KA Bijoux" className="h-[25px] w-[53px] object-contain sm:h-9 sm:w-[76px]" /><span className="mt-0.5 h-[2px] w-8 rounded-full bg-pink-500 sm:w-12" /></span>
          </h2>
          <StoreLoveButton />
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-4 items-start gap-1 sm:gap-5 lg:mx-auto lg:max-w-[760px]">
            {storyCategories.map((category) => {
              const categoryLabel = STORY_CATEGORY_LABELS[category];
              const categoryItems = categoryGroups.get(category) ?? [];
              const coverGroup = categoryItems[0];
              const hasSeen = categoryItems.length > 0 && categoryItems.every((group) => seenIds.has(group.id));
              const coverMedia = coverGroup ? getStoryCoverMedia(coverGroup) : null;
              return (
                <button key={category} type="button" onClick={() => onOpenCategory(category)} className="group min-w-0 text-center outline-none" aria-label={`Abrir ${categoryLabel}`}>
                  <span className={`ka-story-ring mx-auto flex h-[clamp(58px,17vw,78px)] w-[clamp(58px,17vw,78px)] items-center justify-center rounded-full p-[3px] transition-transform duration-300 group-hover:scale-[1.04] sm:h-[94px] sm:w-[94px] ${hasSeen ? "ka-story-ring-seen" : "ka-story-ring-unseen"}`}>
                    <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.78)]">
                      {coverMedia ? <StoryCover media={coverMedia} title={categoryLabel} /> : category === "OFFICIAL" ? <img src={storyLogo} alt="" className="h-4/5 w-4/5 object-contain" /> : <StoryCategoryIcon category={category} />}
                    </span>
                  </span>
                  <span className="mt-1.5 block truncate text-[10px] font-bold leading-tight text-[#3d0f1a] min-[370px]:text-[11px] sm:mt-2 sm:text-[14px]">{categoryLabel}</span>
                  {loading && !coverGroup ? <span className="sr-only">Carregando Stories</span> : null}
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}

function MainHeroCarousel({ slides }: { slides: HomePresentation["banners"] }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(() => new Set([0]));
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const goToSlide = useCallback((index: number) => {
    setActiveSlide((index + slides.length) % slides.length);
  }, [slides.length]);

  const goNextSlide = useCallback(() => {
    setActiveSlide((current) => (current + 1) % slides.length);
  }, [slides.length]);

  const goPreviousSlide = useCallback(() => {
    setActiveSlide((current) => (current - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused) return;
    const timeout = window.setTimeout(goNextSlide, HERO_IMAGE_DURATION);
    return () => window.clearTimeout(timeout);
  }, [activeSlide, goNextSlide, paused]);

  useEffect(() => {
    setLoadedSlides((current) => {
      if (current.has(activeSlide)) return current;
      const next = new Set(current);
      next.add(activeSlide);
      return next;
    });

    const preload = window.setTimeout(() => {
      const nextIndex = (activeSlide + 1) % slides.length;
      setLoadedSlides((current) => {
        if (current.has(nextIndex)) return current;
        const next = new Set(current);
        next.add(nextIndex);
        return next;
      });
    }, 1200);

    return () => window.clearTimeout(preload);
  }, [activeSlide, slides.length]);

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
    <div className="px-0 pt-0 pb-0 sm:px-4">
      <div
        className="relative mx-2 overflow-hidden rounded-[22px] border border-pink-100 shadow-[0_8px_28px_rgba(236,72,153,0.14)] aspect-[2/1] sm:mx-0 sm:rounded-[24px]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="absolute inset-0 flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <Link
              key={slide.title}
              href={slide.href}
              className="relative block h-full min-w-full overflow-hidden bg-pink-50 text-left"
              aria-label={slide.title}
              tabIndex={index === activeSlide ? 0 : -1}
            >
              {loadedSlides.has(index) ? (
                <picture className="block h-full w-full">
                  <source media="(max-width: 639px)" srcSet={slide.mobileImage} />
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="h-full w-full object-contain"
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    decoding="async"
                  />
                </picture>
              ) : (
                <span className="block h-full w-full bg-pink-50" aria-hidden="true" />
              )}

            </Link>
          ))}
        </div>

        {/* dot indicators */}
        <div className="absolute inset-x-0 bottom-2.5 z-40 flex items-center justify-center gap-1.5">
          {slides.map((_, index) => (
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

function ChristmasBenefits() {
  const icons = { gift: "🚚", card: "▣", shield: "✦" };
  return (
    <section aria-label="Vantagens da loja" className="mx-2 mt-3 rounded-[20px] border border-pink-100 bg-gradient-to-r from-white via-[#fff8fb] to-[#fff1f6] px-2 py-2 shadow-[0_8px_20px_rgba(190,24,93,0.09)] sm:mx-0 sm:mt-4 sm:px-4">
      <div className="grid grid-cols-3 divide-x divide-pink-200/80">
        {HOME_BENEFITS.map((benefit) => (
          <div key={benefit.title} className="flex min-w-0 items-center justify-center gap-1.5 px-1 sm:gap-2.5 sm:px-3">
            <span aria-hidden="true" className="shrink-0 text-lg text-pink-500 sm:text-2xl">{icons[benefit.icon as keyof typeof icons] ?? "♡"}</span>
            <span className="min-w-0 text-[9px] font-bold leading-tight text-[#30131f] sm:text-xs">
              <span className="block">{benefit.title}</span>
              <span className="mt-0.5 hidden font-medium text-gray-500 min-[390px]:block">{benefit.subtitle}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChristmasDivider() {
  return (
    <div aria-hidden="true" className="mx-auto my-5 flex max-w-5xl items-center gap-2 px-6 sm:my-7">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400 to-amber-500" />
      <svg className="h-10 w-28 shrink-0 sm:h-12 sm:w-36" viewBox="0 0 160 54" fill="none">
        <path d="M4 27h41M115 27h41" stroke="#D9A62E" strokeWidth="2" />
        <path d="M9 27c18-2 25-18 39-14-9 5-12 11-16 14 8-1 14 2 19 8-16-3-23 3-42-8Zm142 0c-18-2-25-18-39-14 9 5 12 11 16 14-8-1-14 2-19 8 16-3 23 3 42-8Z" fill="#17613A" />
        <path d="M70 19c-18-17-29 2-5 8-24 5-11 24 6 8 6 18 25 6 9-8 24-6 12-25-6-8-1-19-20-19-4 0Z" fill="#C91F43" stroke="#8D102B" strokeWidth="1.5" />
        <path d="M76 22c-2 6-3 12-1 19M64 23c3 4 9 6 15 5" stroke="#F5C552" strokeWidth="2" />
        <circle cx="49" cy="27" r="2.5" fill="#E9B43E" /><circle cx="111" cy="27" r="2.5" fill="#E9B43E" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-400 to-amber-500" />
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
      <Image
        src={fallbackSrc}
        alt={title}
        fill
        sizes="(max-width: 639px) 18vw, 94px"
        quality={84}
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
      <Image
        src={coverSrc}
        alt={title}
        fill
        sizes="(max-width: 639px) 18vw, 94px"
        quality={84}
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
      <Image
        src={fallbackSrc}
        alt=""
        fill
        sizes="(max-width: 639px) 18vw, 94px"
        quality={84}
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

function StoryPlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8 6 4-6 4V8Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

function StoryCategoryIcon({ category }: { category: StoryCategory }) {
  const paths: Record<StoryCategory, string> = {
    OFFICIAL: "M12 3 2 8l10 5 10-5-10-5Zm-8 9 8 4 8-4M4 16l8 5 8-5",
    CUSTOMER: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm2 4a4 4 0 0 1 4 4v2",
    REVIEW: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z",
    HIGHLIGHT: "m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Zm7 11 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1L19 14Z",
  };
  return <svg className="h-9 w-9 text-pink-500 sm:h-12 sm:w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[category]} /></svg>;
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
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
