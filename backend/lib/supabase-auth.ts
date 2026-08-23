import { createClient, type Session, type User } from "@supabase/supabase-js";

export const SUPABASE_AUTH_MIGRATION_SOURCE = "ka_customers_2026";

function requireEnv(name: "SUPABASE_URL" | "SUPABASE_ANON_KEY") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} não configurado`);
  return value;
}

function publicAuthClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function adminAuthClient() {
  const { supabaseAdmin } = await import("./supabase");
  return supabaseAdmin;
}

export function isSupabaseAuthTransitionEnabled() {
  return process.env.SUPABASE_AUTH_TRANSITION_ENABLED?.trim().toLowerCase() === "true";
}

export async function signInWithSupabasePassword(email: string, password: string) {
  return publicAuthClient().auth.signInWithPassword({ email, password });
}

export async function refreshSupabaseSession(refreshToken: string) {
  return publicAuthClient().auth.refreshSession({ refresh_token: refreshToken });
}

export async function getSupabaseUser(accessToken: string) {
  const supabaseAdmin = await adminAuthClient();
  return supabaseAdmin.auth.getUser(accessToken);
}

export async function createSupabasePasswordUser(input: {
  customerId: string;
  email: string;
  name: string;
  password?: string;
  passwordHash?: string;
  emailConfirmed?: boolean;
  legacyEmailVerificationInherited?: boolean;
  isTestAccount?: boolean;
}) {
  const supabaseAdmin = await adminAuthClient();
  return supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    password_hash: input.passwordHash,
    email_confirm: input.emailConfirmed ?? false,
    user_metadata: { full_name: input.name },
    app_metadata: {
      customer_id: input.customerId,
      migration_source: SUPABASE_AUTH_MIGRATION_SOURCE,
      ...(input.legacyEmailVerificationInherited
        ? { legacy_email_verification: "inherited_after_legacy_auth" }
        : {}),
      ...(input.isTestAccount ? { is_test_account: true } : {}),
    },
  });
}

export async function updateSupabasePassword(authUserId: string, password: string) {
  const supabaseAdmin = await adminAuthClient();
  return supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
}

export async function deleteSupabaseUser(authUserId: string) {
  const supabaseAdmin = await adminAuthClient();
  return supabaseAdmin.auth.admin.deleteUser(authUserId);
}

export async function signOutSupabaseSession(accessToken: string, scope: "local" | "global" | "others" = "local") {
  const supabaseAdmin = await adminAuthClient();
  return supabaseAdmin.auth.admin.signOut(accessToken, scope);
}

export function sessionResponse(session: Session, user?: User | null) {
  return {
    token: session.access_token,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    expiresAt: session.expires_at,
    authUserId: user?.id ?? session.user.id,
  };
}
