const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const entry = read("app/(auth)/entrada.tsx");
const callback = read("app/auth/callback.tsx");
const google = read("services/googleAuth.ts");
const supabase = read("lib/supabase.ts");
const store = read("stores/authStore.ts");
const api = read("services/api.ts");
const appConfig = JSON.parse(read("app.json"));
const manifest = read("android/app/src/main/AndroidManifest.xml");
const envExample = read(".env.example");
const diagnostics = read("lib/authDiagnostics.ts");

assert.ok(entry.includes("signInWithGoogle"), "O botão Google não chama a integração real");
assert.ok(entry.includes("googleLoading"), "O botão Google não bloqueia clique duplo");
assert.ok(google.includes('provider: "google"'), "Provider Google ausente");
assert.ok(google.includes("signInWithOAuth"), "signInWithOAuth ausente");
assert.ok(google.includes("openAuthSessionAsync"), "Navegador seguro OAuth ausente");
assert.ok(google.includes("exchangeCodeForSession"), "Troca PKCE ausente");
assert.ok(google.includes('"/api/auth/google/complete"'), "Vinculação do Customer ausente");
assert.ok(google.includes("Bearer ${session.access_token}"), "Bearer Supabase ausente na vinculação");
assert.ok(google.includes("com.kabijoux.app://auth/callback"), "Redirect mobile incorreto");
assert.ok(callback.includes("completeGoogleOAuthCode"), "Rota de callback não conclui OAuth");
assert.ok(supabase.includes("AsyncStorage"), "Persistência da sessão Supabase ausente");
assert.ok(supabase.includes('flowType: "pkce"'), "PKCE não configurado");
assert.ok(supabase.includes("persistSession: true"), "Persistência Supabase desabilitada");
assert.ok(store.includes("completeSupabaseLogin"), "authStore não recebe a sessão Google");
assert.ok(store.includes('AUTH_MODE_KEY, "supabase"'), "Modo Supabase não é persistido");
assert.ok(api.includes("!config.headers.Authorization"), "Interceptor pode sobrescrever o Bearer OAuth");
assert.ok(api.includes('authMode === "supabase"'), "Refresh Supabase ausente");
assert.deepEqual(
  appConfig.expo.scheme,
  ["kabijoux", "com.kabijoux.app"],
  "Schemes Expo não preservam legado e callback Google",
);
assert.ok(manifest.includes('android:scheme="com.kabijoux.app"'), "Intent filter OAuth ausente");
assert.ok(envExample.includes("EXPO_PUBLIC_SUPABASE_URL"), "URL Supabase ausente do exemplo");
assert.ok(envExample.includes("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), "Publishable key ausente do exemplo");
assert.ok(!google.includes("service_role"), "Service role não pode estar no mobile");
assert.ok(google.includes("fragmentParams"), "Callback Google não trata erros no fragmento OAuth");
assert.ok(google.includes('logAuthFailure("google"'), "Falhas Google não identificam a etapa segura");
assert.ok(diagnostics.includes("[token]"), "Diagnóstico não mascara tokens");

for (const file of [entry, callback, google, supabase, store, api]) {
  assert.ok(!/NÃ|Ãƒ/.test(file), "Texto com codificação corrompida no fluxo Google");
}

console.log("Google Auth mobile: 26/26 verificações aprovadas.");
