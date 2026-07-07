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
    a: "PIX, cartão de crédito e outras formas de pagamento oferecidas na finalização do pedido.",
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

const STORE_BENEFITS = [
  {
    icon: "🚚",
    title: "Enviamos para todo o Brasil",
    text: "Entrega pelos Correios com acompanhamento do pedido.",
    tone: "from-pink-600 to-rose-500",
  },
  {
    icon: "🎁",
    title: "Mimos em todos os pedidos",
    text: "Um cuidado KA Bijoux para tornar a compra mais especial.",
    tone: "from-[#17070C] to-[#5b1832]",
  },
  {
    icon: "💳",
    title: "Pix e Cartão",
    text: "Escolha a forma de pagamento na finalização.",
    tone: "from-white to-pink-50",
  },
  {
    icon: "🛍️",
    title: "Loja física em Itaúna",
    text: "Retire na loja ou combine atendimento local.",
    tone: "from-white to-rose-50",
  },
  {
    icon: "🔒",
    title: "Compra segura",
    text: "Atendimento cuidadoso do pedido ao recebimento.",
    tone: "from-white to-pink-50",
  },
];

const DELIVERY_OPTIONS = [
  { icon: <StoreIcon />, title: "Retirada na loja", text: "Separe seu pedido e retire em Itaúna." },
  { icon: <DeliveryIcon />, title: "Mototáxi", text: "Entrega local em Itaúna por R$ 10,00." },
  { icon: <TruckIcon />, title: "Correios", text: "Envio para todo o Brasil com rastreio." },
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
    ...(optionLabels.length ? [`Opções do produto: ${optionLabels.join(", ")}`] : []),
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
                className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/95 backdrop-blur shadow-md transition-all duration-200 hover:scale-110 ${favorited ? "text-rose-500" : "text-gray-400 hover:text-rose-400"}`}
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
            <div className="relative overflow-hidden rounded-[30px] border border-pink-100/80 bg-white p-5 shadow-[0_24px_70px_rgba(23,7,12,0.10)] backdrop-blur-sm sm:p-6">
              <span className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-pink-200/30 blur-3xl" aria-hidden="true" />
              <span className="pointer-events-none absolute bottom-0 left-0 h-28 w-full bg-gradient-to-t from-pink-50/70 to-transparent" aria-hidden="true" />

              <div className="relative">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#17070C] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[0_10px_22px_rgba(23,7,12,0.14)]">KA Bijoux</span>
                    {isAdult && <span className="rounded-full border border-[#5d2038]/20 bg-[#5d2038] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">18+</span>}
                    {available ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                        Em estoque
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] font-black text-red-600">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Indisponível
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" onClick={handleShare} className="flex h-9 w-9 items-center justify-center rounded-full border border-pink-100 bg-white/90 text-gray-400 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-pink-200 hover:text-pink-500 hover:shadow-md" aria-label="Compartilhar">
                      <ShareIcon />
                    </button>
                    <button type="button" onClick={() => setFavorited((f) => !f)} className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${favorited ? "border-rose-200 bg-rose-50 text-rose-500" : "border-pink-100 bg-white/90 text-gray-400 hover:border-rose-200 hover:text-rose-400"}`} aria-label="Favoritar">
                      <HeartIcon filled={favorited} size={15} />
                    </button>
                  </div>
                </div>

                <h1 className="text-2xl font-black leading-tight tracking-tight text-gray-950 sm:text-[29px]">
                  {product.name}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={`text-sm ${s <= 4 ? "text-amber-400" : "text-amber-200"}`}>★</span>
                    ))}
                  </div>
                  <span className="text-sm font-black text-gray-800">4.8</span>
                  <span className="text-xs font-semibold text-gray-400">247 avaliações</span>
                  <button onClick={() => setActiveTab("Avaliações")} className="ml-auto text-xs font-black text-pink-500 transition-colors hover:text-[#17070C]">
                    Ver avaliações
                  </button>
                </div>

                <div className="mt-5 overflow-hidden rounded-[24px] border border-pink-100 bg-gradient-to-br from-white via-[#fff7fa] to-[#fff0f6] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8b5c6d]">Preço KA Bijoux</p>
                  {promotionalPrice ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-400 line-through">{fmt(product.price)}</span>
                      {discountPct && (
                        <span className="rounded-full bg-[#17070C] px-2.5 py-1 text-[11px] font-black text-white">{discountPct}% OFF</span>
                      )}
                    </div>
                  ) : null}
                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-[34px] font-black leading-none text-pink-600">{fmt(finalPrice)}</span>
                  </div>
                  {installment.eligible && installment.installmentValue && (
                    <p className="mt-2 text-sm font-semibold text-gray-600">
                      {installment.label} de {fmt(installment.installmentValue)} sem juros
                    </p>
                  )}
                </div>

                {shared && (
                  <p className="mt-3 text-xs font-bold text-emerald-600">Link do produto copiado.</p>
                )}

                {variations.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Escolha a opção</p>
                    <div className="flex flex-wrap gap-2">
                      {variations.map((v, i) => (
                        <button
                          key={`${v.slug}-${i}`}
                          type="button"
                          onClick={() => setSelectedVariation(i)}
                          disabled={v.active === false}
                          className={`min-h-11 rounded-2xl border px-3.5 text-xs font-black transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
                            selectedVariation === i
                              ? "border-pink-500 bg-pink-50 text-pink-600 shadow-[0_0_0_4px_rgba(236,72,153,0.10)]"
                              : "border-gray-200 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-pink-300 hover:shadow-sm"
                          }`}
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

                <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-pink-100 bg-white/80 p-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Quantidade</p>
                    <p className="mt-0.5 text-xs font-semibold text-gray-500">Escolha quantos itens adicionar.</p>
                  </div>
                  <div className="inline-flex h-11 items-center overflow-hidden rounded-full border border-pink-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex h-11 w-11 items-center justify-center text-xl font-black text-pink-600 transition-colors hover:bg-pink-50 active:bg-pink-100"
                      aria-label="Diminuir quantidade"
                    >
                      -
                    </button>
                    <span className="min-w-[2.5rem] text-center text-base font-black text-gray-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(Math.max(product.stock, 1), q + 1))}
                      className="flex h-11 w-11 items-center justify-center text-xl font-black text-pink-600 transition-colors hover:bg-pink-50 active:bg-pink-100"
                      aria-label="Aumentar quantidade"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-5 hidden flex-col gap-2.5 md:flex">
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={!available}
                    className="ka-btn w-full min-h-[54px] rounded-2xl bg-gradient-to-r from-pink-600 to-pink-400 text-base font-black text-white shadow-[0_14px_34px_rgba(219,39,119,0.26)] transition-all duration-300 hover:shadow-[0_18px_42px_rgba(219,39,119,0.34)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Comprar agora
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!available}
                    className="min-h-[50px] w-full rounded-2xl border-2 border-pink-400 bg-white text-base font-black text-pink-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-pink-50 hover:shadow-[0_12px_26px_rgba(236,72,153,0.14)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cartAdded ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}
                  </button>
                </div>

                <DeliveryExperience />

                <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#17070C] px-4 py-2.5 text-[11px] font-bold text-white/90">
                  <ShieldIcon />
                  <span>Compra segura e atendimento KA Bijoux</span>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* ── Benefits bar ──────────────────────────────────── */}
        <BenefitShowcase />

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

        <ProductInfoTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          description={description}
          benefits={benefits}
          characteristicItems={characteristicItems}
          howToUse={howToUse}
          material={material}
          care={care}
          packageContents={packageContents}
          isAdult={isAdult}
          openFaq={openFaq}
          onFaqToggle={(index) => setOpenFaq(openFaq === index ? null : index)}
        />

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

function BenefitShowcase() {
  const [feature, ...items] = STORE_BENEFITS;
  if (!feature) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-pink-500">Compra KA Bijoux</p>
          <h2 className="mt-1 text-xl font-black text-gray-950">Cuidado em cada detalhe</h2>
        </div>
        <span className="hidden rounded-full border border-pink-100 bg-white px-4 py-2 text-xs font-bold text-[#7c4256] shadow-sm sm:inline-flex">
          Atendimento feito com carinho
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.15fr_1.85fr]">
        <article className={`group relative overflow-hidden rounded-[28px] bg-gradient-to-br ${feature.tone} p-5 text-white shadow-[0_22px_48px_rgba(219,39,119,0.18)] transition-all duration-300 hover:-translate-y-1`}>
          <span className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-inner transition-transform duration-300 group-hover:scale-105">
              {feature.icon}
            </span>
            <div>
              <h3 className="text-lg font-black leading-tight">{feature.title}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-white/90">{feature.text}</p>
            </div>
          </div>
        </article>

        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item, index) => {
            const dark = index === 0;
            return (
              <article
                key={item.title}
                className={`group flex min-h-[116px] items-start gap-3 rounded-[24px] border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(23,7,12,0.08)] ${
                  dark
                    ? `border-white/10 bg-gradient-to-br ${item.tone} text-white`
                    : `border-pink-100 bg-gradient-to-br ${item.tone} text-gray-900`
                }`}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl transition-transform duration-300 group-hover:scale-110 ${dark ? "bg-white/20" : "bg-pink-50"}`}>
                  {item.icon}
                </span>
                <span>
                  <span className="block text-sm font-black leading-tight">{item.title}</span>
                  <span className={`mt-1.5 block text-xs font-semibold leading-relaxed ${dark ? "text-white/80" : "text-gray-500"}`}>
                    {item.text}
                  </span>
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DeliveryExperience() {
  return (
    <section className="mt-5 overflow-hidden rounded-[24px] border border-pink-100 bg-white shadow-[0_14px_34px_rgba(201,66,119,0.08)]">
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#17070C] to-[#5d2038] px-4 py-4 text-white">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-pink-100">
          <TruckIcon />
        </span>
        <div>
          <p className="text-sm font-black">Como você recebe</p>
          <p className="text-xs font-medium text-white/70">Escolha a melhor opção ao finalizar o pedido.</p>
        </div>
      </div>

      <div className="divide-y divide-pink-50">
        {DELIVERY_OPTIONS.map((item, index) => (
          <div key={item.title} className={`group flex items-center gap-3 px-4 py-3.5 transition-colors duration-300 ${index === 0 ? "bg-pink-50/50" : "bg-white hover:bg-pink-50/50"}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-pink-500 shadow-sm ring-1 ring-pink-100 transition-transform duration-300 group-hover:scale-105">
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-gray-900">{item.title}</span>
              <span className="mt-0.5 block text-xs font-semibold leading-relaxed text-gray-500">{item.text}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

type ProductInfoTabsProps = {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
  description: string;
  benefits: string | null;
  characteristicItems: string[];
  howToUse: string | null;
  material: string | null;
  care: string | null;
  packageContents: string | null;
  isAdult: boolean;
  openFaq: number | null;
  onFaqToggle: (index: number) => void;
};

function ProductInfoTabs({
  activeTab,
  onChange,
  description,
  benefits,
  characteristicItems,
  howToUse,
  material,
  care,
  packageContents,
  isAdult,
  openFaq,
  onFaqToggle,
}: ProductInfoTabsProps) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-pink-500">Detalhes do produto</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-gray-950">Tudo para escolher melhor</h2>
        </div>
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max rounded-full border border-pink-100 bg-white p-1 shadow-[0_14px_30px_rgba(201,66,119,0.08)]">
            {TAB_IDS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onChange(tab)}
                className={`relative min-h-10 whitespace-nowrap rounded-full px-4 text-sm font-black transition-all duration-300 ${
                  activeTab === tab
                    ? "bg-[#17070C] text-white shadow-[0_10px_22px_rgba(23,7,12,0.18)]"
                    : "text-gray-500 hover:bg-pink-50 hover:text-pink-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div key={activeTab} className="ka-fade-up">
        {activeTab === "Descrição" && <DescriptionTab description={description} benefits={benefits} />}
        {activeTab === "Características" && <CharacteristicsTab items={characteristicItems} />}
        {activeTab === "Modo de Uso" && (
          <UsageTab
            howToUse={howToUse}
            material={material}
            care={care}
            packageContents={packageContents}
            isAdult={isAdult}
          />
        )}
        {activeTab === "Avaliações" && <ReviewsTab />}
        {activeTab === "Perguntas" && <QuestionsTab openFaq={openFaq} onFaqToggle={onFaqToggle} />}
      </div>
    </section>
  );
}

function DescriptionTab({ description, benefits }: { description: string; benefits: string | null }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <article className="relative overflow-hidden rounded-[30px] border border-pink-100 bg-white p-6 shadow-[0_20px_50px_rgba(23,7,12,0.06)] sm:p-8">
        <span className="absolute left-0 top-8 h-20 w-1 rounded-r-full bg-pink-500" aria-hidden="true" />
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-pink-500">Descrição</p>
        <h3 className="mt-2 max-w-2xl text-2xl font-black leading-tight text-gray-950">Conheça os detalhes antes de comprar</h3>
        <div className="mt-5 max-w-3xl">
          <RichText value={description} />
        </div>
      </article>

      <aside className="rounded-[30px] bg-[#17070C] p-6 text-white shadow-[0_20px_50px_rgba(23,7,12,0.16)]">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/20 text-2xl">✨</span>
        <h3 className="mt-4 text-lg font-black">Detalhe KA Bijoux</h3>
        <p className="mt-2 text-sm font-medium leading-relaxed text-white/74">
          A página reúne as informações importantes para comprar com tranquilidade, sem termos técnicos desnecessários.
        </p>
        {benefits && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-sm font-black text-pink-100">O que esse produto entrega</p>
            <div className="mt-2 text-white/80">
              <RichText value={benefits} tone="dark" />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function CharacteristicsTab({ items }: { items: string[] }) {
  return (
    <div className="rounded-[30px] border border-pink-100 bg-white p-5 shadow-[0_20px_50px_rgba(23,7,12,0.06)] sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-pink-500">Características</p>
          <h3 className="mt-1 text-xl font-black text-gray-950">Informações principais</h3>
        </div>
        <span className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-500 sm:flex">
          <SparkleIcon />
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const [label, ...rest] = item.split(": ");
          const value = rest.join(": ") || item;
          return (
            <div key={item} className="group rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/50 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-pink-500">{rest.length ? label : "Detalhe"}</p>
              <p className="mt-1.5 text-sm font-bold leading-relaxed text-gray-800">{value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UsageTab({
  howToUse,
  material,
  care,
  packageContents,
  isAdult,
}: {
  howToUse: string | null;
  material: string | null;
  care: string | null;
  packageContents: string | null;
  isAdult: boolean;
}) {
  const cleaningTips = isAdult
    ? [
        "Higienize antes e após o uso, quando aplicável.",
        "Use água e sabão neutro somente se a embalagem permitir.",
        "Não mergulhe componentes elétricos ou recarregáveis.",
        "Seque completamente e guarde em local limpo e seco.",
      ]
    : ["Siga as instruções de limpeza indicadas na embalagem do fabricante."];
  const sections = [
    { title: "Modo de uso", value: howToUse },
    { title: "Material e composição", value: material },
    { title: "Cuidados", value: care },
    { title: "Conteúdo da embalagem", value: packageContents },
  ].filter((section): section is { title: string; value: string } => Boolean(section.value));

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[30px] bg-gradient-to-br from-[#17070C] to-[#5d2038] p-6 text-white shadow-[0_20px_50px_rgba(23,7,12,0.18)]">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-pink-100">Cuidados</p>
        <h3 className="mt-2 text-2xl font-black">Use com atenção</h3>
        <ul className="mt-5 space-y-3">
          {cleaningTips.map((item, index) => (
            <li key={item} className="flex gap-3 text-sm font-medium leading-relaxed text-white/80">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-pink-100">{index + 1}</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        {sections.map((section, index) => (
          <article key={section.title} className="group rounded-[24px] border border-pink-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(23,7,12,0.08)]">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-sm font-black text-pink-600">{index + 1}</span>
              <div>
                <h3 className="text-sm font-black text-gray-950">{section.title}</h3>
                <div className="mt-2">
                  <RichText value={section.value} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReviewsTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="rounded-[30px] bg-gradient-to-br from-white to-pink-50 p-6 shadow-[0_20px_50px_rgba(23,7,12,0.06)] ring-1 ring-pink-100">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-pink-500">Avaliações</p>
        <div className="mt-4 flex items-end gap-3">
          <span className="text-6xl font-black leading-none text-gray-950">4.8</span>
          <span className="pb-2 text-sm font-bold text-gray-500">de 5</span>
        </div>
        <div className="mt-3 flex gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={`text-xl ${s <= 4 ? "text-amber-400" : "text-amber-200"}`}>★</span>
          ))}
        </div>
        <p className="mt-2 text-sm font-semibold text-gray-500">247 clientes avaliaram a experiência.</p>
        <div className="mt-5 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const pct = star === 5 ? 72 : star === 4 ? 20 : star === 3 ? 5 : star === 2 ? 2 : 1;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-right font-black text-gray-500">{star}</span>
                <span className="text-amber-400">★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-7 font-bold text-gray-400">{pct}%</span>
              </div>
            );
          })}
        </div>
      </aside>

      <div className="space-y-3">
        {DEMO_REVIEWS.map((review, index) => (
          <article key={review.name} className={`group rounded-[26px] border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(23,7,12,0.08)] ${
            index === 1 ? "border-[#17070C]/10 bg-[#17070C] text-white" : "border-pink-100 bg-white text-gray-900"
          }`}>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 text-xs font-black text-white shadow-sm">
                {review.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black">{review.name}</p>
                  <span className={`text-xs font-semibold ${index === 1 ? "text-white/60" : "text-gray-400"}`}>{review.date}</span>
                </div>
                <div className="mt-1 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={`text-xs ${s <= review.rating ? "text-amber-400" : index === 1 ? "text-white/20" : "text-gray-200"}`}>★</span>
                  ))}
                </div>
                <p className={`mt-2 text-sm leading-relaxed ${index === 1 ? "text-white/75" : "text-gray-600"}`}>{review.text}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function QuestionsTab({ openFaq, onFaqToggle }: { openFaq: number | null; onFaqToggle: (index: number) => void }) {
  return (
    <div className="rounded-[30px] border border-pink-100 bg-white p-4 shadow-[0_20px_50px_rgba(23,7,12,0.06)] sm:p-5">
      <div className="mb-4 px-1">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-pink-500">Dúvidas frequentes</p>
        <h3 className="mt-1 text-xl font-black text-gray-950">Respostas rápidas para comprar tranquila</h3>
      </div>
      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <div key={faq.q} className="overflow-hidden rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/40">
            <button
              type="button"
              onClick={() => onFaqToggle(i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-white/70"
            >
              <span className="text-sm font-black text-gray-900">{faq.q}</span>
              <span className={`shrink-0 text-pink-500 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}>
                <ChevronIcon />
              </span>
            </button>
            {openFaq === i && (
              <div className="border-t border-pink-100/70 px-4 pb-4 pt-3">
                <p className="text-sm leading-relaxed text-gray-600">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RichText({ value, tone = "light" }: { value: string; tone?: "light" | "dark" }) {
  const paragraphs = value.split(/\n{2,}|\r?\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p key={i} className={`text-[15px] leading-8 ${tone === "dark" ? "text-white/80" : "text-gray-600"}`}>{p}</p>
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

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
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
  return `${name} foi escolhido para a vitrine KA Bijoux por sua proposta prática e versátil. Uma opção para complementar sua rotina com estilo, cuidado e facilidade.`;
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
