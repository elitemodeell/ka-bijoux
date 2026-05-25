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
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-14">
          <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-3 block">
            Em movimento
          </span>
          <h2 className="font-playfair text-4xl font-bold text-gray-900 mb-4">
            Veja nossos detalhes de perto
          </h2>
          <div className="ka-divider mx-auto" />
        </AnimatedSection>

        <div className="flex flex-col sm:flex-row justify-center gap-6">
          {REELS.map((reel, i) => (
            <AnimatedSection key={i} delay={i * 150} direction="scale">
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
    <div className="relative w-full sm:w-[320px] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(255,77,109,0.2)] group bg-black">
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        controls
        className="w-full aspect-[9/16] object-cover"
        style={{ maxHeight: 560 }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

      {/* Top badge */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full pointer-events-none">
        <svg className="w-3 h-3 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.09 6.26H21l-5.47 3.97 2.09 6.26L12 14.52l-5.62 3.97 2.09-6.26L3 8.26h6.91L12 2z"/>
        </svg>
        <span className="text-white text-xs font-semibold">KA Bijoux</span>
      </div>

      {/* Bottom text */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pointer-events-none">
        <p className="text-white font-bold text-base leading-snug">{title}</p>
        <p className="text-white/70 text-sm mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}
