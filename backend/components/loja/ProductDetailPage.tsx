"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { StaticProduct, StaticProductVariant } from "@/lib/static-sex-shop-catalog";
import { addCartItem } from "@/lib/client-cart";
import { getDiscountPercentage, getInstallmentInfo, getValidPromotionalPrice } from "@/lib/store-rules";
import ProductCard from "@/components/loja/ProductCard";
import ProductVariantImage from "@/components/loja/ProductVariantImage";

// ─── Types ────────────────────────────────────────────────────────────────────

type RelatedProduct = {
  id: string;
  name: string;
  slug?: string;
  price: number;
  promotionalPrice?: number | null;
  image?: string | null;
  badge?: string | null;
  stock?: number;
  sku?: string | null;
  description?: string | null;
  category?: { name: string; slug?: string } | null;
  subcategory?: { name: string; slug?: string } | null;
};

type ProductDetailProduct = StaticProduct & {
  brand?: string | null;
  ean?: string | null;
  benefits?: string | null;
  howToUse?: string | null;
  composition?: string | null;
  careInstructions?: string | null;
  packageContents?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  subcategoryName?: string | null;
  promotionalPrice?: number | null;
  galleryImages?: string[];
  relatedProducts?: RelatedProduct[];
  weight?: number | null;
  height?: number | null;
  width?: number | null;
  length?: number | null;
  variations?: StaticProductVariant[];
  isAdult?: boolean | null;
};

type Props = {
  product: ProductDetailProduct;
  subcategoryName: string;
  subcategoryPathSlug: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const TAB_IDS = ["Descrição", "Características", "Modo de Uso", "Avaliações", "Perguntas"] as const;
type TabId = (typeof TAB_IDS)[number];

const FAQS = [
  {
    q: "Como funciona a entrega?",
    a: "Fazemos envio pelos Correios para todo o Brasil. Também oferecemos retirada na loja e entrega por mototáxi em Itaúna – MG no mesmo dia ou no dia seguinte.",
  },
  {
    q: "Posso trocar ou devolver o produto?",
    a: "Sim! Temos política de troca e devolução em até 7 dias corridos após o recebimento, conforme o Código de Defesa do Consumidor. Entre em contato pelo WhatsApp para resolver rapidamente.",
  },
  {
    q: "Qual o prazo de entrega?",
    a: "Mototáxi em Itaúna: mesmo dia ou dia seguinte. Pelos Correios: 5 a 15 dias úteis dependendo da região.",
  },
  {
    q: "O produto tem garantia?",
    a: "Trabalhamos apenas com produtos de qualidade. Caso receba algo com defeito ou diferente do pedido, entre em contato que resolvemos na hora.",
  },
  {
    q: "Quais são as formas de pagamento?",
    a: "PIX, cartão de crédito e outras formas de pagamento disponíveis na finalização do pedido.",
  },
];

const DEMO_REVIEWS = [
  {
    name: "Mariana C.",
    avatar: "MC",
    rating: 5,
    text: "Produto lindo! Chegou super bem embalado e muito mais bonito do que nas fotos. Super recomendo!",
    date: "há 3 dias",
  },
  {
    name: "Julia F.",
    avatar: "JF",
    rating: 5,
    text: "Adorei a qualidade! A entrega foi rápida e o produto veio perfeito. Já quero comprar mais.",
    date: "há 1 semana",
  },
  {
    name: "Ana B.",
    avatar: "AB",
    rating: 4,
    text: "Muito bonito e de boa qualidade. Superou as minhas expectativas!",
    date: "há 2 semanas",
  },
];

const BENEFITS = [
  { icon: "🚚", label: "Entrega rápida" },
  { icon: "🎁", label: "Mimos exclusivos" },
  { icon: "💳", label: "Pix e cartão" },
  { icon: "🛡️", label: "Compra segura" },
  { icon: "⭐", label: "Curadoria selecionada" },
  { icon: "📦", label: "Embalagem especial" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductDetailPage({ product, subcategoryName }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [cartAdded, setCartAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("Descrição");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [shared, setShared] = useState(false);

  const variations = product.variations ?? product.variants ?? [];
  const selectedVariant = variations[selectedVariation] ?? null;

  const images = useMemo(() => {
    const variantGallery = selectedVariant?.images?.filter(Boolean) ?? [];
    const variantFallback = selectedVariant?.imageFile
      ? [selectedVariant.imageFile.startsWith("/") ? selectedVariant.imageFile : `/uploads/products/${selectedVariant.imageFile}`]
      : [];
    const gallery = product.galleryImages?.filter(Boolean) ?? [];
    const fallback = product.imageFile
      ? [product.imageFile.startsWith("/") ? product.imageFile : `/uploads/products/${product.imageFile}`]
      : [];
    return Array.from(new Set(
      variantGallery.length ? variantGallery
        : variantFallback.length ? variantFallback
          : gallery.length ? gallery
            : fallback
    ));
  }, [product.galleryImages, product.imageFile, selectedVariant]);

  useEffect(() => { setSelectedImage(0); }, [selectedVariation]);

  const imageUrl = images[selectedImage] ?? "";
  const promotionalPrice = getValidPromotionalPrice(product.price, product.promotionalPrice);
  const finalPrice = promotionalPrice ?? product.price;
  const discountPct = getDiscountPercentage({ originalPrice: product.price, currentPrice: promotionalPrice });
  const installment = getInstallmentInfo(finalPrice);
  const categoryName = product.categoryName ?? "KA Bijoux";
  const categorySlug = product.categorySlug ?? "produtos";
  const productSubcategoryName = product.subcategoryName ?? subcategoryName;
  const available = product.stock > 0;
  const lowStock = product.stock > 0 && product.stock <= 5;
  const isAdult = product.isAdult ?? isAdultProduct(categorySlug, product.subcategorySlug, productSubcategoryName, product.name);
  const publicBrand = publicText(product.brand);

  const description = buildCommercialDescription(product, productSubcategoryName || categoryName, isAdult);
  const howToUse = publicText(product.howToUse) || buildSafeUsage(product.name, isAdult);
  const benefits = publicText(product.benefits);
  const material = publicText(product.composition);
  const care = publicText(product.careInstructions);
  const packageContents = publicText(product.packageContents);
  const color = extractColor(product.name);
  const purpose = getProductPurpose(product.name, productSubcategoryName, isAdult);
  const optionLabels = variations.map((v) => publicText(v.label)).filter((v): v is string => Boolean(v));

  const characteristicItems = Array.from(new Set([
    `Produto: ${product.name}`,
    `Categoria: ${productSubcategoryName || categoryName}`,
    ...(publicBrand ? [`Marca: ${publicBrand}`] : []),
    ...(color ? [`Cor: ${color}`] : []),
    ...(product.weight ? [`Peso: ${product.weight} kg`] : []),
    ...(product.details ?? []),
    ...(isAdult ? ["Uso: Adulto (18+)"] : []),
    ...(purpose ? [`Finalidade: ${purpose}`] : []),
    ...(optionLabels.length ? [`Opções disponíveis: ${optionLabels.join(", ")}`] : []),
  ].map(publicText).filter((v): v is string => Boolean(v))));

  const relatedProducts = useMemo(() => {
    return product.relatedProducts ?? [];
  }, [product.relatedProducts]);

  function cartPayload() {
    return {
      id: product.sku || product.slug,
      name: selectedVariant ? `${product.name} — ${selectedVariant.label}` : product.name,
      price: finalPrice,
      image: imageUrl,
      sku: product.sku,
      stock: product.stock,
      description: product.shortDescription,
      subcategory: { name: productSubcategoryName, slug: product.subcategorySlug },
      category: { name: categoryName, slug: categorySlug },
    };
  }

  function handleAddToCart() {
    if (!available) return;
    addCartItem(cartPayload(), quantity);
    setCartAdded(true);
    window.setTimeout(() => setCartAdded(false), 1800);
  }

  function handleBuyNow() {
    if (!available) return;
    addCartItem(cartPayload(), quantity);
    window.location.href = "/carrinho";
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href }).catch(() => null);
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => null);
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32 text-gray-900 pt-[120px] md:pb-20 md:pt-[74px]">

      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <nav className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-gray-400">
          <li><Link href="/" className="hover:text-pink-500 transition-colors">Início</Link></li>
          <li className="text-gray-300">/</li>
          <li>
            <Link href={categorySlug === "produtos" ? "/produtos" : `/categoria/${categorySlug}`} className="hover:text-pink-500 transition-colors">
              {categoryName}
            </Link>
          </li>
          {productSubcategoryName ? (
            <><li className="text-gray-300">/</li><li className="text-gray-500 line-clamp-1">{productSubcategoryName}</li></>
          ) : null}
        </ol>
      </nav>

      <main className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-start lg:gap-12">

          {/* Images */}
          <div className="min-w-0">
            <div className="relative aspect-square max-h-[560px] overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-[0_20px_60px_rgba(201,66,119,0.12)]">
              {imageUrl ? (
                <ProductVariantImage
                  src={imageUrl}
                  alt={product.name}
                  productName={selectedVariant ? `${product.name} ${selectedVariant.label}` : product.name}
                  sku={selectedVariant?.sku ?? product.sku}
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  frameClassName="h-full w-full"
                  imageClassName="object-contain p-6 sm:p-10"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-white text-pink-300">
                  <span className="text-6xl font-black">KA</span>
                  <span className="mt-2 text-sm font-bold">KA Bijoux</span>
                </div>
              )}

              {discountPct && (
                <div className="absolute left-3 top-3 flex flex-col items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-rose-600 to-pink-500 text-center shadow-[0_6px_16px_rgba(225,29,72,0.4)] ring-[3px] ring-white/50">
                  <span className="block text-[8px] font-black uppercase leading-none text-rose-100">até</span>
                  <span className="block text-[18px] font-black leading-none text-white">{discountPct}%</span>
                  <span className="block text-[7px] font-black uppercase leading-none text-rose-100">off</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setFavorited((f) => !f)}
                className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/92 backdrop-blur shadow-md transition-all duration-200 hover:scale-110 ${favorited ? "text-rose-500" : "text-gray-400 hover:text-rose-400"}`}
                aria-label="Adicionar aos favoritos"
              >
                <HeartIcon filled={favorited} />
              </button>
            </div>

            {images.length > 1 && (
              <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {images.map((img, i) => (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    className={`h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl border-2 bg-white p-1 transition-all duration-200 ${selectedImage === i ? "border-pink-500 shadow-[0_0_0_3px_rgba(236,72,153,0.15)]" : "border-pink-100 hover:border-pink-300"}`}
                    aria-label={`Ver foto ${i + 1}`}
                  >
                    <ProductVariantImage
                      src={img}
                      alt=""
                      productName={product.name}
                      sku={selectedVariant?.sku ?? product.sku}
                      sizes="72px"
                      frameClassName="h-full w-full rounded-xl"
                      imageClassName="rounded-xl object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Purchase Panel */}
          <aside className="lg:sticky lg:top-[90px]">
            <div className="rounded-3xl border border-pink-100/80 bg-white/95 p-5 shadow-[0_20px_54px_rgba(201,66,119,0.10)] backdrop-blur-sm sm:p-6">

              {/* Brand + actions */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-pink-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-pink-600">KA Bijoux</span>
                  {isAdult && <span className="rounded-full bg-[#5d2038] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">18+</span>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button type="button" onClick={handleShare} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 hover:text-pink-500 hover:border-pink-200 transition-colors" aria-label="Compartilhar">
                    <ShareIcon />
                  </button>
                  <button type="button" onClick={() => setFavorited((f) => !f)} className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${favorited ? "border-rose-200 bg-rose-50 text-rose-500" : "border-gray-100 bg-white text-gray-400 hover:text-rose-400 hover:border-rose-200"}`} aria-label="Favoritar">
                    <HeartIcon filled={favorited} size={14} />
                  </button>
                </div>
              </div>

              {/* Product name */}
              <h1 className="text-2xl font-black leading-tight tracking-tight text-gray-950 sm:text-[28px] line-clamp-3">
                {product.name}
              </h1>

              {/* Rating row */}
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={`text-sm ${s <= 4 ? "text-amber-400" : "text-amber-200"}`}>★</span>
                  ))}
                </div>
                <span className="text-sm font-bold text-gray-700">4.8</span>
                <span className="text-xs text-gray-400">• 247 avaliações</span>
                <button onClick={() => setActiveTab("Avaliações")} className="text-xs text-pink-500 font-semibold hover:underline ml-auto">
                  Ver todas →
                </button>
              </div>

              {/* Price block */}
              <div className="mt-4 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 p-4">
                {promotionalPrice ? (
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-gray-400 line-through">{fmt(product.price)}</span>
                    {discountPct && (
                      <span className="rounded-lg bg-rose-500 px-2 py-0.5 text-xs font-black text-white">{discountPct}% OFF</span>
                    )}
                  </div>
                ) : null}

                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-black text-pink-600 leading-none">{fmt(finalPrice)}</span>
                </div>

                {installment.eligible && installment.installmentValue && (
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    ou {installment.label} de {fmt(installment.installmentValue)} sem juros
                  </p>
                )}

              </div>

              {/* Stock badge */}
              <div className="mt-3 flex items-center gap-2">
                {available ? (
                  lowStock ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Apenas {product.stock} restantes!
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                      Em estoque
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-red-600">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Sem estoque
                  </span>
                )}
                {shared && (
                  <span className="text-xs text-emerald-600 font-semibold animate-pulse">Link copiado!</span>
                )}
              </div>

              {/* Variations */}
              {variations.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-500 mb-2.5">Opções disponíveis</p>
                  <div className="flex flex-wrap gap-2">
                    {variations.map((v, i) => (
                      <button
                        key={`${v.slug}-${i}`}
                        type="button"
                        onClick={() => setSelectedVariation(i)}
                        disabled={v.active === false}
                        className={`min-h-10 rounded-xl border px-3 text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${selectedVariation === i ? "border-pink-500 bg-pink-50 text-pink-600 shadow-[0_0_0_3px_rgba(236,72,153,0.12)]" : "border-gray-200 bg-white text-gray-700 hover:border-pink-300"}`}
                      >
                        {v.color && (
                          <span className="mr-1.5 inline-block h-3 w-3 rounded-full border border-black/10 align-middle" style={{ backgroundColor: v.color }} />
                        )}
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity + stock info */}
              <div className="mt-4 flex items-center gap-4">
                <div className="inline-flex h-11 items-center gap-0 overflow-hidden rounded-full border border-pink-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-11 w-11 items-center justify-center text-xl font-black text-pink-600 hover:bg-pink-50 active:bg-pink-100 transition-colors"
                    aria-label="Diminuir quantidade"
                  >
                    −
                  </button>
                  <span className="min-w-[2.5rem] text-center text-base font-black text-gray-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(Math.max(product.stock, 1), q + 1))}
                    className="flex h-11 w-11 items-center justify-center text-xl font-black text-pink-600 hover:bg-pink-50 active:bg-pink-100 transition-colors"
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs font-semibold text-gray-400">
                  {available ? `${product.stock} disponíveis` : "Sem estoque"}
                </span>
              </div>

              {/* CTA Buttons */}
              <div className="mt-5 hidden flex-col gap-2.5 md:flex">
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={!available}
                  className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-pink-600 to-pink-400 text-white font-black text-base shadow-[0_12px_28px_rgba(219,39,119,0.25)] transition-all duration-200 hover:shadow-[0_16px_36px_rgba(219,39,119,0.35)] hover:from-pink-500 hover:to-pink-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Comprar agora
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!available}
                  className="w-full min-h-[48px] rounded-2xl border-2 border-pink-400 bg-white text-pink-600 font-black text-base transition-all duration-200 hover:bg-pink-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cartAdded ? "✓ Adicionado ao carrinho!" : "Adicionar ao carrinho"}
                </button>
              </div>

              {/* Delivery cards */}
              <div className="mt-5 grid grid-cols-2 gap-2">
                {[
                  { icon: <StoreIcon />, title: "Retirada na loja", text: "Disponível em estoque" },
                  { icon: <DeliveryIcon />, title: "Mototáxi", text: "Itaúna – R$ 10,00" },
                  { icon: <TruckIcon />, title: "Correios", text: "Para todo o Brasil" },
                  { icon: <ShieldIcon />, title: "Compra segura", text: "Pagamento protegido" },
                ].map((item) => (
                  <div key={item.title} className="flex flex-col items-center gap-1.5 rounded-xl border border-pink-100 bg-pink-50/40 p-3 text-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-pink-500 shadow-sm">
                      {item.icon}
                    </span>
                    <span className="text-[11px] font-black text-gray-800 leading-tight">{item.title}</span>
                    <span className="text-[10px] text-gray-500 leading-tight">{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Security footer */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-gray-400">
                <ShieldIcon />
                <span>Compra 100% segura · Embalagem discreta</span>
              </div>
            </div>
          </aside>
        </section>

        {/* ── Benefits bar ──────────────────────────────────── */}
        <div className="mt-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-3 pb-1 sm:justify-center">
            {BENEFITS.map((b) => (
              <div key={b.label} className="flex shrink-0 items-center gap-2 rounded-full border border-pink-100 bg-white px-4 py-2 shadow-sm">
                <span className="text-base">{b.icon}</span>
                <span className="whitespace-nowrap text-xs font-bold text-gray-700">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Adult warning ─────────────────────────────────── */}
        {isAdult && (
          <div className="mt-6 flex gap-4 rounded-2xl border border-[#efd6df] bg-[#fff5f8] px-5 py-4 text-[#6d3448]">
            <ShieldIcon />
            <div>
              <p className="font-black">Produto destinado a maiores de 18 anos.</p>
              <p className="mt-1 text-sm leading-relaxed">Use conforme as orientações da embalagem. Em caso de irritação ou desconforto, interrompa o uso.</p>
            </div>
          </div>
        )}

        {/* ── Product Info Tabs ──────────────────────────────── */}
        <section className="mt-8">
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex border-b border-gray-200">
              {TAB_IDS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`relative whitespace-nowrap px-4 py-3 text-sm font-bold transition-colors duration-200 ${
                    activeTab === tab
                      ? "text-pink-600 after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-pink-500"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6 min-h-[180px] transition-all duration-300">

            {activeTab === "Descrição" && (
              <div className="space-y-4">
                <RichText value={description} />
                {benefits && (
                  <div>
                    <p className="text-sm font-black text-gray-900 mb-2">Benefícios</p>
                    <RichText value={benefits} />
                  </div>
                )}
              </div>
            )}

            {activeTab === "Características" && (
              <div>
                <table className="w-full text-sm">
                  <tbody>
                    {characteristicItems.map((item, i) => {
                      const [label, ...rest] = item.split(": ");
                      const value = rest.join(": ");
                      return (
                        <tr key={item} className={i % 2 === 0 ? "bg-pink-50/40" : "bg-white"}>
                          <td className="rounded-l-xl px-4 py-3 font-bold text-gray-500 w-2/5">{label}</td>
                          <td className="rounded-r-xl px-4 py-3 font-semibold text-gray-800">{value}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "Modo de Uso" && (
              <div className="space-y-5">
                {howToUse && (
                  <div>
                    <p className="text-sm font-black text-gray-900 mb-2">Modo de uso</p>
                    <RichText value={howToUse} />
                  </div>
                )}
                {material && (
                  <div>
                    <p className="text-sm font-black text-gray-900 mb-2">Material e composição</p>
                    <RichText value={material} />
                  </div>
                )}
                {care && (
                  <div>
                    <p className="text-sm font-black text-gray-900 mb-2">Cuidados</p>
                    <RichText value={care} />
                  </div>
                )}
                {packageContents && (
                  <div>
                    <p className="text-sm font-black text-gray-900 mb-2">Conteúdo da embalagem</p>
                    <RichText value={packageContents} />
                  </div>
                )}
                <div>
                  <p className="text-sm font-black text-gray-900 mb-2">Higienização</p>
                  <ul className="space-y-2">
                    {(isAdult
                      ? [
                          "Higienize antes e após o uso, quando aplicável.",
                          "Use água e sabão neutro somente se a embalagem permitir.",
                          "Não mergulhe componentes elétricos ou recarregáveis.",
                          "Seque completamente e guarde em local limpo e seco.",
                        ]
                      : ["Siga as instruções de limpeza indicadas na embalagem do fabricante."]
                    ).map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm text-gray-600">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-pink-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "Avaliações" && (
              <div>
                {/* Rating summary */}
                <div className="flex items-start gap-6 pb-6 mb-6 border-b border-pink-100">
                  <div className="text-center">
                    <div className="text-5xl font-black text-gray-900">4.8</div>
                    <div className="flex justify-center gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={`text-lg ${s <= 4 ? "text-amber-400" : "text-amber-200"}`}>★</span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">247 avaliações</div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const pct = star === 5 ? 72 : star === 4 ? 20 : star === 3 ? 5 : star === 2 ? 2 : 1;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-right font-semibold text-gray-500">{star}</span>
                          <span className="text-amber-400">★</span>
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-6 text-gray-400 font-semibold">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review cards */}
                <div className="space-y-4">
                  {DEMO_REVIEWS.map((review) => (
                    <div key={review.name} className="rounded-2xl border border-pink-100 bg-pink-50/30 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-pink-600 text-xs font-black text-white">
                          {review.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-bold text-gray-800">{review.name}</p>
                            <span className="text-xs text-gray-400">{review.date}</span>
                          </div>
                          <div className="flex gap-0.5 mt-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span key={s} className={`text-xs ${s <= review.rating ? "text-amber-400" : "text-gray-200"}`}>★</span>
                            ))}
                          </div>
                          <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{review.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" className="mt-5 w-full rounded-2xl border border-pink-200 bg-white py-3 text-sm font-bold text-pink-600 hover:bg-pink-50 transition-colors">
                  Ver todas as avaliações →
                </button>
              </div>
            )}

            {activeTab === "Perguntas" && (
              <div className="space-y-2">
                {FAQS.map((faq, i) => (
                  <div key={i} className="rounded-2xl border border-pink-100 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                    >
                      <span className="text-sm font-bold text-gray-800">{faq.q}</span>
                      <span className={`flex-shrink-0 text-pink-500 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}>
                        <ChevronIcon />
                      </span>
                    </button>
                    {openFaq === i && (
                      <div className="border-t border-pink-50 px-4 pb-4 pt-3">
                        <p className="text-sm leading-relaxed text-gray-600">{faq.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Related products ──────────────────────────────── */}
        {relatedProducts.length > 0 && (
          <RelatedSection title="Quem comprou também levou" products={relatedProducts.slice(0, 4)} href="/produtos" />
        )}
        {relatedProducts.length > 4 && (
          <RelatedSection title="Você também pode gostar" products={relatedProducts.slice(4, 8)} href="/produtos" />
        )}

      </main>

      {/* ── Mobile sticky CTA ─────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-pink-100 bg-white/96 px-3 py-3 shadow-[0_-16px_38px_rgba(201,66,119,0.13)] backdrop-blur md:hidden">
        <div className="mx-auto max-w-lg">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-pink-600">{fmt(finalPrice)}</span>
              {promotionalPrice && <span className="text-xs font-semibold text-gray-400 line-through">{fmt(product.price)}</span>}
            </div>
            {discountPct && (
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-black text-rose-600">{discountPct}% OFF</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!available}
              className="min-h-12 rounded-2xl border-2 border-pink-400 bg-white text-pink-600 font-black text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]"
            >
              {cartAdded ? "✓ Adicionado!" : "Adicionar"}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!available}
              className="min-h-12 rounded-2xl bg-gradient-to-r from-pink-600 to-pink-400 text-white font-black text-sm shadow-[0_12px_28px_rgba(219,39,119,0.25)] transition-all disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]"
            >
              Comprar agora
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RelatedSection({ title, products, href }: { title: string; products: RelatedProduct[]; href: string }) {
  if (!products.length) return null;
  return (
    <section className="mt-10">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">Seleção KA Bijoux</p>
          <h2 className="mt-1 text-xl font-black text-gray-950">{title}</h2>
        </div>
        <Link href={href} className="text-sm font-bold text-pink-500 hover:text-pink-700 transition-colors">
          Ver vitrine →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={`${title}-${p.id}`} product={p} revealDelay={i * 50} />
        ))}
      </div>
    </section>
  );
}

function RichText({ value }: { value: string }) {
  const paragraphs = value.split(/\n{2,}|\r?\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-sm leading-7 text-gray-600">{p}</p>
      ))}
    </div>
  );
}

// ─── Icon components ──────────────────────────────────────────────────────────

function HeartIcon({ filled = false, size = 20 }: { filled?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function StoreIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18" /><path d="M5 10v10h14V10" /><path d="m4 4-1 6h18l-1-6Z" /><path d="M9 20v-6h6v6" /></svg>;
}

function DeliveryIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /><path d="M5 18H3V8h11l3 4h3v6h-1" /><path d="M9 18h6" /></svg>;
}

function TruckIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v10H3z" /><path d="M14 10h4l3 3v4h-7" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>;
}

function ShieldIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>;
}

// ─── Business logic helpers (unchanged) ──────────────────────────────────────

function isAdultProduct(categorySlug: string, subcategorySlug: string, categoryName: string, productName = "") {
  const text = normalize(`${categorySlug} ${subcategorySlug} ${categoryName} ${productName}`);
  return (
    text.includes("sex shop") ||
    categorySlug === "sex-shop" ||
    subcategorySlug.startsWith("sex-shop") ||
    /\b(intimo|intima|lubrificante|vibrador|bullet|peniano|masturbador|algema|dedeira|plug anal|retardante|dessensibilizante|excitante|anestesico|protese|dildo|escroto|mydick|chicote|tapa mamilo)\b/.test(text)
  );
}

function buildCommercialDescription(product: ProductDetailProduct, categoryName: string, isAdult: boolean) {
  const name = product.name.trim();
  const normalized = normalize(`${name} ${categoryName}`);
  const savedDescription = [product.longDescription, product.shortDescription]
    .map(publicText)
    .find((v): v is string => Boolean(v));
  if (savedDescription) return savedDescription;

  if (/mini bullet|bullet|vibrador|masturbador|sugador/.test(normalized)) {
    const doublePoint = normalized.includes("duplo")
      ? " Seu design com dois pontos de contato amplia as possibilidades de uso e permite explorar diferentes formas de estímulo."
      : " Seu formato favorece estímulos direcionados e uma experiência prática.";
    return `${name} é uma opção compacta e discreta para quem deseja explorar novas sensações com praticidade.${doublePoint} O tamanho reduzido facilita o transporte e o armazenamento, mantendo a experiência reservada e confortável.`;
  }
  if (normalized.includes("anel peniano")) {
    return `${name} é um acessório íntimo pensado para complementar os momentos a dois de forma prática e discreta. O formato de anel facilita o posicionamento, enquanto o design diferenciado acrescenta novas possibilidades à experiência do casal.`;
  }
  if (/protese|dildo|escroto|mydick/.test(normalized)) {
    return `${name} faz parte da Linha Adulto KA Bijoux e foi selecionado para quem busca uma opção de uso adulto com informação clara, discrição e cuidado. Confira as características do produto, higienize antes e após o uso e siga sempre as orientações da embalagem.`;
  }
  if (/gel|creme|lubrificante|oleo|spray|desodorante/.test(normalized)) {
    return `${name} integra a seleção de cuidados e bem-estar da KA Bijoux. É uma opção prática para incluir na rotina, com embalagem fácil de guardar e proposta de uso discreta. Consulte sempre as orientações do rótulo antes da aplicação.`;
  }
  if (isAdult) {
    return `${name} faz parte da Linha Adulto KA Bijoux, uma seleção pensada para proporcionar novas experiências com discrição e cuidado. O produto é enviado em embalagem reservada e deve ser utilizado conforme as orientações presentes no rótulo ou na embalagem.`;
  }
  return `${name} foi selecionado para a vitrine KA Bijoux por sua proposta prática e versátil. Uma escolha pensada para complementar sua rotina com o estilo e o cuidado presentes em toda a nossa curadoria.`;
}

function publicText(value?: string | null) {
  if (!value) return null;
  const text = value.trim();
  if (text.length < 3) return null;
  const normalized = normalize(text);
  const blocked = [
    "nao informado", "nao informada", "nao informadas", "nao disponivel",
    "necessita revisao", "revisao", "revisao manual", "revisao pendente",
    "campo em revisao", "informacao indisponivel", "informacoes tecnicas pendentes",
    "descricao detalhada pendente", "importado da bling", "produto selecionado pela ka bijoux",
  ];
  return blocked.some((t) => normalized.includes(t)) ? null : text;
}

function buildSafeUsage(name: string, isAdult: boolean) {
  const normalized = normalize(name);
  if (/gel|creme|lubrificante|oleo|spray|desodorante/.test(normalized)) {
    return "Antes do uso, leia o rótulo e siga a forma de aplicação indicada na embalagem. Use apenas na região recomendada e interrompa a aplicação em caso de desconforto ou irritação.";
  }
  if (isAdult) {
    return "Higienize o produto antes e após o uso. Comece de forma gradual e utilize somente conforme as orientações da embalagem. Quando aplicável, use lubrificante compatível e interrompa o uso em caso de desconforto.";
  }
  return "Utilize conforme as orientações presentes no rótulo ou na embalagem e conserve o produto em local limpo, seco e protegido.";
}

function getProductPurpose(name: string, categoryName: string, isAdult: boolean) {
  const normalized = normalize(`${name} ${categoryName}`);
  if (normalized.includes("anel peniano")) return "Acessório íntimo para momentos a dois";
  if (/protese|dildo|escroto|mydick/.test(normalized)) return "Produto adulto para uso íntimo responsável";
  if (normalized.includes("bullet") || normalized.includes("vibrador")) return "Acessório íntimo para exploração de novas sensações";
  if (/gel|creme|lubrificante|oleo/.test(normalized)) return "Cuidado, bem-estar e conforto íntimo";
  if (isAdult) return "Produto de uso adulto";
  return null;
}

function extractColor(name: string) {
  const colors: Array<[RegExp, string]> = [
    [/\brox[oa]\b/, "Roxo"],
    [/\bros[ae]\b/, "Rosa"],
    [/\bpreto\b/, "Preto"],
    [/\bbranco\b/, "Branco"],
    [/\bvermelh[oa]\b/, "Vermelho"],
    [/\bazul\b/, "Azul"],
    [/\bdourad[oa]\b/, "Dourado"],
    [/\bpratead[oa]\b/, "Prateado"],
  ];
  const normalized = normalize(name);
  return colors.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
