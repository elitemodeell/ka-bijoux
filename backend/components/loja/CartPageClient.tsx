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

const WHATSAPP_NUMBER = "5537999999999";

function buildWhatsAppMessage(
  items: ClientCartItem[],
  subtotal: number,
  orderNumber: string,
  name?: string,
  phone?: string,
  payment?: string
) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const lines = [
    `*Pedido ${orderNumber} — KA Bijoux*`,
    "",
    "*Itens:*",
    ...items.map(
      (item) =>
        `• ${item.quantity}x ${item.name} — ${fmt(item.unitPrice * item.quantity)}`
    ),
    "",
    `*Total: ${fmt(subtotal)}*`,
  ];

  if (name) lines.push("", `*Cliente:* ${name}`);
  if (phone) lines.push(`*Telefone:* ${phone}`);
  if (payment) lines.push(`*Pagamento:* ${payment}`);

  return encodeURIComponent(lines.join("\n"));
}

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

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = data.get("name") as string;
    const phone = data.get("phone") as string;
    const payment = data.get("payment") as string;

    const number = `KA-${Date.now().toString().slice(-6)}`;
    setLastSubtotal(subtotal);
    setOrderNumber(number);

    const msg = buildWhatsAppMessage(items, subtotal, number, name, phone, payment);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");

    setCheckoutOpen(false);
    setItems(clearCart());
  }

  if (orderNumber) {
    return (
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <div className="rounded-[28px] border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-white px-6 py-12 text-center shadow-[0_18px_60px_rgba(236,72,153,0.10)]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">Pedido enviado</p>
          <h1 className="mt-3 font-playfair text-4xl font-bold text-gray-950">Pedido recebido!</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-500">
            Numero do pedido: <strong className="text-gray-900">{orderNumber}</strong>. Total:{" "}
            <strong className="text-pink-500">{formatCurrency(lastSubtotal)}</strong>.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-gray-400">
            O resumo foi enviado pelo WhatsApp. Nossa equipe vai confirmar o pagamento e prazo de entrega em breve.
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
              Novo carrinho
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
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${buildWhatsAppMessage(items, subtotal, `KA-${Date.now().toString().slice(-6)}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
              </svg>
              Pedir pelo WhatsApp
            </a>
            <Link
              href="/produtos"
              className="rounded-2xl border border-pink-100 bg-white px-6 py-3 text-center text-sm font-bold text-pink-500 transition-colors hover:bg-pink-50"
            >
              Continuar comprando
            </Link>
          </div>

          {checkoutOpen && (
            <form onSubmit={submitCheckout} className="mt-5 space-y-3 rounded-2xl border border-pink-100 bg-pink-50 p-3">
              <p className="text-sm font-black text-gray-900">Seus dados</p>
              <p className="text-xs text-gray-500">Vamos enviar seu pedido pelo WhatsApp para confirmar pagamento e entrega.</p>
              <input
                required
                name="name"
                placeholder="Nome completo"
                className="w-full rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:border-pink-300"
              />
              <input
                required
                name="phone"
                placeholder="Seu WhatsApp / telefone"
                className="w-full rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:border-pink-300"
              />
              <select name="payment" className="w-full rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:border-pink-300">
                <option>Pix</option>
                <option>Cartao de credito</option>
                <option>Dinheiro (retirada)</option>
              </select>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-emerald-700 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
                Enviar pedido pelo WhatsApp
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
