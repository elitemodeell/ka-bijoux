"use client";

import { useRef, useState } from "react";
import AnimatedSection from "./AnimatedSection";

export default function VideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <section className="py-20 md:py-24 bg-[#1A0A0F] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <AnimatedSection direction="left" className="text-white order-2 lg:order-1">
            <span className="inline-block text-pink-400 text-sm font-semibold tracking-widest uppercase mb-4">
              Nossa Essência
            </span>
            <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
              Uma loja feita com{" "}
              <span className="ka-gradient-text">amor e estilo</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-6">
              A KA Bijoux nasceu do desejo de oferecer acessórios femininos de qualidade,
              com preços acessíveis e uma experiência de compra especial.
            </p>
            <p className="text-gray-400 leading-relaxed mb-10">
              Cada peça é escolhida com carinho para combinar com o seu estilo e iluminar
              o seu dia a dia, do casual ao sofisticado.
            </p>
            <a
              href="/produtos"
              className="ka-btn inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-pink-400 text-white font-semibold px-7 py-3.5 rounded-2xl"
            >
              Ver coleção →
            </a>
          </AnimatedSection>

          <AnimatedSection direction="right" className="order-1 lg:order-2">
            <div className="relative rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(255,77,109,0.25)] ka-zoom">
              <video
                ref={videoRef}
                src="/videos/video-ka-bijoux.mp4"
                autoPlay
                muted
                loop
                playsInline
                controls
                className="w-full h-auto max-h-[560px] object-cover"
                style={{ borderRadius: "1.5rem" }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

              <button
                onClick={togglePlay}
                className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-all duration-300 flex items-center justify-center border border-white/30"
                aria-label={playing ? "Pausar vídeo" : "Reproduzir vídeo"}
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>

              <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <svg className="w-3 h-3 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.09 6.26H21l-5.47 3.97 2.09 6.26L12 14.52l-5.62 3.97 2.09-6.26L3 8.26h6.91L12 2z"/>
                </svg>
                <span className="text-white text-xs font-semibold">KA Bijoux</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
                { n: "5 anos", l: "de experiência" },
                { n: "100%", l: "seleção especial" },
                { n: "Envio", l: "para todo Brasil" },
              ].map(({ n, l }) => (
                <div key={n} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-white font-bold text-sm mb-0.5">{n}</p>
                  <p className="text-gray-500 text-xs">{l}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M5 3l14 9-14 9V3z"/>
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    </svg>
  );
}
