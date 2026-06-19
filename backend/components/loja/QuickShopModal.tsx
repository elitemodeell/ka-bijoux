"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addCartItem, normalizeCartProduct, type ClientCartProduct } from "@/lib/client-cart";

type QuickShopProduct = ClientCartProduct & {
  badge?: string | null;
  slug?: string;
};

type TogetherKey = "current" | "recommended" | "extra";

type SelectedTogether = Record<TogetherKey, boolean>;

type TogetherItem = {
  key: TogetherKey;
  product: QuickShopProduct;
  locked: boolean;
};

export default function QuickShopModal() {
  const router = useRouter();
  const [product, setProduct] = useState<QuickShopProduct | null>(null);
  const [activeMedia, setActiveMedia] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const [message, setMessage] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [comboPreview, setComboPreview] = useState<QuickShopProduct | null>(null);
  const [selectedTogether, setSelectedTogether] = useState<SelectedTogether>({
    current: true,
    recommended: true,
    extra: false,
  });

  useEffect(() => {
    function open(event: Event) {
      const detail = (event as CustomEvent<QuickShopProduct>).detail;
      setProduct(normalizeCartProduct(detail));
      setActiveMedia(0);
      setQuantity(1);
      setZoomed(false);
      setMessage("");
      setDetailsOpen(false);
      setComboPreview(null);
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
      if (event.key === "Escape") {
        if (comboPreview) {
          setComboPreview(null);
          return;
        }
        close();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [comboPreview, product]);

  const recommendations = useMemo(() => {
    if (!product) return [];
    return [] as QuickShopProduct[];
  }, [product]);

  if (!product) return null;

  const price = getUnitPrice(product);
  const gallery = getGallery(product);
  const currentMedia = gallery[activeMedia] ?? gallery[0];
  const availableStock = product.stock ?? 99;
  const togetherItems: TogetherItem[] = [
    { key: "current", product, locked: true },
    ...recommendations.slice(0, 2).map((recommendation, index) => ({
      key: index === 0 ? "recommended" as const : "extra" as const,
      product: recommendation,
      locked: false,
    })),
  ];
  const togetherTotal = togetherItems.reduce((sum, item) => {
    if (!selectedTogether[item.key]) return sum;
    return sum + getUnitPrice(item.product) * getTogetherQuantity(item.key, quantity);
  }, 0);

  function close() {
    setProduct(null);
    setComboPreview(null);
  }

  function updateQuantity(next: number) {
    setQuantity(Math.max(1, Math.min(next, Math.max(availableStock, 1))));
  }

  function addCurrentToCart(action: "cart" | "buy") {
    if (!product) return;

    addCartItem(product, quantity);

    if (action === "buy") {
      close();
      router.push("/carrinho");
      return;
    }

    setMessage("Produto adicionado ao carrinho.");
  }

  function buyTogether() {
    togetherItems.forEach((item) => {
      if (selectedTogether[item.key]) {
        addCartItem(item.product, getTogetherQuantity(item.key, quantity));
      }
    });

    close();
    router.push("/carrinho");
  }

  function addPreviewToCart(previewProduct: QuickShopProduct) {
    addCartItem(previewProduct, 1);
    setComboPreview(null);
    setMessage("Produto do combo adicionado ao carrinho.");
  }

  return (
    <div className="fixed inset-0 z-[95] bg-black/45 backdrop-blur-sm md:flex md:justify-end" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 hidden cursor-default md:block" aria-label="Fechar compra rapida" onClick={close} />

      <div className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl md:max-w-5xl md:rounded-l-[28px]">
        <div className="flex items-center justify-between border-b border-pink-50 px-4 py-3 md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-400">Compra rapida</p>
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
                      className={`h-full w-full object-contain p-4 transition-transform duration-500 ${zoomed ? "scale-150" : "scale-100"}`}
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
                      aria-label={`Ver midia ${index + 1}`}
                    >
                      {isVideo(item.url) ? (
                        <span className="flex h-full w-full items-center justify-center bg-[#1A0A0F] text-[10px] font-bold text-white">
                          VIDEO
                        </span>
                      ) : (
                        <img src={item.url} alt="" className="h-full w-full object-contain p-1" />
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
              </div>

              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-pink-500">{formatCurrency(price)}</span>
                {product.promo && <span className="pb-1 text-sm text-gray-400 line-through">{formatCurrency(product.price)}</span>}
              </div>

              <p className="text-sm leading-relaxed text-gray-600">{product.description}</p>

              <div className="rounded-2xl border border-pink-100 bg-pink-50 px-4 py-3">
                <p className="text-sm font-bold text-pink-600">Envio para todo o Brasil</p>
                <p className="mt-1 text-xs text-pink-500/80">As opcoes de entrega aparecem na finalizacao da compra.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {["Compra segura", "Produto selecionado", "Pix e cartao", "Carrinho atualizado"].map((seal, index) => (
                  <div
                    key={seal}
                    className="ka-trust-seal rounded-2xl border border-pink-50 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
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
                  <button type="button" onClick={() => updateQuantity(quantity - 1)} className="h-8 w-8 rounded-full bg-white text-lg font-bold text-pink-500 shadow-sm" aria-label="Diminuir quantidade">
                    -
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-gray-800">{quantity}</span>
                  <button type="button" onClick={() => updateQuantity(quantity + 1)} className="h-8 w-8 rounded-full bg-pink-500 text-lg font-bold text-white shadow-sm" aria-label="Aumentar quantidade">
                    +
                  </button>
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
                <button
                  type="button"
                  onClick={() => setDetailsOpen((current) => !current)}
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 text-sm font-bold uppercase tracking-wide text-gray-700 transition-colors hover:bg-pink-50 hover:text-pink-500"
                >
                  Ver detalhes do produto
                </button>
              </div>

              {detailsOpen && (
                <div className="rounded-2xl border border-pink-100 bg-white px-4 py-4 text-sm text-gray-600 shadow-sm">
                  <p className="font-bold text-gray-900">Detalhes do produto</p>
                  <dl className="mt-3 space-y-2">
                    <div className="flex justify-between gap-4">
                      <dt>Categoria</dt>
                      <dd className="text-right font-semibold text-gray-800">{product.category?.name ?? "KA Bijoux"}</dd>
                    </div>
                    {product.subcategory?.name && (
                      <div className="flex justify-between gap-4">
                        <dt>Linha</dt>
                        <dd className="text-right font-semibold text-gray-800">{product.subcategory.name}</dd>
                      </div>
                    )}
                    {product.sku && (
                      <div className="flex justify-between gap-4">
                        <dt>Codigo</dt>
                        <dd className="text-right font-semibold text-gray-800">{product.sku}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <dt>Disponibilidade</dt>
                      <dd className="text-right font-semibold text-gray-800">{availableStock > 0 ? "Em estoque" : "Consulte"}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 leading-relaxed">{product.description}</p>
                </div>
              )}

              {message && (
                <div className="rounded-2xl border border-pink-100 bg-pink-50 px-4 py-3 text-sm font-medium text-pink-600">
                  {message}
                </div>
              )}
            </div>
          </div>

          {togetherItems.length > 1 && (
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
                <Fragment key={item.key}>
                  <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                    <input
                      type="checkbox"
                      checked={selectedTogether[item.key]}
                      disabled={item.locked}
                      onChange={(event) => setSelectedTogether((current) => ({ ...current, [item.key]: event.target.checked }))}
                      className="h-4 w-4 shrink-0 accent-pink-500"
                      aria-label={`Selecionar ${item.product.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => setComboPreview(item.product)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-label={`Ver detalhes de ${item.product.name}`}
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-pink-50">
                        {item.product.image ? <img src={item.product.image} alt="" className="h-full w-full object-contain p-1" /> : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{item.product.name}</p>
                        <p className="text-sm font-bold text-pink-500">{formatCurrency(getUnitPrice(item.product))}</p>
                      </div>
                    </button>
                  </div>
                  {index < togetherItems.length - 1 && <span className="hidden text-xl font-black text-pink-300 md:block">+</span>}
                </Fragment>
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
          )}

          <section className="mt-5 pb-28 md:pb-8">
            <div className="rounded-[24px] bg-[#1A0A0F] px-5 py-5 text-white">
              <p className="text-sm font-bold">Compra pelo site</p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Adicione os produtos ao carrinho, revise quantidades e finalize a compra com Pix ou cartao.
              </p>
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

        {comboPreview && <ComboPreview product={comboPreview} onAdd={addPreviewToCart} onBack={() => setComboPreview(null)} />}
      </div>
    </div>
  );
}

function ComboPreview({
  product,
  onAdd,
  onBack,
}: {
  product: QuickShopProduct;
  onAdd: (product: QuickShopProduct) => void;
  onBack: () => void;
}) {
  const image = getGallery(product)[0];

  return (
    <div className="fixed inset-0 z-[115] flex items-end bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-[28px]">
        <div className="aspect-square overflow-hidden rounded-[24px] bg-pink-50">
          {isVideo(image.url) ? (
            <video src={image.url} controls playsInline className="h-full w-full object-cover" />
          ) : (
            <img src={image.url} alt={image.alt ?? product.name} className="h-full w-full object-contain p-4" />
          )}
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-400">{product.category?.name ?? "KA Bijoux"}</p>
          <h3 className="mt-1 text-2xl font-black leading-tight text-gray-950">{product.name}</h3>
          <p className="mt-2 text-2xl font-black text-pink-500">{formatCurrency(getUnitPrice(product))}</p>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{product.description}</p>
        </div>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => onAdd(product)}
            className="rounded-2xl bg-gradient-to-r from-pink-600 to-pink-400 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_14px_30px_rgba(255,77,109,0.26)]"
          >
            Adicionar ao carrinho
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-pink-100 bg-white px-5 py-3 text-sm font-bold uppercase tracking-wide text-pink-500"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

function getTogetherQuantity(key: TogetherKey, quantity: number) {
  return key === "current" ? quantity : 1;
}

function getUnitPrice(product: QuickShopProduct) {
  return product.promo ?? product.price;
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
