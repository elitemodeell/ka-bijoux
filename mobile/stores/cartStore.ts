import { create } from "zustand";
import { cartApi } from "@/services/api";

export interface CartItemData {
  id: string;
  productId: string;
  variationId?: string;
  quantity: number;
  unitPrice: number;
  product: {
    name: string;
    images: Array<{ url: string }>;
    stock: number;
    active: boolean;
  };
  variation?: { name: string; value: string; stock: number };
}

interface CartState {
  items: CartItemData[];
  subtotal: number;
  total: number;
  itemCount: number;
  isLoading: boolean;
  isBuyingNow: boolean;

  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number, variationId?: string) => Promise<void>;
  buyNow: (productId: string, quantity?: number, variationId?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  resetLocal: () => void;
}

const pendingBuyNow = new Map<string, Promise<void>>();

function cartSnapshot(data: Partial<CartState>) {
  return {
    items: data.items ?? [],
    subtotal: data.subtotal ?? 0,
    total: data.total ?? 0,
    itemCount: data.itemCount ?? 0,
    isLoading: false,
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  subtotal: 0,
  total: 0,
  itemCount: 0,
  isLoading: false,
  isBuyingNow: false,

  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const res = await cartApi.get();
      const data = res.data.data;
      set(cartSnapshot(data));
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, quantity = 1, variationId) => {
    const previousCount = get().itemCount;
    set({ itemCount: previousCount + quantity });
    try {
      const response = await cartApi.addItem(productId, quantity, variationId);
      set(cartSnapshot(response.data.data));
    } catch (error) {
      set({ itemCount: previousCount });
      throw error;
    }
  },

  buyNow: async (productId, quantity = 1, variationId) => {
    const key = `${productId}:${variationId ?? "default"}`;
    const pending = pendingBuyNow.get(key);
    if (pending) return pending;
    const operation = (async () => {
      const previousCount = get().itemCount;
      set({ itemCount: quantity, isBuyingNow: true });
      try {
        const response = await cartApi.addItem(productId, quantity, variationId, "BUY_NOW");
        set(cartSnapshot(response.data.data));
      } catch (error) {
        set({ itemCount: previousCount });
        throw error;
      } finally {
        set({ isBuyingNow: false });
      }
    })();
    pendingBuyNow.set(key, operation);
    try {
      await operation;
    } finally {
      if (pendingBuyNow.get(key) === operation) pendingBuyNow.delete(key);
    }
  },

  updateItem: async (itemId, quantity) => {
    const response = await cartApi.updateItem(itemId, quantity);
    set(cartSnapshot(response.data.data));
  },

  removeItem: async (itemId) => {
    const response = await cartApi.removeItem(itemId);
    set(cartSnapshot(response.data.data));
  },

  clearCart: async () => {
    await cartApi.clear();
    set({ items: [], subtotal: 0, total: 0, itemCount: 0 });
  },
  resetLocal: () => set({ items: [], subtotal: 0, total: 0, itemCount: 0, isLoading: false, isBuyingNow: false }),
}));
