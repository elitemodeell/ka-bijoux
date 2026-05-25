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
  { src: "/imagens/banner-01.jpg",  alt: "KA Bijoux — acessórios premium",     label: "Lifestyle",       span: "tall"   },
  { src: "/imagens/produto-01.jpg", alt: "Produto em destaque — KA Bijoux",    label: "Em destaque",     span: "normal" },
  { src: "/imagens/produto-02.jpg", alt: "Coleção atual — KA Bijoux",          label: "Coleção atual",   span: "normal" },
  { src: "/imagens/produto-03.jpg", alt: "Beleza e estilo — KA Bijoux",        label: "Beleza & Estilo", span: "wide"   },
];

export default function GallerySection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-14">
          <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-3 block">
            Galeria
          </span>
          <h2 className="font-playfair text-4xl font-bold text-gray-900 mb-4">
            Veja nossos produtos
          </h2>
          <div className="ka-divider mx-auto" />
        </AnimatedSection>

        {/* Masonry-style grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-[220px]">
          {GALLERY.map((item, i) => (
            <AnimatedSection
              key={i}
              delay={i * 100}
              className={`
                ka-gallery-item rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-300 cursor-pointer
                ${item.span === "tall"   ? "row-span-2" : ""}
                ${item.span === "wide"   ? "col-span-2" : ""}
              `}
            >
              <GalleryImage item={item} />
            </AnimatedSection>
          ))}
        </div>

        {/* CTA */}
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
      {item.src && !error ? (
        <img
          src={item.src}
          alt={item.alt}
          className="w-full h-full object-cover transition-transform duration-550 group-hover:scale-110"
          onError={() => setError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
          <span className="text-4xl">💎</span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="ka-gallery-overlay">
        {item.label && (
          <span className="text-white text-sm font-semibold">{item.label}</span>
        )}
      </div>
    </div>
  );
}
