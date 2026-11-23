"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { getCartItemKey, getCartItems, saveCartItems } from "@/lib/client-cart";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { ShippingOption } from "@/lib/shipping";

type Profile = { id: string; cpf: string | null };
type Address = { id: string; street: string; number: string; city: string; state: string; zipCode: string };
type Method = { method: string; label: string; installments: number[] };
type Cart = {
  subtotal: number;
  items: { id: string; quantity: number; unitPrice: string | number; product: { name: string; sku?: string | null; stock?: number; images?: { url: string }[] }; variation: { name: string; value: string; sku?: string | null; imageUrl?: string | null; stock?: number } | null }[];
};
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  payment: { status: string; pixCode?: string; boletoDigitableLine?: string; boletoUrl?: string; checkoutUrl?: string } | null;
};
type Attempt = {
  addressId?: string;
  shippingType: ShippingOption["type"];
  shippingOptionId: string;
  paymentMethod: string;
  installmentCount: number;
  couponCode?: string;
  idempotencyKey: string;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const addressFields = [
  ["street", "Rua"], ["number", "Número"], ["neighborhood", "Bairro"],
  ["city", "Cidade"], ["state", "UF"], ["zipCode", "CEP"],
] as const;
const inputStyle = "w-full rounded-xl border border-gray-300 bg-white p-2";
const buttonStyle = "rounded-xl bg-pink-600 px-4 py-2 font-semibold text-white disabled:opacity-50";

class RequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, body?: unknown, method = body === undefined ? "GET" : "POST"): Promise<T> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  if (!data.session) throw new RequestError("Entre na sua conta para continuar.", 401);
  const response = await fetch(path, {
    method, cache: "no-store",
    headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json() as { data: T; error?: string };
  if (!response.ok) throw new RequestError(payload.error ?? "Não foi possível concluir a solicitação.", response.status);
  return payload.data;
}

function paymentLink(value?: string) {
  if (!value) return undefined;
  try {
    return new URL(value).protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

export default function WebCheckout() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [addingAddress, setAddingAddress] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [optionId, setOptionId] = useState("");
  const [methods, setMethods] = useState<Method[]>([]);
  const [method, setMethod] = useState("");
  const [installments, setInstallments] = useState(1);
  const [coupon, setCoupon] = useState("");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const running = useRef(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const customer = await request<Profile>("/api/customers/me");
        if (!alive) return;
        setProfile(customer);
        const savedAttempt = sessionStorage.getItem(`ka:checkout:${customer.id}`);
        if (savedAttempt) {
          setAttempt(JSON.parse(savedAttempt) as Attempt);
          return;
        }
        const lastOrder = sessionStorage.getItem(`ka:last-order:${customer.id}`);
        const snapshot = getCartItems();
        if (lastOrder && !snapshot.length && new URLSearchParams(location.search).has("pagamento")) {
          setOrder(await request<Order>(`/api/orders/${encodeURIComponent(lastOrder)}`));
          return;
        }
        const [list, payment] = await Promise.all([
          request<Address[]>("/api/customers/me/addresses"),
          request<{ methods: Method[] }>("/api/payments/methods"),
        ]);
        const current = snapshot.length
          ? await request<Cart>("/api/cart", {
            items: snapshot.map((item) => ({
              productId: item.id, variationId: item.variationId, quantity: item.quantity,
            })),
          })
          : await request<Cart>("/api/cart");
        if (!alive) return;
        const imported = new Map(snapshot.map((item) => [getCartItemKey(item), item.quantity]));
        saveCartItems(getCartItems().filter((item) => imported.get(getCartItemKey(item)) !== item.quantity));
        setCart(current);
        setAddresses(list);
        setAddressId(list[0]?.id ?? "");
        setMethods(payment.methods);
        setMethod(payment.methods[0]?.method ?? "");
      } catch (cause) {
        if (!alive) return;
        setNeedsLogin(cause instanceof RequestError && cause.status === 401);
        setError(cause instanceof Error ? cause.message : "O checkout está indisponível.");
      } finally {
        if (alive) setBusy(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  async function perform(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setNeedsLogin(cause instanceof RequestError && cause.status === 401);
      setError(cause instanceof Error ? cause.message : "Tente novamente.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    void perform(async () => {
      const address = await request<Address>("/api/customers/me/addresses", fields);
      setAddresses((list) => [...list, address]);
      setAddressId(address.id);
      setOptionId("");
      setOptions([]);
      setAddingAddress(false);
    });
  }

  function saveCpf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cpf = new FormData(event.currentTarget).get("cpf");
    void perform(async () => setProfile(await request<Profile>("/api/customers/me", { cpf }, "PATCH")));
  }

  function changeQuantity(itemId: string, quantity: number) {
    void perform(async () => {
      const path = `/api/cart/${encodeURIComponent(itemId)}`;
      if (quantity === 0) await request(path, undefined, "DELETE");
      else await request(path, { quantity }, "PATCH");
      setOptions([]);
      setOptionId("");
      setCart(await request<Cart>("/api/cart"));
    });
  }

  const shipping = options.find(({ id }) => id === optionId);
  const selectedMethod = methods.find((entry) => entry.method === method);

  function submit() {
    if (!profile || (!attempt && (!shipping || !method))) return;
    const next: Attempt = attempt ?? {
      addressId: shipping!.type === "RETIRADA" ? undefined : addressId || undefined,
      shippingType: shipping!.type, shippingOptionId: shipping!.id,
      paymentMethod: method, installmentCount: installments, idempotencyKey: crypto.randomUUID(),
      couponCode: coupon.trim() || undefined,
    };
    const key = `ka:checkout:${profile.id}`;
    void perform(async () => {
      sessionStorage.setItem(key, JSON.stringify(next));
      setAttempt(next);
      let result: Order;
      try {
        result = await request<Order>("/api/orders", next);
      } catch (cause) {
        if (cause instanceof RequestError && [400, 403, 404, 422].includes(cause.status)) {
          sessionStorage.removeItem(key);
          setAttempt(null);
          if (!cart) location.reload();
        }
        throw cause;
      }
      sessionStorage.setItem(`ka:last-order:${profile.id}`, result.id);
      sessionStorage.removeItem(key);
      setAttempt(null);
      setOrder(result);
      history.replaceState(null, "", "/checkout?pagamento");
    });
  }

  return (
    <section className="mx-auto max-w-xl space-y-5 rounded-3xl border border-pink-100 bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-bold">{order ? `Pedido ${order.orderNumber}` : "Finalizar compra"}</h1>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {needsLogin && <Link className={buttonStyle} href="/entrar?next=%2Fcheckout">Entrar com Google</Link>}
      {busy && <p role="status">Aguarde…</p>}
      {!needsLogin && (order ? (
        <div className="space-y-3">
          <p>Total {currency.format(order.total)}</p>
          <p>Pagamento {order.payment?.status === "PAGO" ? "confirmado" : "aguardando confirmação"}</p>
          {order.payment?.status !== "PAGO" && (
            <>
              {order.payment?.pixCode && <label className="block">Pix copia e cola
                <textarea className={inputStyle} readOnly value={order.payment.pixCode} />
              </label>}
              {order.payment?.boletoDigitableLine && <label className="block">Linha digitável
                <textarea className={inputStyle} readOnly value={order.payment.boletoDigitableLine} />
              </label>}
              {paymentLink(order.payment?.checkoutUrl ?? order.payment?.boletoUrl) && (
                <a className="block text-pink-700 underline" target="_blank" rel="noopener noreferrer"
                  href={paymentLink(order.payment?.checkoutUrl ?? order.payment?.boletoUrl)}>Abrir pagamento</a>
              )}
            </>
          )}
          <button className={buttonStyle} disabled={busy}
            onClick={() => void perform(async () => setOrder(await request<Order>(`/api/orders/${encodeURIComponent(order.id)}`)))}>
            Atualizar status
          </button>
        </div>
      ) : attempt ? (
        <button className={buttonStyle} disabled={busy} onClick={submit}>Retomar pagamento</button>
      ) : cart?.items.length && profile ? (
        <div className="space-y-5">
          <ul className="divide-y">
            {cart.items.map((item) => {
              const image = item.variation ? item.variation.imageUrl : item.product.images?.[0]?.url;
              const stock = item.variation?.stock ?? item.product.stock;
              return <li key={item.id} className="flex justify-between gap-3 py-2">
              {image && <img src={image} alt="" className="size-12 shrink-0 rounded object-cover" />}
              <div className="grow">
                <p>{item.product.name}{item.variation && ` · ${item.variation.name}: ${item.variation.value}`}</p>
                {stock != null && stock < item.quantity && <p className="text-sm text-red-700">Estoque insuficiente para esta quantidade.</p>}
                <div className="flex items-center gap-3">
                  <button disabled={busy} aria-label={`Diminuir quantidade de ${item.product.name}`}
                    onClick={() => changeQuantity(item.id, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button disabled={busy || item.quantity >= Math.min(99, stock ?? 99)} aria-label={`Aumentar quantidade de ${item.product.name}`}
                    onClick={() => changeQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
              </div>
              <span>{currency.format(Number(item.unitPrice) * item.quantity)}</span>
              </li>;
            })}
          </ul>
          {!profile.cpf && <form onSubmit={saveCpf} className="space-y-2">
            <label className="block">CPF para pagamento<input className={inputStyle} name="cpf" inputMode="numeric" required /></label>
            <button className={buttonStyle} disabled={busy}>Salvar CPF</button>
          </form>}
          <label className="block">Endereço
            <select className={inputStyle} value={addressId} disabled={busy}
              onChange={(event) => { setAddressId(event.target.value); setOptionId(""); setOptions([]); }}>
              <option value="">Sem endereço · retirada na loja</option>
              {addresses.map((address) => <option key={address.id} value={address.id}>{address.street}, {address.number} · {address.city}/{address.state}</option>)}
            </select>
          </label>
          <button type="button" className="text-pink-700 underline" onClick={() => setAddingAddress(!addingAddress)} disabled={busy}>
            {addingAddress ? "Cancelar novo endereço" : "Novo endereço"}
          </button>
          {addingAddress && <form onSubmit={saveAddress} className="grid grid-cols-2 gap-3">
            {addressFields.map(([name, label]) => <label key={name}>{label}<input className={inputStyle} name={name} required /></label>)}
            <button className={buttonStyle} disabled={busy}>Salvar endereço</button>
          </form>}
          <button className={buttonStyle} disabled={busy} onClick={() => void perform(async () => {
            const address = addresses.find(({ id }) => id === addressId);
            const list = await request<ShippingOption[]>("/api/shipping/calculate", address ? { addressId, zipCode: address.zipCode } : {});
            const available = list.filter((entry) => entry.available);
            setOptions(available);
            setOptionId(available[0]?.id ?? "");
            if (!available.length) setError("Nenhuma entrega disponível para esta seleção.");
          })}>Calcular entrega</button>
          {options.length > 0 && <label className="block">Entrega
            <select className={inputStyle} value={optionId} disabled={busy} onChange={(event) => setOptionId(event.target.value)}>
              {options.map((option) => <option key={option.id} value={option.id}>{option.name} · {currency.format(option.price)}</option>)}
            </select>
          </label>}
          <label className="block">Pagamento
            <select className={inputStyle} value={method} disabled={busy} onChange={(event) => { setMethod(event.target.value); setInstallments(1); }}>
              {methods.map((entry) => <option key={entry.method} value={entry.method}>{entry.label}</option>)}
            </select>
          </label>
          {selectedMethod && selectedMethod.installments.length > 1 && <label className="block">Parcelas
            <select className={inputStyle} value={installments} disabled={busy} onChange={(event) => setInstallments(Number(event.target.value))}>
              {selectedMethod.installments.map((count) => <option key={count} value={count}>{count}×</option>)}
            </select>
          </label>}
          <label className="block">Cupom (opcional)
            <input className={inputStyle} value={coupon} maxLength={50} disabled={busy}
              onChange={(event) => setCoupon(event.target.value)} />
          </label>
          <p className="font-bold">Total estimado {currency.format(cart.subtotal + (shipping?.price ?? 0))}</p>
          <button className={buttonStyle} disabled={busy || !shipping || !method || !profile.cpf} onClick={submit}>Gerar pagamento</button>
        </div>
      ) : cart && <p>Seu carrinho está vazio. <Link className="text-pink-700 underline" href="/produtos">Ver produtos</Link></p>)}
    </section>
  );
}
