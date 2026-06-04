"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  clearCart,
  getCartItems,
  getCartSubtotal,
  removeCartItem,
  subscribeCart,
  updateCartItem,
  type ClientCartItem,
} from "@/lib/client-cart";

export default function CartPageClient() {
  const [items, setItems] = useState<ClientCartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [lastSubtotal, setLastSubtotal] = useState(0);

  useEffect(() => {
    setItems(getCartItems());
    return subscribeCart(setItems);
  }, []);

  const subtotal = useMemo(() => getCartSubtotal(items), [items]);

  function changeQuantity(productId: string, quantity: number) {
    setItems(updateCartItem(productId, quantity));
  }

  function removeItem(productId: string) {
    setItems(removeCartItem(productId));
  }

  function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0) return;

    setLastSubtotal(subtotal);
    setOrderNumber(`KA-${Date.now().toString().slice(-6)}`);
    setCheckoutOpen(false);
    setItems(clearCart());
  }

  if (orderNumber) {
    return (
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <div className="rounded-[28px] border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-white px-6 py-12 text-center shadow-[0_18px_60px_rgba(236,72,153,0.10)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">Pedido no site</p>
          <h1 className="mt-3 font-playfair text-4xl font-bold text-gray-950">Compra registrada</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-500">
            Seu resumo foi gerado com o numero <strong className="text-gray-900">{orderNumber}</strong>. Total:{" "}
            <strong className="text-pink-500">{formatCurrency(lastSubtotal)}</strong>.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/produtos"
              className="ka-btn rounded-2xl bg-gradient-to-r from-pink-500 to-pink-400 px-7 py-3 text-sm font-bold text-white shadow-glow-lg"
            >
              Continuar comprando
            </Link>
            <button
              type="button"
              onClick={() => setOrderNumber("")}
              className="rounded-2xl border border-pink-100 bg-white px-7 py-3 text-sm font-bold text-pink-500 transition-colors hover:bg-pink-50"
            >
              Ver carrinho
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <div className="rounded-[28px] border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-white px-6 py-12 text-center shadow-[0_18px_60px_rgba(236,72,153,0.10)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">KA Bijoux</p>
          <h1 className="mt-3 font-playfair text-4xl font-bold text-gray-950">Seu carrinho esta vazio</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-500">
            Escolha seus produtos na vitrine e adicione ao carrinho para finalizar a compra pelo site.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/produtos"
              className="ka-btn rounded-2xl bg-gradient-to-r from-pink-500 to-pink-400 px-7 py-3 text-sm font-bold text-white shadow-glow-lg"
            >
              Ver produtos
            </Link>
            <Link
              href="/"
              className="rounded-2xl border border-pink-100 bg-white px-7 py-3 text-sm font-bold text-pink-500 transition-colors hover:bg-pink-50"
            >
              Voltar para inicio
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">KA Bijoux</p>
        <h1 className="mt-2 font-playfair text-4xl font-bold text-gray-950">Seu carrinho</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-500">
          Revise os produtos, ajuste as quantidades e finalize a compra pelo proprio site.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-[24px] border border-pink-100 bg-white p-3 shadow-[0_14px_40px_rgba(236,72,153,0.08)] sm:p-4">
              <div className="flex gap-3 sm:gap-4">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-pink-50 sm:h-28 sm:w-28">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-black text-pink-300">KA</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-pink-500">{item.category?.name ?? "KA Bijoux"}</p>
                      <h2 className="mt-1 line-clamp-2 text-base font-black text-gray-950">{item.name}</h2>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{item.description}</p>
                    </div>
                    <p className="shrink-0 text-lg font-black text-pink-500">{formatCurrency(item.unitPrice)}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center rounded-full border border-pink-100 bg-pink-50 p-1">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, item.quantity - 1)}
                        className="h-8 w-8 rounded-full bg-white text-lg font-bold text-pink-500 shadow-sm"
                        aria-label={`Diminuir quantidade de ${item.name}`}
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, item.quantity + 1)}
                        className="h-8 w-8 rounded-full bg-pink-500 text-lg font-bold text-white shadow-sm"
                        aria-label={`Aumentar quantidade de ${item.name}`}
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="text-sm font-black text-gray-900">{formatCurrency(item.unitPrice * item.quantity)}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="rounded-full border border-gray-100 px-3 py-2 text-xs font-bold text-gray-500 transition-colors hover:border-pink-200 hover:bg-pink-50 hover:text-pink-500"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="h-fit rounded-[28px] border border-pink-100 bg-white p-5 shadow-[0_18px_60px_rgba(236,72,153,0.10)] lg:sticky lg:top-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">Resumo</p>
          <div className="mt-4 space-y-3 border-b border-pink-50 pb-4">
            <div className="flex justify-between gap-4 text-sm text-gray-600">
              <span>Produtos</span>
              <span className="font-bold text-gray-900">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-black text-gray-950">{formatCurrency(subtotal)}</span>
            </div>
            <p className="rounded-2xl bg-pink-50 px-3 py-2 text-xs leading-relaxed text-pink-600">
              Frete e prazo sao calculados na finalizacao da compra.
            </p>
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <span className="text-sm font-semibold text-gray-600">Total</span>
            <span className="text-2xl font-black text-pink-500">{formatCurrency(subtotal)}</span>
          </div>

          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={() => setCheckoutOpen((current) => !current)}
              className="ka-btn rounded-2xl bg-gradient-to-r from-pink-600 to-pink-400 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_14px_30px_rgba(255,77,109,0.26)]"
            >
              Finalizar compra
            </button>
            <Link
              href="/produtos"
              className="rounded-2xl border border-pink-100 bg-white px-6 py-3 text-center text-sm font-bold text-pink-500 transition-colors hover:bg-pink-50"
            >
              Continuar comprando
            </Link>
          </div>

          {checkoutOpen && (
            <form onSubmit={submitCheckout} className="mt-5 space-y-3 rounded-2xl border border-pink-100 bg-pink-50 p-3">
              <p className="text-sm font-black text-gray-900">Dados para finalizacao</p>
              <input
                required
                name="name"
                placeholder="Nome completo"
                className="w-full rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:border-pink-300"
              />
              <input
                required
                type="email"
                name="email"
                placeholder="E-mail"
                className="w-full rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:border-pink-300"
              />
              <input
                required
                name="phone"
                placeholder="Telefone"
                className="w-full rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:border-pink-300"
              />
              <select name="payment" className="w-full rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:border-pink-300">
                <option>Pix</option>
                <option>Cartao</option>
              </select>
              <button type="submit" className="w-full rounded-xl bg-[#1A0A0F] px-4 py-3 text-sm font-black uppercase tracking-wide text-white">
                Confirmar pedido
              </button>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
