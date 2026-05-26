"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  promo?: number | null;
  badge?: string | null;
  image?: string | null;
  slug?: string;
}

interface Props {
  product: Product;
  revealDelay?: number;
}

export default function ProductCard({ product, revealDelay = 0 }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgError, setImgError] = useState(false);
  const { id, name, price, promo, badge, image, slug } = product;

  const href = `/produto/${slug ?? id}`;
  const discount = promo ? Math.round(((price - promo) / price) * 100) : null;

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      el.classList.add("ka-visible");
      return;
    }

    el.style.transitionDelay = `${Math.min(revealDelay, 260)}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("ka-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -24px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [revealDelay]);

  return (
    <div
      ref={cardRef}
      className="ka-product-card ka-product-reveal group bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden flex flex-col"
    >

      {/* Image */}
      <Link href={href} className="ka-zoom relative block aspect-square bg-[#FFF5F7] overflow-hidden">
        {image && !imgError ? (
          <img
            src={image}
            alt={name}
            className="ka-product-img w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100">
            <span className="text-4xl mb-2">💎</span>
            <span className="text-xs text-pink-300 font-medium">KA Bijoux</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {badge && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-500 text-white shadow-sm">
              {badge}
            </span>
          )}
          {discount && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500 text-white shadow-sm">
              -{discount}%
            </span>
          )}
        </div>

        {/* Quick-view on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
          <span className="bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold px-4 py-2 rounded-full shadow-sm">
            Ver produto →
          </span>
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4">
        <Link href={href}>
          <h3 className="text-sm font-semibold text-gray-800 mb-2 leading-snug hover:text-pink-500 transition-colors line-clamp-2">
            {name}
          </h3>
        </Link>

        <div className="mt-auto">
          {/* Price */}
          <div className="flex items-baseline gap-2 mb-3">
            {promo ? (
              <>
                <span className="text-base font-bold text-pink-500">{fmt(promo)}</span>
                <span className="text-xs text-gray-400 line-through">{fmt(price)}</span>
              </>
            ) : (
              <span className="text-base font-bold text-gray-800">{fmt(price)}</span>
            )}
          </div>

          {/* Buy button */}
          <Link
            href={href}
            className="ka-btn w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500 to-pink-400 text-white text-sm font-semibold py-2.5 rounded-xl ka-pulse-glow"
          >
            <CartIcon />
            Comprar
          </Link>
        </div>
      </div>
    </div>
  );
}

function CartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}
