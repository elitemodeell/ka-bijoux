"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MOCK_PRODUCTS } from "@/lib/catalog";

const WA_NUMBER = "5537999999999";

type QuickShopProduct = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  promo?: number | null;
  image?: string | null;
  images?: Array<{ url: string; alt?: string | null }>;
  stock?: number;
  sku?: string | null;
  category?: { name: string; slug?: string } | null;
  subcategory?: { name: string; slug?: string } | null;
};

type SelectedTogether = {
  current: boolean;
  recommended: boolean;
  extra: boolean;
};

export default function QuickShopModal() {
  const [product, setProduct] = useState<QuickShopProduct | null>(null);
  const [activeMedia, setActiveMedia] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const [message, setMessage] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectedTogether, setSelectedTogether] = useState<SelectedTogether>({
    current: true,
    recommended: true,
    extra: false,
  });

  useEffect(() => {
    function open(event: Event) {
      const detail = (event as CustomEvent<QuickShopProduct>).detail;
      setProduct(detail);
      setActiveMedia(0);
      setQuantity(1);
      setZoomed(false);
      setMessage("");
      setSummaryOpen(false);
      setSelectedTogether({ current: true, recommended: true, extra: false });
    }

    window.addEventListener("ka:quick-shop", open);
    return () => window.removeEventListener("ka:quick-shop", open);
  }, []);

  useEffect(() => {
    if (!product) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [product]);

  const recommendations = useMemo(() => {
    if (!product) return [];
    return MOCK_PRODUCTS.filter((item) => item.id !== product.id).slice(0, 2).map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
    }));
  }, [product]);

  if (!product) return null;

  const price = product.promo ?? product.price;
  const gallery = getGallery(product);
  const currentMedia = gallery[activeMedia] ?? gallery[0];
  const availableStock = product.stock ?? 1;
  const togetherItems = [
    { key: "current" as const, name: product.name, price, image: product.image, locked: true },
    {
      key: "recommended" as const,
      name: recommendations[0]?.name ?? "Brinco delicado",
      price: recommendations[0]?.price ?? 12,
      image: recommendations[0]?.image,
      locked: false,
    },
    {
      key: "extra" as const,
      name: recommendations[1]?.name ?? "Necessaire rosa",
      price: recommendations[1]?.price ?? 48,
      image: recommendations[1]?.image,
      locked: false,
    },
  ];
  const togetherTotal = togetherItems.reduce((sum, item) => {
    return selectedTogether[item.key] ? sum + item.price : sum;
  }, 0);
  const whatsappHref = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    `Olá! Tenho interesse neste produto: ${product.name} - ${formatCurrency(price)}`
  )}`;

  function close() {
    setProduct(null);
  }

  function updateQuantity(next: number) {
    setQuantity(Math.max(1, Math.min(next, Math.max(availableStock, 1))));
  }

  async function addCurrentToCart(action: "cart" | "buy") {
    if (!product) return;
    const added = await tryAddToCart(product.id, quantity);
    setMessage(
      added
        ? "Produto adicionado ao carrinho."
        : "Produto separado para compra rápida. Finalize pelo WhatsApp ou faça login para usar o carrinho."
    );
    if (action === "buy") setSummaryOpen(true);
  }

  async function buyTogether() {
    if (!product) return;
    if (selectedTogether.current) await tryAddToCart(product.id, quantity);
    setMessage("Seleção de produtos preparada. Confira o total e finalize pelo WhatsApp.");
    setSummaryOpen(true);
  }

  return (
    <div className="fixed inset-0 z-[95] bg-black/45 backdrop-blur-sm md:flex md:justify-end" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 hidden cursor-default md:block" aria-label="Fechar compra rápida" onClick={close} />

      <div className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl md:max-w-5xl md:rounded-l-[28px]">
        <div className="flex items-center justify-between border-b border-pink-50 px-4 py-3 md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-400">Compra rápida</p>
            <p className="text-sm font-semibold text-gray-900">KA Bijoux</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-xl leading-none text-pink-500 transition-colors hover:bg-pink-100"
            aria-label="Fechar"
          >
            x
          </button>
        </div>

        <div className="overflow-y-auto px-4 pb-0 pt-4 md:px-6">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-4">
              <div className="relative aspect-square overflow-hidden rounded-[24px] bg-pink-50">
                {isVideo(currentMedia.url) ? (
                  <video src={currentMedia.url} controls playsInline className="h-full w-full object-cover" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setZoomed((current) => !current)}
                    className="h-full w-full overflow-hidden"
                    aria-label="Ampliar imagem"
                  >
                    <img
                      src={currentMedia.url}
                      alt={currentMedia.alt ?? product.name}
                      className={`h-full w-full object-cover transition-transform duration-500 ${zoomed ? "scale-150" : "scale-100"}`}
                    />
                  </button>
                )}
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-pink-500 shadow-sm">
                  Produto selecionado
                </span>
              </div>

              {gallery.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {gallery.map((item, index) => (
                    <button
                      key={`${item.url}-${index}`}
                      type="button"
                      onClick={() => {
                        setActiveMedia(index);
                        setZoomed(false);
                      }}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 ${
                        activeMedia === index ? "border-pink-500" : "border-pink-100"
                      }`}
                    >
                      {isVideo(item.url) ? (
                        <span className="flex h-full w-full items-center justify-center bg-[#1A0A0F] text-[10px] font-bold text-white">
                          VIDEO
                        </span>
                      ) : (
                        <img src={item.url} alt="" className="h-full w-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-pink-500">
                  {product.category?.name ?? "KA Bijoux"}
                  {product.subcategory?.name ? ` / ${product.subcategory.name}` : ""}
                </p>
                <h2 className="mt-1 text-2xl font-bold leading-tight text-gray-950">{product.name}</h2>
                <div className="mt-2 flex items-center gap-2 text-sm text-yellow-400">
                  <span>★★★★★</span>
                  <span className="text-xs font-medium text-gray-400">(12 avaliações)</span>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-pink-500">{formatCurrency(price)}</span>
                {product.promo && <span className="pb-1 text-sm text-gray-400 line-through">{formatCurrency(product.price)}</span>}
              </div>

              <p className="text-sm leading-relaxed text-gray-600">{product.description}</p>

              <div className="ka-free-shipping-card rounded-2xl border border-pink-100 bg-pink-50 px-4 py-3">
                <p className="text-sm font-bold text-pink-600">Frete grátis acima de R$ 150</p>
                <p className="mt-1 text-xs text-pink-500/80">Brilho especial para lembrar a melhor condição de entrega.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  "Embalagem para presente",
                  "Compra segura",
                  "Pix e cartão",
                  "Produto selecionado",
                ].map((seal, index) => (
                  <div key={seal} className="ka-trust-seal rounded-2xl border border-pink-50 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm" style={{ animationDelay: `${index * 80}ms` }}>
                    {seal}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Quantidade</p>
                  <p className="text-xs text-gray-400">{availableStock > 0 ? `${availableStock} em estoque` : "Consulte disponibilidade"}</p>
                </div>
                <div className="flex items-center rounded-full border border-pink-100 bg-pink-50 p-1">
                  <button type="button" onClick={() => updateQuantity(quantity - 1)} className="h-8 w-8 rounded-full bg-white text-lg font-bold text-pink-500 shadow-sm">-</button>
                  <span className="w-10 text-center text-sm font-bold text-gray-800">{quantity}</span>
                  <button type="button" onClick={() => updateQuantity(quantity + 1)} className="h-8 w-8 rounded-full bg-pink-500 text-lg font-bold text-white shadow-sm">+</button>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => addCurrentToCart("buy")}
                  className="ka-btn ka-quick-buy-button w-full rounded-2xl bg-gradient-to-r from-pink-600 to-pink-400 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_16px_34px_rgba(255,77,109,0.32)]"
                >
                  Comprar agora
                </button>
                <button
                  type="button"
                  onClick={() => addCurrentToCart("cart")}
                  className="w-full rounded-2xl border border-pink-200 bg-white py-3 text-sm font-bold uppercase tracking-wide text-pink-500 transition-colors hover:bg-pink-50"
                >
                  Adicionar ao carrinho
                </button>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-2xl bg-green-500 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-green-400"
                >
                  Tirar dúvida no WhatsApp
                </a>
              </div>

              {message && (
                <div className="rounded-2xl border border-pink-100 bg-pink-50 px-4 py-3 text-sm font-medium text-pink-600">
                  {message}
                </div>
              )}
            </div>
          </div>

          <section className="mt-7 rounded-[24px] border border-pink-100 bg-gradient-to-br from-white to-pink-50 p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-400">Combo especial</p>
                <h3 className="text-lg font-bold text-gray-900">Frequentemente comprados juntos</h3>
              </div>
              <p className="text-right text-sm font-black text-pink-500">{formatCurrency(togetherTotal)}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
              {togetherItems.map((item, index) => (
                <div key={item.key} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  <input
                    type="checkbox"
                    checked={selectedTogether[item.key]}
                    disabled={item.locked}
                    onChange={(event) => setSelectedTogether((current) => ({ ...current, [item.key]: event.target.checked }))}
                    className="h-4 w-4 accent-pink-500"
                  />
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-pink-50">
                    {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">{item.name}</p>
                    <p className="text-sm font-bold text-pink-500">{formatCurrency(item.price)}</p>
                  </div>
                  {index < togetherItems.length - 1 && <span className="hidden text-xl font-black text-pink-300 md:block">+</span>}
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Total selecionado: <span className="font-black text-gray-900">{formatCurrency(togetherTotal)}</span>
              </p>
              <button type="button" onClick={buyTogether} className="rounded-2xl bg-[#1A0A0F] px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition-transform hover:scale-[1.02]">
                Comprar junto
              </button>
            </div>
          </section>

          {summaryOpen && (
            <section className="mt-5 rounded-[24px] border border-pink-100 bg-white p-4 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-400">Resumo do pedido</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">Quantidade: {quantity}</p>
                </div>
                <p className="font-black text-pink-500">{formatCurrency(price * quantity)}</p>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-2xl bg-green-500 px-5 py-3 text-center text-sm font-bold text-white">
                  Finalizar pelo WhatsApp
                </a>
                <Link href="/carrinho" className="flex-1 rounded-2xl border border-pink-200 px-5 py-3 text-center text-sm font-bold text-pink-500">
                  Ir para carrinho
                </Link>
              </div>
            </section>
          )}

          <section className="mt-5 pb-28 md:pb-8">
            <div className="rounded-[24px] bg-[#1A0A0F] px-5 py-5 text-white">
              <p className="text-sm font-bold">Siga a KA Bijoux</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Instagram", "WhatsApp", "Facebook", "TikTok"].map((social) => (
                  <a key={social} href={social === "WhatsApp" ? `https://wa.me/${WA_NUMBER}` : "#"} className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/85 transition-colors hover:bg-pink-500">
                    {social}
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-20 border-t border-pink-100 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-pink-400">Total</p>
              <p className="text-lg font-black text-gray-900">{formatCurrency(price * quantity)}</p>
            </div>
            <button
              type="button"
              onClick={() => addCurrentToCart("buy")}
              className="ka-btn flex-1 rounded-2xl bg-gradient-to-r from-pink-600 to-pink-400 py-3 text-sm font-black uppercase tracking-wide text-white"
            >
              Comprar agora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function tryAddToCart(productId: string, quantity: number) {
  if (productId.startsWith("mock-")) return false;

  try {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

function getGallery(product: QuickShopProduct) {
  const images = product.images?.length
    ? product.images.map((image) => ({ url: image.url, alt: image.alt ?? product.name }))
    : product.image
      ? [{ url: product.image, alt: product.name }]
      : [];

  if (images.length > 0) return images;

  return [{ url: "/images/brand/ka-bijoux-logo-story-icon.png", alt: product.name }];
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)$/i.test(url);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
