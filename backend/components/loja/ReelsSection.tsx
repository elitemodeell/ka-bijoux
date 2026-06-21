"use client";

import AnimatedSection from "./AnimatedSection";

const REELS = [
  {
    src: "/videos/video-ka-bijoux.mp4",
    title: "Nossa coleção em detalhes",
    subtitle: "Bijuterias que encantam",
  },
  {
    src: "/videos/video-referencia.mp4",
    title: "Veja de perto",
    subtitle: "Qualidade que você vê",
  },
];

export default function ReelsSection() {
  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <AnimatedSection className="mb-9 text-center sm:mb-12">
          <span className="mb-3 block text-sm font-semibold uppercase tracking-widest text-pink-500">
            Em movimento
          </span>
          <h2 className="font-playfair text-4xl font-bold text-gray-900">
            Veja nossos detalhes de perto
          </h2>
          <div className="ka-divider mx-auto mt-4" />
        </AnimatedSection>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
          {REELS.map((reel, i) => (
            <AnimatedSection key={reel.src} delay={i * 120} direction="scale">
              <ReelCard {...reel} />
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReelCard({
  src, title, subtitle,
}: { src: string; title: string; subtitle: string }) {
  return (
    <div className="group relative w-full overflow-hidden rounded-[24px] bg-[#10070c] shadow-[0_20px_50px_rgba(255,77,109,0.16)]">
      <video
        src={src}
        muted
        loop
        playsInline
        controls
        preload="none"
        className="aspect-[9/16] w-full object-cover"
        style={{ maxHeight: 560 }}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-black/16" />

      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur-sm">
        <svg className="h-3 w-3 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.09 6.26H21l-5.47 3.97 2.09 6.26L12 14.52l-5.62 3.97 2.09-6.26L3 8.26h6.91L12 2z"/>
        </svg>
        <span className="text-xs font-semibold text-white">KA Bijoux</span>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 px-5 pb-5">
        <p className="text-base font-bold leading-snug text-white">{title}</p>
        <p className="mt-0.5 text-sm text-white/72">{subtitle}</p>
      </div>
    </div>
  );
}
