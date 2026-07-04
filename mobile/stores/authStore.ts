import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { authApi } from "@/services/api";
import { registerPushToken, unregisterPushToken } from "@/lib/pushNotifications";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface AuthState {
  customer: Customer | null;
  token: string | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  customer: null,
  token: null,
  isLoading: true,

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync("ka-token");
      const customerJson = await SecureStore.getItemAsync("ka-customer");
      if (token && customerJson) {
        set({ token, customer: JSON.parse(customerJson), isLoading: false });
        // Registrar push token em background (não bloqueia a sessão)
        registerPushToken().catch(() => {});
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await authApi.login(email, password);
    const { token, customer } = res.data.data;
    await SecureStore.setItemAsync("ka-token", token);
    await SecureStore.setItemAsync("ka-customer", JSON.stringify(customer));
    set({ token, customer });
    registerPushToken().catch(() => {});
  },

  register: async (data) => {
    const res = await authApi.register(data);
    const { token, customer } = res.data.data;
    await SecureStore.setItemAsync("ka-token", token);
    await SecureStore.setItemAsync("ka-customer", JSON.stringify(customer));
    set({ token, customer });
    registerPushToken().catch(() => {});
  },

  logout: async () => {
    await unregisterPushToken();
    await SecureStore.deleteItemAsync("ka-token");
    await SecureStore.deleteItemAsync("ka-customer");
    set({ token: null, customer: null });
  },
}));
