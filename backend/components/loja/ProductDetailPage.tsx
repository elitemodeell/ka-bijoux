"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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


// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductDetailPage({ product, subcategoryName }: Props) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [cartAdded, setCartAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [shared, setShared] = useState(false);
  const [imageError, setImageError] = useState(false);

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

  const imageUrl = images[selectedImage] ?? "";

  useEffect(() => { setSelectedImage(0); }, [selectedVariation]);
  useEffect(() => { setImageError(false); }, [imageUrl]);
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
    router.push("/carrinho");
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
    <div className="min-h-screen bg-gray-50 pb-[176px] text-gray-900 pt-[120px] md:pb-20 md:pt-[74px]">

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
          <div className="-mx-2 min-w-0 sm:mx-0">
            <div className="group/gallery relative aspect-[4/5] max-h-[680px] overflow-hidden rounded-[32px] border border-pink-100/80 bg-white shadow-[0_24px_70px_rgba(23,7,12,0.16)] sm:aspect-square lg:aspect-[4/5]">
              <span className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#17070C]/42 via-transparent to-white/8" aria-hidden="true" />
              <span className="pointer-events-none absolute -right-16 -top-20 z-10 h-48 w-48 rounded-full bg-pink-200/18 blur-3xl" aria-hidden="true" />
              {imageUrl && !imageError ? (
                <ProductVariantImage
                  src={imageUrl}
                  alt={product.name}
                  productName={selectedVariant ? `${product.name} ${selectedVariant.label}` : product.name}
                  sku={selectedVariant?.sku ?? product.sku}
                  priority
                  onError={() => setImageError(true)}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  frameClassName="h-full w-full"
                  imageClassName="object-contain transition-transform duration-700 group-hover/gallery:scale-[1.015]"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#fff0f6] to-white text-pink-300">
                  <span className="text-6xl font-black">KA</span>
                  <span className="mt-2 text-sm font-bold">KA Bijoux</span>
                </div>
              )}

              {discountPct && (
                <div className="absolute left-3 top-3 z-20 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-gradient-to-br from-rose-600 to-pink-500 text-center shadow-[0_10px_24px_rgba(225,29,72,0.42)] ring-[3px] ring-white/45">
                  <span className="block text-[8px] font-black uppercase leading-none text-rose-100">até</span>
                  <span className="block text-[18px] font-black leading-none text-white">{discountPct}%</span>
                  <span className="block text-[7px] font-black uppercase leading-none text-rose-100">off</span>
                </div>
              )}

              <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setFavorited((f) => !f)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/85 shadow-[0_12px_28px_rgba(23,7,12,0.16)] backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white ${favorited ? "text-rose-500" : "text-gray-600 hover:text-rose-500"}`}
                  aria-label="Adicionar aos favoritos"
                >
                  <HeartIcon filled={favorited} />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/85 text-gray-600 shadow-[0_12px_28px_rgba(23,7,12,0.16)] backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white hover:text-pink-500"
                  aria-label="Compartilhar produto"
                >
                  <ShareIcon />
                </button>
              </div>

              {images.length > 1 && (
                <>
                  <div className="absolute bottom-3 left-3 z-20 rounded-full border border-white/35 bg-black/35 px-3 py-1.5 text-xs font-black text-white shadow-sm backdrop-blur-md">
                    {selectedImage + 1} / {images.length}
                  </div>
                  <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-1.5">
                    {images.map((img, i) => (
                      <button
                        key={`dot-${img}-${i}`}
                        type="button"
                        onClick={() => setSelectedImage(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${selectedImage === i ? "w-6 bg-white shadow-[0_0_12px_rgba(255,255,255,0.65)]" : "w-1.5 bg-white/55"}`}
                        aria-label={`Ir para foto ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {images.map((img, i) => (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    className={`h-[78px] w-[78px] shrink-0 snap-start overflow-hidden rounded-[18px] border-2 bg-white transition-all duration-300 ${selectedImage === i ? "border-pink-500 shadow-[0_0_0_4px_rgba(236,72,153,0.14)]" : "border-pink-100 opacity-80 hover:border-pink-300 hover:opacity-100"}`}
                    aria-label={`Ver foto ${i + 1}`}
                  >
                    <ProductVariantImage
                      src={img}
                      alt=""
                      productName={product.name}
                      sku={selectedVariant?.sku ?? product.sku}
                      sizes="78px"
                      frameClassName="h-full w-full rounded-[16px]"
                      imageClassName="rounded-[16px] object-contain p-1 transition-transform duration-300 hover:scale-[1.02]"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Purchase Panel */}
          <aside className="min-w-0 lg:sticky lg:top-[90px]">
            <div className="relative overflow-hidden rounded-[30px] border border-pink-100/80 bg-white p-5 shadow-[0_24px_70px_rgba(23,7,12,0.10)] backdrop-blur-sm sm:p-6">
              <span className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-pink-200/30 blur-3xl" aria-hidden="true" />
              <span className="pointer-events-none absolute bottom-0 left-0 h-28 w-full bg-gradient-to-t from-pink-50/70 to-transparent" aria-hidden="true" />

              <div className="relative">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#17070C] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[0_10px_22px_rgba(23,7,12,0.14)]">KA Bijoux</span>
                    {isAdult && <span className="rounded-full border border-[#5d2038]/20 bg-[#5d2038] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">18+</span>}
                    {!available ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] font-black text-red-600">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Indisponível
                      </span>
                    ) : null}
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
                  <span className="ml-auto text-xs font-semibold text-gray-400">247 avaliações</span>
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

              </div>
            </div>
          </aside>
        </section>

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
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-pink-100 bg-white/96 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_38px_rgba(201,66,119,0.13)] backdrop-blur md:hidden">
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
              className="min-h-12 whitespace-nowrap rounded-2xl bg-gradient-to-r from-pink-600 to-pink-400 px-2 text-white font-black text-[13px] shadow-[0_12px_28px_rgba(219,39,119,0.25)] transition-all disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]"
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


type ProductInfoTabsProps = {
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
  const hasUsage = !!(howToUse || material || care || packageContents);
  return (
    <div className="mt-8 space-y-4">
      <DescriptionTab description={description} benefits={benefits} />
      <CharacteristicsTab items={characteristicItems} />
      {hasUsage && (
        <UsageTab
          howToUse={howToUse}
          material={material}
          care={care}
          packageContents={packageContents}
          isAdult={isAdult}
        />
      )}
      <ReviewsTab />
      <QuestionsTab openFaq={openFaq} onFaqToggle={onFaqToggle} />
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-pink-500">{label}</p>
  );
}

function DescriptionTab({ description, benefits }: { description: string; benefits: string | null }) {
  return (
    <div className="rounded-[30px] border border-pink-100 bg-white p-5 shadow-[0_20px_50px_rgba(23,7,12,0.06)] sm:p-6">
      <SectionHeader label="Descrição" />
      <RichText value={description} />
      {benefits && (
        <div className="mt-5 border-t border-pink-100 pt-5">
          <p className="mb-3 text-sm font-black text-gray-900">Benefícios</p>
          <RichText value={benefits} />
        </div>
      )}
    </div>
  );
}

function CharacteristicsTab({ items }: { items: string[] }) {
  return (
    <div className="rounded-[30px] border border-pink-100 bg-white p-5 shadow-[0_20px_50px_rgba(23,7,12,0.06)] sm:p-6">
      <SectionHeader label="Características" />

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
    <div className="rounded-[30px] border border-pink-100 bg-white p-5 shadow-[0_20px_50px_rgba(23,7,12,0.06)] sm:p-6">
      <SectionHeader label="Modo de Uso" />
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[24px] bg-gradient-to-br from-[#17070C] to-[#5d2038] p-5 text-white">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-pink-100">Cuidados</p>
        <h3 className="mt-1.5 text-lg font-black">Use com atenção</h3>
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
    </div>
  );
}

function ReviewsTab() {
  return (
    <div className="rounded-[30px] border border-pink-100 bg-white p-5 shadow-[0_20px_50px_rgba(23,7,12,0.06)] sm:p-6">
      <SectionHeader label="Avaliações" />
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="rounded-[24px] bg-gradient-to-br from-white to-pink-50 p-5 ring-1 ring-pink-100">
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
    </div>
  );
}

function QuestionsTab({ openFaq, onFaqToggle }: { openFaq: number | null; onFaqToggle: (index: number) => void }) {
  return (
    <div className="rounded-[30px] border border-pink-100 bg-white p-5 shadow-[0_20px_50px_rgba(23,7,12,0.06)] sm:p-6">
      <SectionHeader label="Perguntas frequentes" />
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
  return buildSafeProductDescription(name, categoryName);
}

function buildSafeProductDescription(name: string, categoryName: string) {
  const normalized = normalize(`${name} ${categoryName}`);
  const color = extractColor(name);
  const colorText = color ? ` na cor ${color.toLowerCase()}` : "";
  const model = extractPhoneModel(name);
  const power = name.match(/\b\d+\s*w\b/i)?.[0]?.toUpperCase().replace(/\s+/g, "");

  if (/\b(pelicula|pelic)\b/.test(normalized)) {
    const modelText = model ? ` para ${model}` : "";
    return `${name} é um acessório de proteção${modelText}, pensado para ajudar a preservar a área indicada no próprio nome do produto. Confirme o modelo do aparelho antes da compra e aplique com a superfície limpa e seca.`;
  }

  if (/\b(organizador de cabos|kit cabos)\b/.test(normalized)) {
    return `${name} é um acessório para organizar ou compor cabos no dia a dia, ajudando a manter carregadores e conexões mais práticos de usar e guardar. Confira a foto e o nome do produto para confirmar o tipo de cabo ou organizador incluído.`;
  }

  if (/\b(sim card|chip)\b/.test(normalized)) {
    return `${name} é um acessório para chip de celular, útil para adaptar, guardar ou organizar cartões SIM conforme a finalidade indicada no produto. Confira o formato antes de usar para evitar danos ao chip ou ao aparelho.`;
  }

  if (/\b(tag rastreadora|rastreador)\b/.test(normalized)) {
    return `${name} é um acessório de rastreamento para ajudar a localizar itens pessoais compatíveis no dia a dia. Confira as instruções de pareamento e compatibilidade antes de usar.`;
  }

  if (/\b(pen drive|pendrive)\b/.test(normalized)) {
    return `${name} é um dispositivo portátil para armazenar, transportar ou reproduzir arquivos compatíveis. Conecte apenas em entradas USB adequadas e remova com segurança quando possível.`;
  }

  if (/\b(cabos?|fonte|carregador|adaptador|conversor|usb|tipo c|type c|v8|micro usb)\b/.test(normalized)) {
    const powerText = power ? ` com potência informada de ${power}` : "";
    return `${name} é um acessório de carregamento ou conexão${powerText}, útil para o dia a dia, trabalho e viagens. Antes de usar, confira se o conector é compatível com o seu aparelho e evite forçar encaixes.`;
  }

  if (/\b(fone|headphone|bluetooth|p1|p2)\b/.test(normalized)) {
    return `${name} é um acessório de áudio para ouvir músicas, vídeos e chamadas no dia a dia. Confira o tipo de conexão indicado no nome do produto e mantenha o item protegido de umidade, quedas e calor excessivo.`;
  }

  if (/\b(smartwatch|smart watch|pulseira smart)\b/.test(normalized)) {
    return `${name} é uma pulseira para smartwatch pensada para trocar o visual do relógio inteligente com praticidade. A compatibilidade depende do modelo e do encaixe do aparelho, por isso confira as medidas antes da compra.`;
  }

  if (/\b(suporte|ventosa|fita salva celular|pulseira de celular|corda de celular|cordao de celular)\b/.test(normalized)) {
    return `${name} é um acessório para celular feito para facilitar o uso, transporte ou apoio do aparelho na rotina. Use conforme a finalidade indicada no nome do produto e confira o encaixe antes de utilizar.`;
  }

  if (isPhoneCaseName(normalized)) {
    const modelText = model ? ` para ${model}` : "";
    return `${name} é uma capa para celular${modelText}${colorText}, indicada para proteger o aparelho no uso diário e renovar o visual. Verifique o modelo do celular antes da compra para garantir o encaixe correto.`;
  }

  if (/\b(controle|controle universal|smart tv|ar condic)\b/.test(normalized)) {
    return `${name} é um controle de reposição ou uso complementar para aparelhos compatíveis. Confira a aplicação indicada no nome do produto e teste as funções básicas após configurar ou inserir as pilhas adequadas.`;
  }

  if (/\b(caneta|caderno|lapis|papel|estojo)\b/.test(normalized)) {
    return `${name} é um item de papelaria para apoiar tarefas do dia a dia, estudos ou organização. Guarde em local seco e utilize conforme a função indicada no próprio produto.`;
  }

  if (/\b(placa|decor|quadro|porta retrato|flor|vaso)\b/.test(normalized)) {
    return `${name} é um item decorativo para compor ambientes, vitrines ou espaços de uso diário. Posicione em local adequado e evite exposição a umidade ou calor excessivo.`;
  }

  if (/\b(brinco|colar|pulseira|bracelete|broche|anel|pingente|argola)\b/.test(normalized)) {
    return `${name} é um acessório para complementar o visual em produções casuais ou especiais. Para conservar melhor, evite contato com água, perfumes, cremes e produtos químicos.`;
  }

  return `${name} é um produto para uso diário com proposta funcional e visual alinhado ao cadastro atual. Confira nome, fotos, preço e categoria antes da compra para confirmar se atende ao que você precisa.`;
}

function isPhoneCaseName(normalized: string) {
  return /\b(case|capinha|capa)\b/.test(normalized) || (/\bsilicone\b/.test(normalized) && /\b(celular|iphone|ip\s*(?:xr|\d{1,2}))\b/.test(normalized));
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
    "produto ka bijoux com nome", "foi escolhido para a vitrine ka bijoux",
    "foi selecionado para a vitrine ka bijoux", "proposta pratica e versatil",
    "uma opcao para complementar sua rotina",
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

function extractPhoneModel(name: string) {
  const normalized = normalize(name);
  const match = normalized.match(/\bip\s*(\d{1,2})\s*(pro max|pro|plus)?\b/) ?? normalized.match(/\biphone\s*(\d{1,2})\s*(pro max|pro|plus)?\b/);
  if (match) {
    const suffix = match[2] ? ` ${match[2].replace(/\b\w/g, (letter) => letter.toUpperCase())}` : "";
    return `iPhone ${match[1]}${suffix}`;
  }
  if (/\bip\s*xr\b|\biphone\s*xr\b/.test(normalized)) return "iPhone XR";
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
