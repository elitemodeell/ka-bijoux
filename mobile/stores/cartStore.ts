import { create } from "zustand";
import { cartApi } from "@/services/api";
import { shouldHideCatalogItemOnIos } from "@/lib/iosCatalogPolicy";

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
    category?: { slug?: string | null } | null;
  };
  variation?: { name: string; value: string };
}

interface CartState {
  items: CartItemData[];
  subtotal: number;
  total: number;
  itemCount: number;
  isLoading: boolean;

  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number, variationId?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  subtotal: 0,
  total: 0,
  itemCount: 0,
  isLoading: false,

  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const res = await cartApi.get();
      const data = res.data.data;
      const items = (data.items ?? []).filter((item: CartItemData) => !shouldHideCatalogItemOnIos(item.product));
      const subtotal = items.reduce((sum: number, item: CartItemData) => sum + item.unitPrice * item.quantity, 0);
      set({
        items,
        subtotal,
        total: subtotal,
        itemCount: items.length,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, quantity = 1, variationId) => {
    await cartApi.addItem(productId, quantity, variationId);
    await get().fetchCart();
  },

  updateItem: async (itemId, quantity) => {
    await cartApi.updateItem(itemId, quantity);
    await get().fetchCart();
  },

  removeItem: async (itemId) => {
    await cartApi.removeItem(itemId);
    await get().fetchCart();
  },

  clearCart: async () => {
    await cartApi.clear();
    set({ items: [], subtotal: 0, total: 0, itemCount: 0 });
  },
}));
