import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { getSupabaseClientIfConfigured } from "@/lib/supabase";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://kabijoux.com.br";
const ACCESS_TOKEN_KEY = "ka-token";
const REFRESH_TOKEN_KEY = "ka-refresh-token";
const CUSTOMER_KEY = "ka-customer";
export const AUTH_MODE_KEY = "ka-auth-mode";
export type AuthMode = "backend" | "supabase";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

let sessionInvalidatedHandler: (() => void) | undefined;
export function setAuthSessionInvalidatedHandler(handler: () => void) {
  sessionInvalidatedHandler = handler;
}

export async function persistSession(data: {
  accessToken?: string;
  token: string;
  refreshToken: string;
  customer?: unknown;
  authMode?: AuthMode;
}) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken ?? data.token);
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
    const response = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken }, { timeout: 30000 });
    await persistSession(response.data.data);
    return response.data.data.accessToken ?? response.data.data.token;
  })().finally(() => { refreshRequest = null; });
  return refreshRequest;
}

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (typeof error.config & { _kaRetried?: boolean }) | undefined;
    const isAuthBootstrap = typeof original?.url === "string" &&
      ["/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/auth/google/complete", "/api/auth/apple/complete"]
        .some((path) => original.url?.includes(path));
    if (error.response?.status === 401 && original && !original._kaRetried && !isAuthBootstrap) {
      original._kaRetried = true;
      try {
        const accessToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api.request(original);
      } catch {
        await clearStoredAuthSession();
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) => api.post("/api/auth/login", { email, password }),
  register: (data: { name: string; email: string; phone?: string; password: string; acceptedTerms: boolean }) =>
    api.post("/api/auth/register", data),
  verifyRegistration: (email: string, code: string, password: string) =>
    api.post("/api/auth/register/verify", { email, code, password }),
  resendRegistrationCode: (email: string) =>
    api.post("/api/auth/register/resend", { email }),
  forgotPassword: (email: string) => api.post("/api/auth/forgot-password", { email }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post("/api/auth/reset-password", { email, code, newPassword }),
  logout: () => api.post("/api/auth/logout"),
  logoutAll: () => api.post("/api/auth/logout-all"),
};

export const productsApi = {
  list: (params?: Record<string, string | number | boolean>) => api.get("/api/products", { params: { withImage: true, ...params } }),
  getById: (id: string) => api.get(`/api/products/${id}`),
  search: (query: string, params?: Record<string, string | number | boolean>) => api.get("/api/products", { params: { withImage: true, q: query, ...params } }),
};
export const categoriesApi = { list: () => api.get("/api/categories") };
export const cartApi = {
  get: () => api.get("/api/cart"),
  addItem: (productId: string, quantity: number, variationId?: string) => api.post("/api/cart", { productId, quantity, variationId }),
  updateItem: (itemId: string, quantity: number) => api.patch(`/api/cart/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.delete(`/api/cart/${itemId}`),
  clear: () => api.delete("/api/cart"),
};
export const shippingApi = { calculate: (zipCode: string, cartId?: string) => api.post("/api/shipping/calculate", { zipCode, cartId }) };
export const ordersApi = {
  create: (data: Record<string, unknown>, idempotencyKey: string) =>
    api.post("/api/orders", data, { headers: { "Idempotency-Key": idempotencyKey } }),
  list: () => api.get("/api/orders"),
  getById: (id: string) => api.get(`/api/orders/${id}`),
};
export const customerApi = {
  getMe: () => api.get("/api/customers/me"),
  updateMe: (data: { name?: string; phone?: string }) => api.patch("/api/customers/me", data),
};
export const notificationsApi = {
  list: () => api.get("/api/customers/me/notifications"),
  markRead: (id: string) => api.patch(`/api/customers/me/notifications/${id}`),
  markAllRead: () => api.patch("/api/customers/me/notifications"),
};
export const reviewsApi = {
  list: (productId: string) => api.get(`/api/products/${productId}/reviews`),
  create: (productId: string, rating: number, comment?: string) => api.post(`/api/products/${productId}/reviews`, { rating, comment }),
};
export const storiesApi = { list: () => api.get("/api/stories") };
export const addressesApi = {
  list: () => api.get("/api/customers/me/addresses"),
  create: (data: Record<string, string | boolean | undefined>) => api.post("/api/customers/me/addresses", data),
  setDefault: (id: string) => api.patch(`/api/customers/me/addresses/${id}/default`),
  delete: (id: string) => api.delete(`/api/customers/me/addresses/${id}`),
};
