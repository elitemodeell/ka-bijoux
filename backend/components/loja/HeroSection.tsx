"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-ka-hero">

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
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center py-32 pt-40">

        {/* Badge */}
        <div
          className={`inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-pink-100 text-pink-600 text-xs font-semibold px-4 py-2 rounded-full mb-8 shadow-sm ${
            mounted ? "ka-fade-in" : "opacity-0"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
          Novas coleções disponíveis
        </div>

        {/* Headline */}
        <h1
          className={`font-playfair text-5xl sm:text-6xl md:text-7xl font-bold text-gray-900 leading-tight mb-6 ${
            mounted ? "ka-fade-up delay-100" : "opacity-0"
          }`}
        >
          Sua beleza,
          <br />
          <span className="ka-gradient-text">nossa paixão</span>
        </h1>

        {/* Subtitle */}
        <p
          className={`text-lg sm:text-xl text-gray-500 font-light max-w-2xl mx-auto mb-10 leading-relaxed ${
            mounted ? "ka-fade-up delay-200" : "opacity-0"
          }`}
        >
          Bijuterias, óculos de sol, capinhas e acessórios femininos que combinam com o seu estilo.
          Elegância que cabe no seu dia a dia.
        </p>

        {/* CTAs */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 ${
            mounted ? "ka-fade-up delay-300" : "opacity-0"
          }`}
        >
          <Link
            href="/produtos"
            className="ka-btn ka-pulse-glow bg-gradient-to-r from-pink-500 to-pink-400 text-white font-semibold px-8 py-4 rounded-2xl text-base shadow-glow-lg"
          >
            Ver Coleção ✨
          </Link>
          <a
            href="https://wa.me/5537999999999?text=Olá! Vim pelo site e quero conhecer a KA Bijoux!"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-pink-100 text-gray-700 font-semibold px-8 py-4 rounded-2xl text-base hover:border-pink-300 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <WhatsAppIcon />
            Fale Conosco
          </a>
        </div>

        {/* Stats */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 ${
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

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#22C55E">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}
