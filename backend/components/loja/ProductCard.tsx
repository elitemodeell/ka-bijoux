"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ProductMedia = { url: string; alt?: string | null };

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  promotionalPrice?: number | string | null;
  promo?: number | string | null;
  badge?: string | null;
  image?: string | null;
  images?: ProductMedia[];
  slug?: string;
  stock?: number;
  sku?: string | null;
  category?: { name: string; slug?: string } | null;
  subcategory?: { name: string; slug?: string } | null;
}

interface Props {
  product: Product;
  revealDelay?: number;
}

export default function ProductCard({ product, revealDelay = 0 }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgError, setImgError] = useState(false);
  const normalized = useMemo(() => normalizeProduct(product), [product]);
  const { name, price, promo, badge, image } = normalized;

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

  function openQuickShop() {
    window.dispatchEvent(new CustomEvent("ka:quick-shop", { detail: normalized }));
  }

  return (
    <div
      ref={cardRef}
      className="ka-product-card ka-product-reveal group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card"
    >
      <button
        type="button"
        onClick={openQuickShop}
        className="ka-zoom relative block aspect-square overflow-hidden bg-[#FFF5F7] text-left"
        aria-label={`Comprar ${name}`}
      >
        {image && !imgError ? (
          <img
            src={image}
            alt={name}
            className="ka-product-img h-full w-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100">
            <span className="mb-2 text-4xl text-pink-300">KA</span>
            <span className="text-xs font-medium text-pink-300">KA Bijoux</span>
          </div>
        )}

        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {badge && (
            <span className="rounded-full bg-pink-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              {badge}
            </span>
          )}
          {discount && (
            <span className="rounded-full bg-green-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              -{discount}%
            </span>
          )}
        </div>

        <div className="absolute inset-0 flex items-end justify-center bg-black/0 pb-4 opacity-0 transition-all duration-300 group-hover:bg-black/5 group-hover:opacity-100">
          <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur-sm">
            Compra rapida
          </span>
        </div>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <button type="button" onClick={openQuickShop} className="text-left">
          <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-gray-800 transition-colors hover:text-pink-500">
            {name}
          </h3>
        </button>

        <div className="mt-auto">
          <div className="mb-3 flex items-baseline gap-2">
            {promo ? (
              <>
                <span className="text-base font-bold text-pink-500">{fmt(promo)}</span>
                <span className="text-xs text-gray-400 line-through">{fmt(price)}</span>
              </>
            ) : (
              <span className="text-base font-bold text-gray-800">{fmt(price)}</span>
            )}
          </div>

          <button
            type="button"
            onClick={openQuickShop}
            className="ka-btn ka-pulse-glow flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-pink-400 py-2.5 text-sm font-semibold text-white"
          >
            <CartIcon />
            Comprar
          </button>
        </div>
      </div>
    </div>
  );
}

function normalizeProduct(product: Product) {
  const images = product.images?.length
    ? product.images.map((image) => ({ url: image.url, alt: image.alt ?? product.name }))
    : product.image
      ? [{ url: product.image, alt: product.name }]
      : [];
  const price = Number(product.price);
  const promo = product.promo ?? product.promotionalPrice ?? null;

  return {
    ...product,
    price,
    promo: promo ? Number(promo) : null,
    image: product.image || images[0]?.url || null,
    images,
    description: product.description || "Produto selecionado com carinho pela KA Bijoux.",
    stock: product.stock ?? 1,
  };
}

function CartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
