"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  activeSeasonalCampaign,
  valentinesCampaignVideos,
  type CampaignVideo,
} from "@/lib/campaign-media";

export default function HeroSection() {
  const campaign = activeSeasonalCampaign;
  const [activeVideo, setActiveVideo] = useState<CampaignVideo | null>(null);

  useEffect(() => {
    if (!activeVideo) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveVideo(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeVideo]);

  return (
    <section className="relative overflow-hidden bg-white py-12 sm:py-16">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-pink-50/70 to-white" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-10 h-56 w-56 rounded-full bg-pink-200/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-20 bottom-14 h-48 w-48 rounded-full bg-rose-100/70 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="text-center lg:text-left">
            <p className="mx-auto w-fit rounded-full border border-pink-100 bg-white/82 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-pink-500 shadow-sm backdrop-blur lg:mx-0">
              {campaign.eyebrow}
            </p>

            <h1 className="mx-auto mt-5 max-w-[340px] font-playfair text-3xl font-bold leading-[1.04] text-gray-950 sm:max-w-2xl sm:text-6xl lg:mx-0 lg:max-w-none lg:text-7xl">
              {(campaign.titleLines ?? [campaign.title]).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>

            <p className="mx-auto mt-5 max-w-[330px] text-sm leading-relaxed text-gray-600 sm:max-w-2xl sm:text-lg lg:mx-0">
              {campaign.subtitle}
            </p>

            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href={campaign.ctaHref}
                className="ka-btn inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-pink-600 to-pink-400 px-7 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_16px_34px_rgba(236,72,153,0.28)]"
              >
                {campaign.ctaLabel}
              </Link>
              <span className="rounded-full bg-white/70 px-4 py-2 text-xs font-bold text-pink-500 shadow-sm">
                {campaign.accent}
              </span>
            </div>

            <div className="mx-auto mt-6 flex max-w-xl gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:mx-0 [&::-webkit-scrollbar]:hidden">
              {campaign.shortcuts.map((shortcut) => (
                <Link
                  key={shortcut.href}
                  href={shortcut.href}
                  className="shrink-0 rounded-full border border-pink-100 bg-white/88 px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-pink-50 hover:text-pink-500"
                >
                  {shortcut.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative min-h-[280px] overflow-hidden rounded-[28px] bg-pink-100 shadow-[0_22px_70px_rgba(236,72,153,0.16)] sm:min-h-[360px] lg:min-h-[440px]">
            <img
              src={campaign.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-pink-950/16 via-transparent to-white/10" />
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/82 px-4 py-3 text-left shadow-sm backdrop-blur">
              <p className="text-sm font-black text-gray-950">{campaign.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">Videos, presentes e detalhes para inspirar a compra.</p>
            </div>
          </div>
        </div>

        <div className="mt-9 px-4 sm:px-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="text-left">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-pink-400">Videos da campanha</p>
              <h2 className="mt-1 text-xl font-black text-gray-950">Stories especiais para assistir</h2>
            </div>
            <Link href={campaign.ctaHref} className="hidden text-sm font-bold text-pink-500 sm:inline-flex">
              Ver colecao
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-3 lg:grid-cols-6 [&::-webkit-scrollbar]:hidden">
            {valentinesCampaignVideos.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => setActiveVideo(video)}
                className="group relative h-[210px] w-[132px] shrink-0 overflow-hidden rounded-[22px] bg-[#16070d] text-left shadow-[0_16px_38px_rgba(236,72,153,0.18)] sm:h-[250px] sm:w-full"
                aria-label={`Assistir ${video.title}`}
              >
                <video
                  src={video.src}
                  poster={video.poster}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/8 to-transparent" />
                <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/88 text-pink-500 shadow-sm">
                  <PlayIcon />
                </span>
                <span className="absolute bottom-0 left-0 right-0 p-3">
                  <span className="block text-sm font-black leading-tight text-white">{video.title}</span>
                  <span className="mt-1 block text-[11px] font-semibold text-white/72">Toque para assistir</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeVideo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/76 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Fechar video" onClick={() => setActiveVideo(null)} />
          <div className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-[28px] bg-black shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveVideo(null)}
              className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/14 text-2xl leading-none text-white backdrop-blur transition-colors hover:bg-white/25"
              aria-label="Fechar"
            >
              x
            </button>
            <video
              key={activeVideo.src}
              src={activeVideo.src}
              poster={activeVideo.poster}
              autoPlay
              playsInline
              controls
              className="max-h-[86vh] w-full bg-black object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}

function PlayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
