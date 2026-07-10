import axios from "axios";
import * as SecureStore from "expo-secure-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Interceptor: adicionar token automaticamente
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync("ka-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

// Interceptor: tratar erros globais
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync("ka-token");
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),

  register: (data: { name: string; email: string; phone?: string; password: string; acceptedTerms: boolean }) =>
    api.post("/api/auth/register", data),

  forgotPassword: (email: string) =>
    api.post("/api/auth/forgot-password", { email }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post("/api/auth/reset-password", { email, code, newPassword }),
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    api.get("/api/products", { params }),

  getById: (id: string) =>
    api.get(`/api/products/${id}`),

  search: (query: string, params?: Record<string, string | number>) =>
    api.get("/api/products", { params: { q: query, ...params } }),
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: () => api.get("/api/categories"),
};

// ─── Cart ─────────────────────────────────────────────────────────────────────

export const cartApi = {
  get: () => api.get("/api/cart"),

  addItem: (productId: string, quantity: number, variationId?: string) =>
    api.post("/api/cart", { productId, quantity, variationId }),

  updateItem: (itemId: string, quantity: number) =>
    api.patch(`/api/cart/${itemId}`, { quantity }),

  removeItem: (itemId: string) =>
    api.delete(`/api/cart/${itemId}`),

  clear: () => api.delete("/api/cart"),
};

// ─── Shipping ─────────────────────────────────────────────────────────────────

export const shippingApi = {
  calculate: (zipCode: string, cartId?: string) =>
    api.post("/api/shipping/calculate", { zipCode, cartId }),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const ordersApi = {
  create: (data: Record<string, unknown>) =>
    api.post("/api/orders", data),

  list: () => api.get("/api/orders"),

  getById: (id: string) => api.get(`/api/orders/${id}`),
};

// ─── Customer Profile ─────────────────────────────────────────────────────────

export const customerApi = {
  getMe: () => api.get("/api/customers/me"),
  updateMe: (data: { name?: string; phone?: string }) =>
    api.patch("/api/customers/me", data),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: () => api.get("/api/customers/me/notifications"),
  markRead: (id: string) => api.patch(`/api/customers/me/notifications/${id}`),
  markAllRead: () => api.patch("/api/customers/me/notifications"),
};

// ─── Addresses ────────────────────────────────────────────────────────────────

export const addressesApi = {
  list: () => api.get("/api/customers/me/addresses"),

  create: (data: Record<string, string | boolean>) =>
    api.post("/api/customers/me/addresses", data),

  setDefault: (id: string) =>
    api.patch(`/api/customers/me/addresses/${id}/default`),

  delete: (id: string) =>
    api.delete(`/api/customers/me/addresses/${id}`),
};
