"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { StaticProduct } from "@/lib/static-sex-shop-catalog";
import { getStaticProduct } from "@/lib/static-sex-shop-catalog";
import { addCartItem } from "@/lib/client-cart";
import ProductCard from "@/components/loja/ProductCard";

type RelatedProduct = {
  id: string;
  name: string;
  slug: string;
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
};

type Props = {
  product: ProductDetailProduct;
  subcategoryName: string;
  subcategoryPathSlug: string;
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

export default function ProductDetailPage({ product, subcategoryName }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [cartAdded, setCartAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const images = useMemo(() => {
    const gallery = product.galleryImages?.filter(Boolean) ?? [];
    const fallback = product.imageFile
      ? [product.imageFile.startsWith("/") ? product.imageFile : `/uploads/products/${product.imageFile}`]
      : [];
    return gallery.length ? gallery : fallback;
  }, [product.galleryImages, product.imageFile]);

  const imageUrl = images[selectedImage] ?? "";
  const finalPrice = product.promotionalPrice ?? product.price;
  const installmentCount = product.installments > 1 ? product.installments : 3;
  const installmentValue = fmtInstallment(finalPrice, installmentCount);
  const categoryName = product.categoryName ?? "KA Bijoux";
  const categorySlug = product.categorySlug ?? "produtos";
  const productSubcategoryName = product.subcategoryName ?? subcategoryName;
  const available = product.stock > 0;

  const relatedProducts = useMemo(() => {
    if (product.relatedProducts?.length) return product.relatedProducts;

    return product.relatedSlugs
      .map((slug) => getStaticProduct(slug))
      .filter(Boolean)
      .map((related) => ({
        id: related!.sku || related!.slug,
        name: related!.name,
        price: related!.price,
        image: `/uploads/products/${related!.imageFile}`,
        slug: related!.slug,
        badge: related!.badge,
        stock: related!.stock,
        sku: related!.sku,
        description: related!.shortDescription,
        subcategory: { name: productSubcategoryName, slug: related!.subcategorySlug },
        category: { name: categoryName, slug: categorySlug },
      }));
  }, [categoryName, categorySlug, product.relatedProducts, product.relatedSlugs, productSubcategoryName]);

  function cartPayload() {
    return {
      id: product.sku || product.slug,
      name: product.name,
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
    setTimeout(() => setCartAdded(false), 1800);
  }

  function handleBuyNow() {
    if (!available) return;
    addCartItem(cartPayload(), quantity);
    window.location.href = "/carrinho";
  }

  const infoBlocks = [
    { title: "Descricao", text: product.longDescription || product.shortDescription },
    { title: "Beneficios", text: product.benefits },
    { title: "Modo de uso", text: product.howToUse },
    { title: "Composicao", text: product.composition },
    { title: "Cuidados e recomendacoes", text: product.careInstructions },
    { title: "Conteudo da embalagem", text: product.packageContents },
  ];

  return (
    <div className="min-h-screen bg-white pt-28 pb-32 md:pb-20">
      <nav className="mx-auto max-w-7xl px-4 pb-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-gray-400">
          <li>
            <Link href="/" className="hover:text-pink-500">
              Inicio
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href={categorySlug === "produtos" ? "/produtos" : `/categoria/${categorySlug}`} className="hover:text-pink-500">
              {categoryName}
            </Link>
          </li>
          {productSubcategoryName ? (
            <>
              <li>/</li>
              <li className="text-gray-500">{productSubcategoryName}</li>
            </>
          ) : null}
        </ol>
      </nav>

      <main className="mx-auto max-w-7xl px-4">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_470px] lg:gap-10">
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-rose-50 shadow-[0_20px_60px_rgba(236,72,153,0.12)]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="h-full w-full object-contain p-5 sm:p-8"
                  loading="eager"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-pink-300">
                  <span className="text-6xl font-black">KA</span>
                  <span className="mt-2 text-sm font-bold">Imagem em revisao</span>
                </div>
              )}

              {product.badge && (
                <span className="absolute left-4 top-4 rounded-full bg-pink-500 px-3 py-1 text-xs font-black text-white shadow-lg">
                  {product.badge}
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border bg-pink-50 ${
                      selectedImage === index ? "border-pink-500" : "border-pink-100"
                    }`}
                    aria-label={`Ver foto ${index + 1}`}
                  >
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-[28px] border border-pink-100 bg-white p-5 shadow-[0_18px_50px_rgba(236,72,153,0.10)] sm:p-7">
            <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.12em]">
              <span className="rounded-full bg-pink-50 px-3 py-1 text-pink-500">KA Bijoux</span>
              {product.brand && <span className="rounded-full bg-gray-50 px-3 py-1 text-gray-500">Marca: {product.brand}</span>}
              {product.sku && <span className="rounded-full bg-gray-50 px-3 py-1 text-gray-500">SKU: {product.sku}</span>}
              {product.ean && <span className="rounded-full bg-gray-50 px-3 py-1 text-gray-500">EAN: {product.ean}</span>}
            </div>

            <h1 className="mt-4 text-2xl font-black leading-tight text-gray-950 sm:text-3xl">
              {product.name}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              {product.shortDescription || "Produto selecionado pela KA Bijoux."}
            </p>

            <div className="mt-6 rounded-3xl bg-pink-50 px-4 py-4">
              {product.promotionalPrice ? (
                <p className="text-sm font-bold text-gray-400 line-through">{fmt(product.price)}</p>
              ) : null}
              <p className="text-3xl font-black text-pink-500">{fmt(finalPrice)}</p>
              <p className="mt-1 text-sm font-semibold text-gray-600">
                ou {installmentCount}x de {installmentValue} sem juros
              </p>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-gray-400">Quantidade</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-pink-100 bg-white text-lg font-black text-pink-500"
                  aria-label="Diminuir quantidade"
                >
                  -
                </button>
                <span className="min-w-10 text-center text-lg font-black text-gray-950">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(Math.max(product.stock, 1), q + 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-pink-100 bg-white text-lg font-black text-pink-500"
                  aria-label="Aumentar quantidade"
                >
                  +
                </button>
                <span className={`text-xs font-bold ${available ? "text-green-600" : "text-red-500"}`}>
                  {available ? `${product.stock} em estoque` : "Sem estoque"}
                </span>
              </div>
            </div>

            <div className="mt-6 hidden gap-3 md:grid md:grid-cols-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!available}
                className={`rounded-2xl px-5 py-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(236,72,153,0.28)] transition-all disabled:opacity-50 ${
                  cartAdded ? "bg-green-500" : "bg-gradient-to-r from-pink-500 to-rose-400"
                }`}
              >
                {cartAdded ? "Adicionado" : "Adicionar ao carrinho"}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!available}
                className="rounded-2xl border border-pink-200 bg-white px-5 py-4 text-sm font-black text-pink-600 transition-colors hover:bg-pink-50 disabled:opacity-50"
              >
                Comprar agora
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              <DeliveryItem title="Retirada na loja" text="Disponivel para produtos em estoque." />
              <DeliveryItem title="Mototaxi Itauna" text="Entrega local por R$10." />
              <DeliveryItem title="Correios" text="Disponivel quando o produto e o CEP permitirem envio." />
              <DeliveryItem title="Compra segura" text="Pagamento protegido e atendimento KA Bijoux." />
            </div>
          </aside>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {infoBlocks.map((block) => (
            <InfoCard key={block.title} title={block.title} text={block.text} />
          ))}
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-14">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">KA Bijoux</p>
                <h2 className="mt-1 text-2xl font-black text-gray-950">Produtos relacionados</h2>
              </div>
              <Link href="/produtos" className="text-sm font-black text-pink-500">
                Ver vitrine
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {relatedProducts.map((related, index) => (
                <ProductCard key={related.id} product={related} revealDelay={index * 60} />
              ))}
            </div>
          </section>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-pink-100 bg-white/95 p-3 shadow-[0_-16px_38px_rgba(236,72,153,0.12)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-[1fr_1fr] gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!available}
            className={`min-h-12 rounded-2xl px-3 text-sm font-black text-white disabled:opacity-50 ${
              cartAdded ? "bg-green-500" : "bg-gradient-to-r from-pink-500 to-rose-400"
            }`}
          >
            {cartAdded ? "Adicionado" : "Adicionar"}
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={!available}
            className="min-h-12 rounded-2xl border border-pink-200 bg-white px-3 text-sm font-black text-pink-600 disabled:opacity-50"
          >
            Comprar agora
          </button>
        </div>
      </div>
    </div>
  );
}

function DeliveryItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-pink-100 bg-white px-4 py-3">
      <p className="text-sm font-black text-gray-950">{title}</p>
      <p className="mt-0.5 text-xs font-semibold leading-relaxed text-gray-500">{text}</p>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text?: string | null }) {
  const value = text?.trim();
  const missing = !value || value.length < 8;

  return (
    <article className="rounded-[24px] border border-pink-100 bg-white p-5 shadow-[0_12px_34px_rgba(236,72,153,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-gray-950">{title}</h3>
        {missing && (
          <span className="rounded-full bg-yellow-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-yellow-700">
            Nao informado
          </span>
        )}
      </div>
      <p className={`mt-3 text-sm leading-relaxed ${missing ? "text-gray-400" : "text-gray-600"}`}>
        {missing ? "Informacao tecnica pendente de revisao manual." : value}
      </p>
    </article>
  );
}
