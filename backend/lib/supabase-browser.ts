"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

function publicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error("Autenticação Google indisponível neste ambiente.");
  }

  return { url, anonKey };
}

/**
 * Browser-only Supabase client. The anon key is public by design; service-role
 * and OAuth client secrets must never be added here.
 */
export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const { url, anonKey } = publicSupabaseConfig();
  browserClient = createClient(url, anonKey, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return browserClient;
}
