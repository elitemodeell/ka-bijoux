import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { AUTH_MODE_KEY, authApi, setAuthSessionInvalidatedHandler } from "@/services/api";
import { registerPushToken, unregisterPushToken } from "@/lib/pushNotifications";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { useCartStore } from "@/stores/cartStore";
import { getSupabaseClientIfConfigured } from "@/lib/supabase";
import { logAuthFailure } from "@/lib/authDiagnostics";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string | null;
}

interface AuthState {
  customer: Customer | null;
  token: string | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; phone?: string; password: string; acceptedTerms: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  setCustomer: (customer: Customer) => Promise<void>;
  completeSupabaseLogin: (data: {
    accessToken: string;
    refreshToken: string;
    customer: Customer;
  }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  customer: null,
  token: null,
  isLoading: true,

  loadSession: async () => {
    try {
      let token = await SecureStore.getItemAsync("ka-token");
      const authMode = await SecureStore.getItemAsync(AUTH_MODE_KEY);
      if (authMode === "supabase") {
        const supabase = getSupabaseClientIfConfigured();
        if (supabase) {
          const session = (await supabase.auth.getSession()).data.session;
          if (session) {
            token = session.access_token;
            await SecureStore.setItemAsync("ka-token", session.access_token);
            await SecureStore.setItemAsync("ka-refresh-token", session.refresh_token);
          } else {
            token = null;
            await SecureStore.deleteItemAsync("ka-token");
            await SecureStore.deleteItemAsync("ka-refresh-token");
            await SecureStore.deleteItemAsync("ka-customer");
            await SecureStore.deleteItemAsync(AUTH_MODE_KEY);
          }
        }
      }
      const customerJson = await SecureStore.getItemAsync("ka-customer");
      if (token && customerJson) {
        set({ token, customer: JSON.parse(customerJson), isLoading: false });
        // Registrar push token em background (não bloqueia a sessão)
        registerPushToken().catch(() => {});
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      logAuthFailure("session", "restore", error);
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    useCheckoutStore.getState().reset({ preserveAddress: true });
    useCartStore.getState().resetLocal();
    let res;
    try {
      res = await authApi.login(email, password);
    } catch (error) {
      logAuthFailure("password", "backend_login", error);
      throw error;
    }
    await getSupabaseClientIfConfigured()?.auth.signOut({ scope: "local" }).catch(() => undefined);
    const { token, refreshToken, customer } = res.data.data;
    if (!token || !customer?.id) {
      const error = new Error("Resposta de login sem sessão ativa");
      logAuthFailure("password", "response_validation", error);
      throw error;
    }
    await SecureStore.setItemAsync("ka-token", token);
    if (refreshToken) await SecureStore.setItemAsync("ka-refresh-token", refreshToken);
    else await SecureStore.deleteItemAsync("ka-refresh-token");
    await SecureStore.setItemAsync(AUTH_MODE_KEY, "backend");
    await SecureStore.setItemAsync("ka-customer", JSON.stringify(customer));
    set({ token, customer });
    registerPushToken().catch(() => {});
  },

  register: async (data) => {
    useCheckoutStore.getState().reset({ preserveAddress: true });
    useCartStore.getState().resetLocal();
    let res;
    try {
      res = await authApi.register(data);
    } catch (error) {
      logAuthFailure("registration", "backend_register", error);
      throw error;
    }
    await getSupabaseClientIfConfigured()?.auth.signOut({ scope: "local" }).catch(() => undefined);
    const { token, refreshToken, customer } = res.data.data;
    if (!token || !customer?.id) {
      const error = new Error("Resposta de cadastro sem sessão ativa");
      logAuthFailure("registration", "response_validation", error);
      throw error;
    }
    await SecureStore.setItemAsync("ka-token", token);
    if (refreshToken) await SecureStore.setItemAsync("ka-refresh-token", refreshToken);
    else await SecureStore.deleteItemAsync("ka-refresh-token");
    await SecureStore.setItemAsync(AUTH_MODE_KEY, "backend");
    await SecureStore.setItemAsync("ka-customer", JSON.stringify(customer));
    set({ token, customer });
    registerPushToken().catch(() => {});
  },

  logout: async () => {
    useCheckoutStore.getState().reset({ preserveAddress: true });
    useCartStore.getState().resetLocal();
    await unregisterPushToken();
    await authApi.logout().catch((error) => logAuthFailure("logout", "backend_revoke", error));
    await SecureStore.deleteItemAsync("ka-token");
    await SecureStore.deleteItemAsync("ka-refresh-token");
    await SecureStore.deleteItemAsync("ka-customer");
    await SecureStore.deleteItemAsync(AUTH_MODE_KEY);
    await getSupabaseClientIfConfigured()?.auth.signOut({ scope: "local" }).catch(() => undefined);
    set({ token: null, customer: null });
  },

  setCustomer: async (customer) => {
    await SecureStore.setItemAsync("ka-customer", JSON.stringify(customer));
    set({ customer });
  },

  completeSupabaseLogin: async ({ accessToken, refreshToken, customer }) => {
    useCheckoutStore.getState().reset({ preserveAddress: true });
    useCartStore.getState().resetLocal();
    await SecureStore.setItemAsync("ka-token", accessToken);
    await SecureStore.setItemAsync("ka-refresh-token", refreshToken);
    await SecureStore.setItemAsync("ka-customer", JSON.stringify(customer));
    await SecureStore.setItemAsync(AUTH_MODE_KEY, "supabase");
    set({ token: accessToken, customer, isLoading: false });
    registerPushToken().catch(() => {});
  },
}));

setAuthSessionInvalidatedHandler(() => {
  useCheckoutStore.getState().reset({ preserveAddress: true });
  useCartStore.getState().resetLocal();
  useAuthStore.setState({ token: null, customer: null, isLoading: false });
});
