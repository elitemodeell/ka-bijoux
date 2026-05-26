"use client";

import { useState } from "react";
import AnimatedSection from "./AnimatedSection";

interface GalleryImage {
  src: string;
  alt: string;
  label?: string;
  span?: "normal" | "tall" | "wide";
}

const GALLERY: GalleryImage[] = [
  { src: "/imagens/produto-02.jpg", alt: "Cliente com sacolas KA Bijoux", label: "Clientes e estilo KA", span: "tall" },
  { src: "/imagens/foto-05.jpeg", alt: "Porta-joias com acessórios KA Bijoux", label: "Por dentro da loja", span: "normal" },
  { src: "/imagens/foto-06.jpeg", alt: "Conjunto de bijuterias douradas", label: "Curadoria", span: "normal" },
  { src: "/imagens/foto-01.jpeg", alt: "Promoção de mix de acessórios KA Bijoux", label: "Promo R$6 cada peça", span: "wide" },
  { src: "/imagens/foto-02.jpeg", alt: "Promoção de acessórios KA Bijoux", label: "Promo R$6 cada peça", span: "normal" },
  { src: "/imagens/foto-04.jpeg", alt: "Promoção de acessórios KA Bijoux", label: "Promo R$6 cada peça", span: "normal" },
  { src: "/imagens/foto-09.jpeg", alt: "Promoção de bijuterias KA Bijoux", label: "Promo R$6 cada peça", span: "normal" },
  { src: "/imagens/produto-03.jpg", alt: "Óculos e pulseiras KA Bijoux", label: "Beleza & Estilo", span: "wide" },
];

export default function GallerySection() {
  return (
    <section className="py-20 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-12 md:mb-14">
          <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-3 block">
            Momentos
          </span>
          <h2 className="font-playfair text-4xl font-bold text-gray-900 mb-4">
            Momentos KA Bijoux
          </h2>
          <div className="ka-divider mx-auto" />
        </AnimatedSection>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-[180px] sm:auto-rows-[220px]">
          {GALLERY.map((item, i) => (
            <AnimatedSection
              key={item.src}
              delay={i * 70}
              className={`
                ka-gallery-item rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-300 cursor-pointer
                ${item.span === "tall" ? "row-span-2" : ""}
                ${item.span === "wide" ? "col-span-2" : ""}
              `}
            >
              <GalleryImage item={item} />
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center mt-12" delay={400}>
          <a
            href="/produtos"
            className="ka-btn inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-400 text-white font-semibold px-8 py-4 rounded-2xl shadow-glow-lg"
          >
            Ver todos os produtos →
          </a>
        </AnimatedSection>
      </div>
    </section>
  );
}

function GalleryImage({ item }: { item: GalleryImage }) {
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-full group">
      {!error ? (
        <img
          src={item.src}
          alt={item.alt}
          className="w-full h-full object-cover transition-transform duration-550 group-hover:scale-110"
          onError={() => setError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
          <span className="text-4xl">✨</span>
        </div>
      )}

      <div className="ka-gallery-overlay">
        {item.label && (
          <span className="text-white text-sm font-semibold">{item.label}</span>
        )}
      </div>
    </div>
  );
}
