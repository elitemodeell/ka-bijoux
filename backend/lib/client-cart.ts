"use client";

import { getValidPromotionalPrice } from "@/lib/store-rules";

export type ClientCartMedia = {
  url: string;
  alt?: string | null;
};

export type ClientCartProduct = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  promo?: number | null;
  promotionalPrice?: number | string | null;
  image?: string | null;
  images?: ClientCartMedia[];
  stock?: number;
  sku?: string | null;
  category?: { name: string; slug?: string } | null;
  subcategory?: { name: string; slug?: string } | null;
};

export type ClientCartItem = ClientCartProduct & {
  quantity: number;
  unitPrice: number;
  addedAt: string;
};

export const CART_EVENT = "ka:cart-updated";

const CART_KEY = "ka-bijoux-cart";

function canUseCartStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function toNumber(value: number | string | null | undefined, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function normalizeCartProduct(product: ClientCartProduct): ClientCartProduct {
  const images = product.images?.length
    ? product.images.map((image) => ({ url: image.url, alt: image.alt ?? product.name }))
    : product.image
      ? [{ url: product.image, alt: product.name }]
      : [];

  const price = toNumber(product.price);
  const promoValue = product.promo ?? product.promotionalPrice ?? null;
  const promo = getValidPromotionalPrice(price, promoValue);

  return {
    ...product,
    price,
    promo,
    image: product.image || images[0]?.url || null,
    images,
    description: product.description || "Produto selecionado com carinho pela KA Bijoux.",
    stock: product.stock ?? 99,
  };
}

export function getCartItems(): ClientCartItem[] {
  if (!canUseCartStorage()) return [];

  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ClientCartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCartItems(items: ClientCartItem[]) {
  if (!canUseCartStorage()) return items;

  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent<ClientCartItem[]>(CART_EVENT, { detail: items }));
  return items;
}

export function addCartItem(product: ClientCartProduct, quantity = 1) {
  const normalized = normalizeCartProduct(product);
  const items = getCartItems();
  const currentIndex = items.findIndex((item) => item.id === normalized.id);
  const safeQuantity = Math.max(1, quantity);
  const unitPrice = normalized.promo ?? normalized.price;

  if (currentIndex >= 0) {
    items[currentIndex] = {
      ...items[currentIndex],
      ...normalized,
      unitPrice,
      quantity: items[currentIndex].quantity + safeQuantity,
    };
  } else {
    items.unshift({
      ...normalized,
      quantity: safeQuantity,
      unitPrice,
      addedAt: new Date().toISOString(),
    });
  }

  return saveCartItems(items);
}

export function updateCartItem(productId: string, quantity: number) {
  const items = getCartItems();
  const nextItems =
    quantity <= 0
      ? items.filter((item) => item.id !== productId)
      : items.map((item) => (item.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item));

  return saveCartItems(nextItems);
}

export function removeCartItem(productId: string) {
  return saveCartItems(getCartItems().filter((item) => item.id !== productId));
}

export function clearCart() {
  return saveCartItems([]);
}

export function getCartCount(items = getCartItems()) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartSubtotal(items = getCartItems()) {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function subscribeCart(listener: (items: ClientCartItem[]) => void) {
  if (typeof window === "undefined") return () => undefined;

  function onCartUpdated(event: Event) {
    listener((event as CustomEvent<ClientCartItem[]>).detail ?? getCartItems());
  }

  window.addEventListener(CART_EVENT, onCartUpdated);
  window.addEventListener("storage", onCartUpdated);

  return () => {
    window.removeEventListener(CART_EVENT, onCartUpdated);
    window.removeEventListener("storage", onCartUpdated);
  };
}
