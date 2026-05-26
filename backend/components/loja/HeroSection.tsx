"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-[640px] md:min-h-screen flex items-center justify-center overflow-hidden bg-ka-hero">
      <img
        src="/imagens/banner-01.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-30"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-pink-50/85 to-pink-100/90" />

      {/* Decorative floating circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-30 ka-float"
          style={{ background: "radial-gradient(circle, #FFB6C1 0%, #FF4D6D00 70%)" }}
        />
        <div
          className="absolute top-1/3 -left-32 w-72 h-72 rounded-full opacity-20 ka-float-delayed"
          style={{ background: "radial-gradient(circle, #FF8FAB 0%, #FF4D6D00 70%)" }}
        />
        <div
          className="absolute bottom-20 right-1/4 w-48 h-48 rounded-full opacity-25 ka-float"
          style={{
            background: "radial-gradient(circle, #FFD6E3 0%, transparent 70%)",
            animationDelay: "2s",
          }}
        />

        {/* Floating sparkle dots */}
        {mounted && (
          <>
            <FloatingDot top="15%" left="12%" delay="0s"  size={8} />
            <FloatingDot top="25%" left="80%" delay="1s"  size={5} />
            <FloatingDot top="55%" left="6%"  delay="2s"  size={6} />
            <FloatingDot top="70%" left="88%" delay="0.5s" size={9} />
            <FloatingDot top="80%" left="30%" delay="1.5s" size={5} />
            <FloatingDot top="40%" left="92%" delay="3s"  size={7} />
          </>
        )}

        {/* Large background star */}
        <svg
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] opacity-5 ka-spin-slow"
          viewBox="0 0 24 24"
          fill="#FF4D6D"
        >
          <path d="M12 2l2.09 6.26H21l-5.47 3.97 2.09 6.26L12 14.52l-5.62 3.97 2.09-6.26L3 8.26h6.91L12 2z" />
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center py-14 pt-32 md:py-32 md:pt-40">

        {/* Badge */}
        <div
          className={`inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-pink-100 text-pink-600 text-xs font-semibold px-4 py-2 rounded-full mb-5 md:mb-8 shadow-sm ${
            mounted ? "ka-fade-in" : "opacity-0"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
          Novas coleções disponíveis
        </div>

        {/* Headline */}
        <h1
          className={`font-playfair text-5xl sm:text-6xl md:text-7xl font-bold text-gray-900 leading-tight mb-4 md:mb-6 ${
            mounted ? "ka-fade-up delay-100" : "opacity-0"
          }`}
        >
          Sua beleza,
          <br />
          <span className="ka-gradient-text">nossa paixão</span>
        </h1>

        {/* Subtitle */}
        <p
          className={`text-base sm:text-xl text-gray-500 font-light max-w-2xl mx-auto mb-7 md:mb-10 leading-relaxed ${
            mounted ? "ka-fade-up delay-200" : "opacity-0"
          }`}
        >
          Bijuterias, óculos de sol, capinhas e acessórios femininos que combinam com o seu estilo.
          Elegância que cabe no seu dia a dia.
        </p>

        {/* CTA */}
        <div
          className={`flex items-center justify-center mb-10 md:mb-16 ${
            mounted ? "ka-fade-up delay-300" : "opacity-0"
          }`}
        >
          <Link
            href="/produtos"
            className="ka-btn ka-pulse-glow bg-gradient-to-r from-pink-500 to-pink-400 text-white font-semibold px-8 py-4 rounded-2xl text-base shadow-glow-lg"
          >
            Ver Coleção ✨
          </Link>
        </div>

        {/* Stats */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-12 ${
            mounted ? "ka-fade-up delay-400" : "opacity-0"
          }`}
        >
          {[
            { number: "500+",  label: "Produtos" },
            { number: "2.000+", label: "Clientes felizes" },
            { number: "5⭐",   label: "Avaliação" },
          ].map(({ number, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold text-pink-500">{number}</p>
              <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 ka-bounce opacity-60">
        <p className="text-xs text-gray-400 font-medium">Descer</p>
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className="text-pink-400">
          <path d="M8 0v16M1 9l7 7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </section>
  );
}

function FloatingDot({
  top, left, delay, size,
}: { top: string; left: string; delay: string; size: number }) {
  return (
    <div
      className="absolute rounded-full bg-pink-300 opacity-60 ka-float"
      style={{
        top, left,
        width: size,
        height: size,
        animationDelay: delay,
      }}
    />
  );
}
