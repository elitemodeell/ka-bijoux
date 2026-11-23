import { create } from "zustand";
import { cartApi, type DirectSelection } from "@/services/api";

export interface CartItemData {
  id: string;
  productId: string;
  variationId?: string;
  selectedPhotoUrl?: string | null;
  selectionLabel?: string | null;
  quantity: number;
  unitPrice: number;
  product: {
    name: string;
    sku?: string | null;
    images: Array<{ url: string }>;
    stock: number;
    active: boolean;
  };
  variation?: { name: string; value: string; stock: number; imageUrl?: string | null; sku?: string | null } | null;
}

interface CartState {
  items: CartItemData[];
  subtotal: number;
  total: number;
  itemCount: number;
  isLoading: boolean;
  directCheckout: { key: string; selection: DirectSelection; item: CartItemData } | null;

  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number, variationId?: string, selectedPhotoUrl?: string) => Promise<void>;
  buyNow: (productId: string, quantity?: number, variationId?: string, selectedPhotoUrl?: string) => Promise<string>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  resetLocal: () => void;
}

let nextDirectCheckout = 0;

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
  directCheckout: null,

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

  addItem: async (productId, quantity = 1, variationId, selectedPhotoUrl) => {
    const previousCount = get().itemCount;
    set({ itemCount: previousCount + quantity });
    try {
      const response = await cartApi.addItem(productId, quantity, variationId, "INCREMENT", selectedPhotoUrl);
      set(cartSnapshot(response.data.data));
    } catch (error) {
      set({ itemCount: previousCount });
      throw error;
    }
  },

  buyNow: async (productId, quantity = 1, variationId, selectedPhotoUrl) => {
    const selection = { productId, quantity, variationId, selectedPhotoUrl };
    const key = String(++nextDirectCheckout);
    const response = await cartApi.previewDirect(selection);
    if (key !== String(nextDirectCheckout)) throw new Error("DIRECT_CHECKOUT_CHANGED");
    set({ directCheckout: { key, selection, item: response.data.data } });
    return key;
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
  resetLocal: () => {
    nextDirectCheckout += 1;
    set({ items: [], subtotal: 0, total: 0, itemCount: 0, isLoading: false, directCheckout: null });
  },
}));
