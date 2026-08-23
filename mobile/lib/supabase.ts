import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
)?.trim();

let client: SupabaseClient | null = null;
let appStateSubscriptionInstalled = false;

export const SUPABASE_MOBILE_CONFIGURED = Boolean(supabaseUrl && supabasePublishableKey);

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("SUPABASE_MOBILE_NOT_CONFIGURED");
  }

  if (!client) {
    client = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });

    if (Platform.OS !== "web" && !appStateSubscriptionInstalled) {
      appStateSubscriptionInstalled = true;
      AppState.addEventListener("change", (state) => {
        if (!client) return;
        if (state === "active") client.auth.startAutoRefresh();
        else client.auth.stopAutoRefresh();
      });
    }
  }

  return client;
}

export function getSupabaseClientIfConfigured(): SupabaseClient | null {
  return SUPABASE_MOBILE_CONFIGURED ? getSupabaseClient() : null;
}
