import { create } from "zustand";

export interface ShippingOption {
  type: string;
  name: string;
  description: string;
  price: number;
  estimatedDays?: number;
  available: boolean;
}

interface CheckoutState {
  addressId: string | null;
  zipCode: string;
  shippingOptions: ShippingOption[];
  selectedShipping: ShippingOption | null;
  paymentMethod: "PIX" | "CARTAO_CREDITO" | null;
  isCalculatingShipping: boolean;

  setAddress: (addressId: string) => void;
  setZipCode: (zip: string) => void;
  setShippingOptions: (options: ShippingOption[]) => void;
  selectShipping: (option: ShippingOption) => void;
  setPaymentMethod: (method: "PIX" | "CARTAO_CREDITO") => void;
  setCalculatingShipping: (v: boolean) => void;
  reset: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  addressId: null,
  zipCode: "",
  shippingOptions: [],
  selectedShipping: null,
  paymentMethod: null,
  isCalculatingShipping: false,

  setAddress: (addressId) => set({ addressId }),
  setZipCode: (zipCode) => set({ zipCode }),
  setShippingOptions: (shippingOptions) => set({ shippingOptions }),
  selectShipping: (selectedShipping) => set({ selectedShipping }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setCalculatingShipping: (v) => set({ isCalculatingShipping: v }),
  reset: () => set({
    addressId: null, zipCode: "", shippingOptions: [],
    selectedShipping: null, paymentMethod: null,
  }),
}));
