import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ShippingType = "CORREIOS" | "MOTOTAXI" | "RETIRADA";
export type CheckoutPaymentMethod = "PIX" | "CREDIT_CARD" | "BOLETO";

export interface ShippingOption {
  id: string;
  type: ShippingType;
  name: string;
  description: string;
  price: number;
  estimatedDays?: number;
  available: boolean;
}

interface CheckoutState {
  addressId: string | null;
  addressCustomerId: string | null;
  zipCode: string;
  shippingOptions: ShippingOption[];
  selectedShipping: ShippingOption | null;
  checkoutAttemptKey: string | null;
  paymentMethod: CheckoutPaymentMethod;
  installmentCount: number;
  isCalculatingShipping: boolean;

  setAddress: (addressId: string | null, customerId: string | null) => void;
  setZipCode: (zip: string) => void;
  setShippingOptions: (options: ShippingOption[]) => void;
  selectShipping: (option: ShippingOption) => void;
  ensureIdempotencyKey: () => string;
  setPaymentMethod: (method: CheckoutPaymentMethod) => void;
  setInstallmentCount: (count: number) => void;
  setCalculatingShipping: (value: boolean) => void;
  reset: (options?: { preserveAddress?: boolean }) => void;
}

function generateUuidLike(): string {
  let seed = Date.now();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = (seed + Math.random() * 16) % 16 | 0;
    seed = Math.floor(seed / 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function sameShippingOption(
  left: ShippingOption | null,
  right: ShippingOption | null
): boolean {
  return Boolean(
    left &&
      right &&
      left.id === right.id &&
      left.type === right.type &&
      left.price === right.price &&
      left.available === right.available &&
      left.estimatedDays === right.estimatedDays
  );
}

export const useCheckoutStore = create<CheckoutState>()(
  persist((set, get) => ({
  addressId: null,
  addressCustomerId: null,
  zipCode: "",
  shippingOptions: [],
  selectedShipping: null,
  checkoutAttemptKey: null,
  paymentMethod: "PIX",
  installmentCount: 1,
  isCalculatingShipping: false,

  setAddress: (addressId, addressCustomerId) =>
    set((state) => ({
      addressId,
      addressCustomerId,
      shippingOptions: state.addressId === addressId ? state.shippingOptions : [],
      selectedShipping: state.addressId === addressId ? state.selectedShipping : null,
      checkoutAttemptKey:
        state.addressId === addressId && state.addressCustomerId === addressCustomerId ? state.checkoutAttemptKey : null,
    })),
  setZipCode: (zipCode) => set({ zipCode }),
  setShippingOptions: (shippingOptions) =>
    set((state) => {
      const matchingSelection = state.selectedShipping
        ? shippingOptions.find((option) => option.id === state.selectedShipping?.id) ?? null
        : null;
      const quoteUnchanged = sameShippingOption(
        state.selectedShipping,
        matchingSelection
      );
      return {
        shippingOptions,
        selectedShipping: quoteUnchanged ? matchingSelection : null,
        checkoutAttemptKey: quoteUnchanged ? state.checkoutAttemptKey : null,
      };
    }),
  selectShipping: (selectedShipping) =>
    set((state) => ({
      selectedShipping,
      checkoutAttemptKey: sameShippingOption(
        state.selectedShipping,
        selectedShipping
      )
        ? state.checkoutAttemptKey
        : null,
    })),
  ensureIdempotencyKey: () => {
    const existing = get().checkoutAttemptKey;
    if (existing) return existing;
    const checkoutAttemptKey = generateUuidLike();
    set({ checkoutAttemptKey });
    return checkoutAttemptKey;
  },
  setPaymentMethod: (paymentMethod) =>
    set((state) => ({
      paymentMethod,
      installmentCount:
        paymentMethod === "CREDIT_CARD" ? state.installmentCount : 1,
      checkoutAttemptKey:
        state.paymentMethod === paymentMethod ? state.checkoutAttemptKey : null,
    })),
  setInstallmentCount: (installmentCount) =>
    set((state) => ({
      installmentCount,
      checkoutAttemptKey:
        state.installmentCount === installmentCount
          ? state.checkoutAttemptKey
          : null,
    })),
  setCalculatingShipping: (isCalculatingShipping) => set({ isCalculatingShipping }),
  reset: (options) =>
    set((state) => ({
      addressId: options?.preserveAddress ? state.addressId : null,
      addressCustomerId: options?.preserveAddress ? state.addressCustomerId : null,
      zipCode: "",
      shippingOptions: [],
      selectedShipping: null,
      checkoutAttemptKey: null,
      paymentMethod: "PIX",
      installmentCount: 1,
      isCalculatingShipping: false,
    })),
  }), {
    name: "ka-checkout-attempt-v1",
    storage: createJSONStorage(() => AsyncStorage),
    version: 1,
    partialize: (state) => ({
      addressId: state.addressId,
      addressCustomerId: state.addressCustomerId,
      zipCode: state.zipCode,
      shippingOptions: state.shippingOptions,
      selectedShipping: state.selectedShipping,
      checkoutAttemptKey: state.checkoutAttemptKey,
      paymentMethod: state.paymentMethod,
      installmentCount: state.installmentCount,
    }),
  })
);
