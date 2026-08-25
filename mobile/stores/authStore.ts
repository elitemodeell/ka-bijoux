import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { AUTH_MODE_KEY, authApi, setAuthSessionInvalidatedHandler } from "@/services/api";
import { registerPushToken, unregisterPushToken } from "@/lib/pushNotifications";
import { getSupabaseClientIfConfigured } from "@/lib/supabase";

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
  pendingRegistration: { name: string; email: string; password: string } | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; phone?: string; password: string; acceptedTerms: boolean }) => Promise<void>;
  verifyRegistration: (code: string) => Promise<void>;
  resendRegistrationCode: () => Promise<number>;
  clearPendingRegistration: () => void;
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
  pendingRegistration: null,

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
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await authApi.login(email, password);
    await getSupabaseClientIfConfigured()?.auth.signOut({ scope: "local" }).catch(() => undefined);
    const { token, refreshToken, customer } = res.data.data;
    await SecureStore.setItemAsync("ka-token", token);
    if (refreshToken) await SecureStore.setItemAsync("ka-refresh-token", refreshToken);
    else await SecureStore.deleteItemAsync("ka-refresh-token");
    await SecureStore.setItemAsync(AUTH_MODE_KEY, "backend");
    await SecureStore.setItemAsync("ka-customer", JSON.stringify(customer));
    set({ token, customer });
    registerPushToken().catch(() => {});
  },

  register: async (data) => {
    const res = await authApi.register(data);
    const responseEmail = String(res.data.data?.email ?? data.email).trim().toLowerCase();
    set({
      pendingRegistration: {
        name: data.name.trim(),
        email: responseEmail,
        password: data.password,
      },
    });
  },

  verifyRegistration: async (code) => {
    const pending = useAuthStore.getState().pendingRegistration;
    if (!pending) throw new Error("PENDING_REGISTRATION_MISSING");
    const res = await authApi.verifyRegistration(pending.email, code, pending.password);
    await getSupabaseClientIfConfigured()?.auth.signOut({ scope: "local" }).catch(() => undefined);
    const { token, refreshToken, customer } = res.data.data;
    await SecureStore.setItemAsync("ka-token", token);
    if (refreshToken) await SecureStore.setItemAsync("ka-refresh-token", refreshToken);
    else await SecureStore.deleteItemAsync("ka-refresh-token");
    await SecureStore.setItemAsync(AUTH_MODE_KEY, "backend");
    await SecureStore.setItemAsync("ka-customer", JSON.stringify(customer));
    set({ token, customer, pendingRegistration: null });
    registerPushToken().catch(() => {});
  },

  resendRegistrationCode: async () => {
    const pending = useAuthStore.getState().pendingRegistration;
    if (!pending) throw new Error("PENDING_REGISTRATION_MISSING");
    const res = await authApi.resendRegistrationCode(pending.email);
    return Number(res.data.data?.resendAfterSeconds ?? 60);
  },

  clearPendingRegistration: () => set({ pendingRegistration: null }),

  logout: async () => {
    await unregisterPushToken();
    await authApi.logout().catch(() => undefined);
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
    await SecureStore.setItemAsync("ka-token", accessToken);
    await SecureStore.setItemAsync("ka-refresh-token", refreshToken);
    await SecureStore.setItemAsync("ka-customer", JSON.stringify(customer));
    await SecureStore.setItemAsync(AUTH_MODE_KEY, "supabase");
    set({ token: accessToken, customer, isLoading: false });
    registerPushToken().catch(() => {});
  },
}));

setAuthSessionInvalidatedHandler(() => {
  useAuthStore.setState({ token: null, customer: null, isLoading: false });
});
