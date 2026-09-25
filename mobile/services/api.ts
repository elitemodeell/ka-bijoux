import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getSupabaseClientIfConfigured } from "@/lib/supabase";
import { logAuthFailure } from "@/lib/authDiagnostics";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://kabijoux.com.br";
export const MOBILE_API_PREFIX = "/api/mobile" as const;

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "x-ka-platform": Platform.OS === "ios" ? "IOS" : "ANDROID",
    "x-ka-app-version": Constants.expoConfig?.version ?? "unknown",
  },
});

const ACCESS_TOKEN_KEY = "ka-token";
const REFRESH_TOKEN_KEY = "ka-refresh-token";
const CUSTOMER_KEY = "ka-customer";
export const AUTH_MODE_KEY = "ka-auth-mode";
export type AuthMode = "backend" | "supabase";
let sessionInvalidatedHandler: (() => void) | undefined;

export function setAuthSessionInvalidatedHandler(handler: () => void) {
  sessionInvalidatedHandler = handler;
}

async function persistSession(data: {
  accessToken?: string;
  token: string;
  refreshToken: string;
  customer?: unknown;
  authMode?: AuthMode;
}) {
  const accessToken = data.accessToken ?? data.token;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
  if (data.customer) await SecureStore.setItemAsync(CUSTOMER_KEY, JSON.stringify(data.customer));
  if (data.authMode) await SecureStore.setItemAsync(AUTH_MODE_KEY, data.authMode);
}

export async function clearStoredAuthSession() {
  const authMode = await SecureStore.getItemAsync(AUTH_MODE_KEY);
  if (authMode === "supabase") {
    await getSupabaseClientIfConfigured()?.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(CUSTOMER_KEY),
    SecureStore.deleteItemAsync(AUTH_MODE_KEY),
  ]);
  sessionInvalidatedHandler?.();
}

let refreshRequest: Promise<string> | null = null;

async function refreshAccessToken() {
  if (refreshRequest) return refreshRequest;
  refreshRequest = (async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error("Refresh token ausente");
    const authMode = await SecureStore.getItemAsync(AUTH_MODE_KEY);
    if (authMode === "supabase") {
      const supabase = getSupabaseClientIfConfigured();
      if (!supabase) throw new Error("Cliente Supabase ausente");
      const result = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (result.error || !result.data.session) throw new Error("Sessão Supabase expirada");
      await persistSession({
        token: result.data.session.access_token,
        refreshToken: result.data.session.refresh_token,
        authMode: "supabase",
      });
      return result.data.session.access_token;
    }
    const response = await axios.post(
      `${BASE_URL}/api/auth/refresh`,
      { refreshToken },
      {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
          "x-ka-platform": Platform.OS === "ios" ? "IOS" : "ANDROID",
          "x-ka-app-version": Constants.expoConfig?.version ?? "unknown",
        },
      },
    );
    await persistSession(response.data.data);
    return response.data.data.accessToken ?? response.data.data.token;
  })().finally(() => {
    refreshRequest = null;
  });
  return refreshRequest;
}

// Interceptor: adicionar token automaticamente
api.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase() ?? "get";
  const path = config.url ?? "";
  const isPublicCatalogRead = method === "get" && [
    `${MOBILE_API_PREFIX}/home`,
    `${MOBILE_API_PREFIX}/products`,
    `${MOBILE_API_PREFIX}/categories`,
    `${MOBILE_API_PREFIX}/stories`,
  ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
  if (isPublicCatalogRead) return config;

  try {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

// Interceptor: tratar erros globais
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (typeof error.config & { _kaRetried?: boolean }) | undefined;
    const isAuthBootstrap =
      typeof original?.url === "string" &&
      ["/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/auth/google/complete", "/api/auth/apple/complete"].some((path) =>
        original.url?.includes(path),
      );

    if (error.response?.status === 401 && original && !original._kaRetried && !isAuthBootstrap) {
      original._kaRetried = true;
      try {
        const accessToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api.request(original);
      } catch (refreshError) {
        logAuthFailure("session", "refresh", refreshError);
        await clearStoredAuthSession();
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) => api.post("/api/auth/login", { email, password }),

  register: (data: { name: string; email: string; phone?: string; password: string; acceptedTerms: boolean }) =>
    api.post("/api/auth/register", data),

  forgotPassword: (email: string) =>
    api.post("/api/auth/forgot-password", { email }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post("/api/auth/reset-password", { email, code, newPassword }),

  logout: () => api.post("/api/auth/logout"),
  logoutAll: () => api.post("/api/auth/logout-all"),
};

export { persistSession };

// ─── Products ─────────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    api.get(`${MOBILE_API_PREFIX}/products`, { params: { withImage: true, ...params } }),

  getById: (id: string) =>
    api.get(`${MOBILE_API_PREFIX}/products/${id}`),

  search: (query: string, params?: Record<string, string | number | boolean>, signal?: AbortSignal) =>
    api.get(`${MOBILE_API_PREFIX}/products`, { params: { withImage: true, q: query, ...params }, signal }),
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: () => api.get(`${MOBILE_API_PREFIX}/categories`),
};

// ─── Cart ─────────────────────────────────────────────────────────────────────

export const cartApi = {
  get: () => api.get(`${MOBILE_API_PREFIX}/cart`),

  addItem: (productId: string, quantity: number, variationId?: string, mode: "INCREMENT" | "SET" | "BUY_NOW" = "INCREMENT") =>
    api.post(`${MOBILE_API_PREFIX}/cart`, { productId, quantity, variationId, mode }),

  updateItem: (itemId: string, quantity: number) =>
    api.patch(`${MOBILE_API_PREFIX}/cart/${itemId}`, { quantity }),

  removeItem: (itemId: string) =>
    api.delete(`${MOBILE_API_PREFIX}/cart/${itemId}`),

  clear: () => api.delete(`${MOBILE_API_PREFIX}/cart`),
};

// ─── Shipping ─────────────────────────────────────────────────────────────────

export const shippingApi = {
  calculate: (zipCode: string, addressId?: string) =>
    api.post(`${MOBILE_API_PREFIX}/shipping/calculate`, { zipCode, addressId }),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  addressId?: string;
  shippingType: "CORREIOS" | "MOTOTAXI" | "RETIRADA";
  shippingOptionId?: string;
  couponCode?: string;
  notes?: string;
  idempotencyKey: string;
  paymentMethod: "PIX" | "CREDIT_CARD" | "BOLETO";
  installmentCount: number;
}

export const ordersApi = {
  create: (data: CreateOrderInput) => api.post(`${MOBILE_API_PREFIX}/orders`, data),

  list: () => api.get(`${MOBILE_API_PREFIX}/orders`),

  getById: (id: string) => api.get(`${MOBILE_API_PREFIX}/orders/${id}`),
};

export interface PaymentMethodOption {
  method: "PIX" | "CREDIT_CARD" | "BOLETO";
  label: string;
  maxInstallments: number;
  installments: number[];
}

export const paymentsApi = {
  methods: () =>
    api.get<{ data: { methods: PaymentMethodOption[] } }>(
      `${MOBILE_API_PREFIX}/payments/methods`
    ),
};

// ─── Customer Profile ─────────────────────────────────────────────────────────

export const customerApi = {
  getMe: () => api.get("/api/customers/me"),
  updateMe: (data: { name?: string; phone?: string | null; cpf?: string }) =>
    api.patch("/api/customers/me", data),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: () => api.get(`${MOBILE_API_PREFIX}/notifications`),
  markRead: (id: string) => api.patch(`${MOBILE_API_PREFIX}/notifications/${id}`),
  markAllRead: () => api.patch(`${MOBILE_API_PREFIX}/notifications`),
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviewsApi = {
  list: (productId: string) => api.get(`${MOBILE_API_PREFIX}/products/${productId}/reviews`),
  create: (productId: string, rating: number, comment?: string) =>
    api.post(`${MOBILE_API_PREFIX}/products/${productId}/reviews`, { rating, comment }),
};

// ─── Stories ──────────────────────────────────────────────────────────────────

export const storiesApi = {
  list: () => api.get(`${MOBILE_API_PREFIX}/stories`),
};

export const homeApi = {
  get: (signal?: AbortSignal) => api.get(`${MOBILE_API_PREFIX}/home`, { signal }),
};

export const favoritesApi = {
  list: () => api.get(`${MOBILE_API_PREFIX}/favorites`),
  create: (productId: string) => api.post(`${MOBILE_API_PREFIX}/favorites`, { productId }),
  remove: (favoriteId: string) => api.delete(`${MOBILE_API_PREFIX}/favorites/${favoriteId}`),
};

// ─── Addresses ────────────────────────────────────────────────────────────────

export const addressesApi = {
  list: () => api.get("/api/customers/me/addresses"),

  create: (data: Record<string, string | boolean | undefined>) =>
    api.post("/api/customers/me/addresses", data),

  update: (id: string, data: Record<string, string | boolean | undefined>) =>
    api.patch(`/api/customers/me/addresses/${id}`, data),

  lookupPostalCode: (zipCode: string) =>
    api.get(`${MOBILE_API_PREFIX}/addresses/cep/${zipCode.replace(/\D/g, "")}`),

  reverseGeocode: (latitude: number, longitude: number) =>
    api.get(`${MOBILE_API_PREFIX}/addresses/reverse-geocode`, { params: { latitude, longitude } }),

  setDefault: (id: string) =>
    api.patch(`/api/customers/me/addresses/${id}/default`),

  delete: (id: string) =>
    api.delete(`/api/customers/me/addresses/${id}`),
};
