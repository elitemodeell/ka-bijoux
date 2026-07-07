"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { addCartItem } from "@/lib/client-cart";
import { getDiscountPercentage, getInstallmentInfo, getValidPromotionalPrice } from "@/lib/store-rules";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
import ProductVariantImage from "@/components/loja/ProductVariantImage";

type ProductMedia = { url: string; alt?: string | null };

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  promotionalPrice?: number | string | null;
  promo?: number | string | null;
  discount?: number | string | null;
  discountPercentage?: number | string | null;
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
  priority?: boolean;
  badgeSeal?: boolean;
}

function ProductCard({ product, revealDelay = 0, priority = false, badgeSeal = false }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgError, setImgError] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const normalized = useMemo(() => normalizeProduct(product), [product]);
  const { name, price, promo, badge, image } = normalized;
  const discount = getDiscountPercentage({
    originalPrice: price,
    currentPrice: promo,
    manualPercentage: product.discountPercentage ?? product.discount,
  });
  const installment = getInstallmentInfo(promo ?? price);

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
    if (normalized.slug) {
      window.location.assign(`/produto/${normalized.slug}`);
      return;
    }
    window.dispatchEvent(new CustomEvent("ka:quick-shop", { detail: normalized }));
  }

  function handleAddToCart(event?: MouseEvent<HTMLButtonElement>) {
    event?.stopPropagation();
    addCartItem(normalized, 1);
    setCartAdded(true);
    window.setTimeout(() => setCartAdded(false), 1500);
  }

  return (
    <div
      ref={cardRef}
      className="ka-product-card ka-product-reveal group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card"
    >
      <div className="ka-zoom relative aspect-square overflow-hidden bg-[#FFF5F7]">
        <button
          type="button"
          onClick={openQuickShop}
          className="block h-full w-full text-left"
          aria-label={`Ver detalhes de ${name}`}
        >
          {image && !imgError ? (
            <ProductVariantImage
              src={image}
              alt={name}
              productName={name}
              sku={normalized.sku}
              frameClassName="ka-product-img h-full w-full"
              imageClassName="object-contain"
              onError={() => setImgError(true)}
              sizes="(max-width: 640px) 72vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100">
              <span className="mb-2 text-4xl text-pink-300">KA</span>
              <span className="text-xs font-medium text-pink-300">KA Bijoux</span>
            </div>
          )}
        </button>

        {/* Badge — seal visual para Ofertas ou pill padrão para demais seções */}
        {badgeSeal ? (
          discount ? (
            <div className="pointer-events-none absolute left-2 top-2 z-20 flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full bg-gradient-to-br from-rose-600 to-pink-500 text-center shadow-[0_6px_16px_rgba(225,29,72,0.45)] ring-[3px] ring-white/50">
              <span className="block text-[8px] font-black uppercase leading-none text-rose-100">até</span>
              <span className="block text-[20px] font-black leading-none text-white">{discount}%</span>
              <span className="block text-[7px] font-black uppercase leading-none text-rose-100">off</span>
            </div>
          ) : (
            <div className="pointer-events-none absolute left-0 top-3 z-20">
              <span className="block rounded-r-lg bg-gradient-to-r from-rose-600 to-pink-500 px-2.5 py-[5px] text-[10px] font-black uppercase leading-none tracking-wide text-white shadow-[0_4px_12px_rgba(225,29,72,0.35)]">
                {badge ?? "Oferta"}
              </span>
            </div>
          )
        ) : (
          <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
            {badge && (
              <span className="rounded-full bg-pink-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                {badge}
              </span>
            )}
            {discount && (
              <span
                data-product-discount={discount}
                className="rounded-full bg-gradient-to-r from-pink-700 to-pink-500 px-2.5 py-1 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(190,24,93,0.24)]"
              >
                -{discount}%
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          className={`absolute right-2.5 top-2.5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/92 text-pink-500 shadow-[0_10px_26px_rgba(236,72,153,0.22)] backdrop-blur transition-all hover:scale-105 hover:bg-pink-500 hover:text-white ${
            cartAdded ? "bg-pink-500 text-white" : ""
          }`}
          aria-label={`Adicionar ${name} ao carrinho`}
          title="Adicionar ao carrinho"
        >
          {cartAdded ? <CheckIcon /> : <CartIcon />}
        </button>

        <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-black/0 pb-4 opacity-0 transition-all duration-300 group-hover:bg-black/5 group-hover:opacity-100">
          <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur-sm">
            Ver produto
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {product.slug ? (
          <Link href={`/produto/${product.slug}`} className="text-left">
            <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-gray-800 transition-colors hover:text-pink-500">
              {name}
            </h3>
          </Link>
        ) : (
          <button type="button" onClick={openQuickShop} className="text-left">
            <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-gray-800 transition-colors hover:text-pink-500">
              {name}
            </h3>
          </button>
        )}

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
          {installment.eligible && (
            <p className="mb-3 text-[11px] font-semibold text-gray-500">
              {installment.label}
            </p>
          )}

          <div className="grid grid-cols-[1fr_42px] gap-2">
            <button
              type="button"
              onClick={openQuickShop}
              className="ka-btn ka-pulse-glow flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-pink-400 py-2.5 text-sm font-semibold text-white"
            >
              Comprar
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-pink-100 bg-pink-50 text-pink-500 transition-colors hover:bg-pink-500 hover:text-white ${
                cartAdded ? "bg-pink-500 text-white" : ""
              }`}
              aria-label={`Adicionar ${name} ao carrinho`}
              title="Adicionar ao carrinho"
            >
              {cartAdded ? <CheckIcon /> : <CartIcon />}
            </button>
          </div>
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
  const promo = getValidPromotionalPrice(
    price,
    product.promo ?? product.promotionalPrice ?? null
  );

  return {
    ...product,
    price,
    promo,
    image: product.image || images[0]?.url || null,
    images,
    description: product.description || "Produto selecionado com carinho pela KA Bijoux.",
    stock: product.stock ?? 1,
  };
}

export default memo(ProductCard);

function CartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}
