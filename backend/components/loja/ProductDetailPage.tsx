"use client";

import { useState } from "react";
import Link from "next/link";
import type { StaticProduct } from "@/lib/static-sex-shop-catalog";
import { getStaticProduct } from "@/lib/static-sex-shop-catalog";
import { addCartItem } from "@/lib/client-cart";
import ProductCard from "@/components/loja/ProductCard";

type Props = {
  product: ProductDetailProduct;
  subcategoryName: string;
  subcategoryPathSlug: string;
};

const WHATSAPP_NUMBER = "5537999999999";

type ProductDetailProduct = StaticProduct & {
  brand?: string | null;
  ean?: string | null;
  benefits?: string | null;
  composition?: string | null;
  careInstructions?: string | null;
  packageContents?: string | null;
};

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function fmtInstallment(price: number, installments: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(price / installments);
}

export default function ProductDetailPage({
  product,
  subcategoryName,
  subcategoryPathSlug,
}: Props) {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"descricao" | "detalhes" | "como-usar">(
    "descricao"
  );
  const [cartAdded, setCartAdded] = useState(false);

  const relatedProducts = product.relatedSlugs
    .map((slug) => getStaticProduct(slug))
    .filter(Boolean) as StaticProduct[];

  const imageUrl = product.imageFile.startsWith("/")
    ? product.imageFile
    : `/uploads/products/${product.imageFile}`;

  const installmentCount = product.installments > 1 ? product.installments : 3;
  const installmentValue = fmtInstallment(product.price, installmentCount);

  const whatsappText = encodeURIComponent(
    `Olá! Tenho interesse no produto: ${product.name} - ${fmt(product.price)}`
  );
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappText}`;

  function handleAddToCart() {
    addCartItem(
      {
        id: product.sku || product.slug,
        name: product.name,
        price: product.price,
        image: imageUrl,
        sku: product.sku,
        stock: product.stock,
        description: product.shortDescription,
        subcategory: { name: subcategoryName, slug: product.subcategorySlug },
        category: { name: "Linha Adulto", slug: "sex-shop" },
      },
      quantity
    );
    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] pt-24 pb-20">
      {/* ── breadcrumb ── */}
      <nav className="mx-auto max-w-7xl px-4 py-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-white/40">
          <li>
            <Link href="/" className="hover:text-pink-400 transition-colors">
              Início
            </Link>
          </li>
          <li className="text-white/20">/</li>
          <li>
            <Link href="/categoria/sex-shop" className="hover:text-pink-400 transition-colors">
              Linha Adulto
            </Link>
          </li>
          <li className="text-white/20">/</li>
          <li>
            <Link
              href={`/categoria/sex-shop/${subcategoryPathSlug}`}
              className="hover:text-pink-400 transition-colors"
            >
              {subcategoryName}
            </Link>
          </li>
          <li className="text-white/20">/</li>
          <li className="text-white/60 line-clamp-1 max-w-[180px] sm:max-w-none">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* ── main 2-col layout ── */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* LEFT — image */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a0a1f] via-[#2d0a2e] to-[#1a0a1f] aspect-square">
              <img
                src={imageUrl}
                alt={product.name}
                className="h-full w-full object-contain p-8"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = "none";
                  const parent = img.parentElement;
                  if (parent) {
                    parent.insertAdjacentHTML(
                      "beforeend",
                      `<div class="flex h-full w-full flex-col items-center justify-center">
                        <span class="text-5xl font-bold text-pink-300/30">KA</span>
                        <span class="text-sm text-pink-300/30 mt-2">KA Bijoux</span>
                      </div>`
                    );
                  }
                }}
              />
              {/* +18 badge */}
              <span className="absolute left-4 top-4 rounded-full border border-pink-500/40 bg-pink-500/20 px-3 py-1 text-xs font-bold text-pink-300 backdrop-blur-sm">
                🔞 +18
              </span>
              {/* product badge */}
              {product.badge && (
                <span className="absolute right-4 top-4 rounded-full bg-pink-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  {product.badge}
                </span>
              )}
            </div>

            {/* discrete shipping notice below image */}
            <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 py-3 px-4 text-xs text-white/40 backdrop-blur-sm">
              <LockIcon />
              <span>Embalagem 100% discreta garantida</span>
            </div>
          </div>

          {/* RIGHT — product info */}
          <div className="flex flex-col">
            <div className="mb-2 flex flex-wrap gap-2 text-xs text-white/35">
              {product.brand && (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Marca: {product.brand}
                </span>
              )}
              {product.sku && (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  SKU: {product.sku}
                </span>
              )}
              {product.ean && (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  EAN: {product.ean}
                </span>
              )}
            </div>

            {/* Name */}
            <h1 className="font-playfair text-2xl font-bold text-white sm:text-3xl leading-tight">
              {product.name}
            </h1>

            {/* Star rating placeholder */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} filled />
                ))}
              </div>
              <span className="text-xs text-white/40">Seja o primeiro a avaliar</span>
            </div>

            {/* Price */}
            <div className="mt-5">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-pink-400">
                  {fmt(product.price)}
                </span>
              </div>
              <p className="mt-1 text-sm text-white/40">
                ou {installmentCount}x de{" "}
                <span className="text-white/60 font-medium">{installmentValue}</span> sem juros
              </p>
            </div>

            {/* Discrete notice */}
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircleIcon />
              <span className="font-medium">Embalagem 100% discreta</span>
            </div>

            {/* Variant selector */}
            {product.variants && product.variants.length > 1 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                  Variação
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <Link
                      key={variant.slug}
                      href={`/produto/${variant.slug}`}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                        variant.active
                          ? "border-pink-500 bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-[0_0_16px_rgba(236,72,153,0.4)]"
                          : "border-white/15 bg-white/5 text-white/60 hover:border-pink-500/50 hover:text-white"
                      }`}
                    >
                      {variant.color && (
                        <span
                          className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                          style={{ backgroundColor: variant.color }}
                        />
                      )}
                      {variant.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity selector */}
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                Quantidade
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 hover:border-pink-500/50 hover:text-pink-400 transition-colors"
                  aria-label="Diminuir quantidade"
                >
                  <MinusIcon />
                </button>
                <span className="min-w-[2rem] text-center text-lg font-bold text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 hover:border-pink-500/50 hover:text-pink-400 transition-colors"
                  aria-label="Aumentar quantidade"
                >
                  <PlusIcon />
                </button>
                <span className="text-xs text-white/30">{product.stock} em estoque</span>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white shadow-[0_8px_24px_rgba(236,72,153,0.35)] transition-all hover:shadow-[0_12px_32px_rgba(236,72,153,0.5)] active:scale-[0.98] ${
                  cartAdded
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                    : "bg-gradient-to-r from-pink-500 to-pink-400"
                }`}
              >
                {cartAdded ? (
                  <>
                    <CheckCircleIcon />
                    Adicionado ao carrinho!
                  </>
                ) : (
                  <>
                    <CartIcon />
                    Adicionar ao Carrinho
                  </>
                )}
              </button>

              {cartAdded && (
                <Link
                  href="/carrinho"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/20 py-3 text-sm font-bold text-white transition-all hover:bg-white/15"
                >
                  Ver carrinho e finalizar compra →
                </Link>
              )}

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-4 text-base font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50"
              >
                <WhatsAppIcon />
                Pedir pelo WhatsApp
              </a>
            </div>

            {/* Trust icons */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <TrustItem icon={<PackageIcon />} label="Embalagem Discreta" />
              <TrustItem icon={<ShieldIcon />} label="Compra Segura" />
              <TrustItem icon={<TruckIcon />} label="Entrega Rápida" />
            </div>
          </div>
        </div>

        {/* ── TABS section ── */}
        <div className="mt-12">
          {/* Tab headers */}
          <div className="flex rounded-2xl border border-white/8 bg-white/5 p-1 gap-1">
            {(
              [
                { key: "descricao", label: "Descrição" },
                { key: "detalhes", label: "Detalhes" },
                { key: "como-usar", label: "Como Usar" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${
                  activeTab === key
                    ? "bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-md"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="mt-6 rounded-3xl border border-white/8 bg-white/5 p-6 sm:p-8">
            {activeTab === "descricao" && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-pink-400 mb-2">
                  {product.shortDescription}
                </p>
                {product.longDescription.split("\n\n").map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-white/60">
                    {paragraph.trim()}
                  </p>
                ))}
                {product.benefits && <InfoBlock title="Benefícios" text={product.benefits} />}
              </div>
            )}

            {activeTab === "detalhes" && (
              <div className="space-y-5">
                <ul className="space-y-3">
                  {product.details.length > 0 ? (
                    product.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-white/60">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-pink-500/20">
                          <CheckSmallIcon />
                        </span>
                        {detail}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-white/40">Detalhes em breve.</li>
                  )}
                </ul>
                {product.composition && (
                  <InfoBlock title="Composição" text={product.composition} />
                )}
                {product.packageContents && (
                  <InfoBlock title="Conteúdo da embalagem" text={product.packageContents} />
                )}
              </div>
            )}

            {activeTab === "como-usar" && (
              <div className="space-y-5">
                {product.howToUse ? (
                  <p className="text-sm leading-relaxed text-white/60">{product.howToUse}</p>
                ) : (
                  <p className="text-sm text-white/40">Instruções em breve.</p>
                )}
                {product.careInstructions && (
                  <InfoBlock title="Cuidados e recomendações" text={product.careInstructions} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Related products ── */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="font-playfair text-2xl font-bold text-white mb-6">
              Você também pode gostar
            </h2>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {relatedProducts.map((related, index) => (
                <ProductCard
                  key={related.slug}
                  product={{
                    id: related.sku || related.slug,
                    name: related.name,
                    price: related.price,
                    image: `/uploads/products/${related.imageFile}`,
                    slug: related.slug,
                    badge: related.badge,
                    stock: related.stock,
                    sku: related.sku,
                    description: related.shortDescription,
                    subcategory: { name: "Linha Adulto", slug: related.subcategorySlug },
                    category: { name: "Linha Adulto", slug: "sex-shop" },
                  }}
                  revealDelay={index * 70}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-white/5 py-4 px-2 text-center">
      <span className="text-pink-400">{icon}</span>
      <span className="text-[11px] font-medium leading-tight text-white/50">{label}</span>
    </div>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
      <h3 className="text-sm font-bold text-pink-300">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{text}</p>
    </section>
  );
}

// ── Icon components ──

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function CheckSmallIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}
