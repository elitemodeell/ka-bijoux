import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { googleOAuthCallbackUrl, safeAuthRedirect } from "@/lib/auth-redirect";

const root = path.resolve(__dirname, "..");
const source = (relative: string) => readFileSync(path.join(root, relative), "utf8");

describe("Google Auth web", () => {
  it("mantém redirects somente dentro da origem", () => {
    expect(safeAuthRedirect("/conta")).toBe("/conta");
    expect(safeAuthRedirect("/produtos?promo=true#ofertas")).toBe("/produtos?promo=true#ofertas");
    expect(safeAuthRedirect("https://evil.example/roubo")).toBe("/conta");
    expect(safeAuthRedirect("//evil.example/roubo")).toBe("/conta");
    expect(safeAuthRedirect("/auth/callback?code=reuso")).toBe("/conta");
  });

  it("gera callback PKCE para a origem atual", () => {
    expect(googleOAuthCallbackUrl("https://kabijoux.com.br", "/carrinho")).toBe(
      "https://kabijoux.com.br/auth/callback?next=%2Fcarrinho"
    );
    expect(googleOAuthCallbackUrl("http://localhost:3000", "//evil.example")).toBe(
      "http://localhost:3000/auth/callback?next=%2Fconta"
    );
  });

  it("usa Supabase Google real com PKCE e sessão persistente", () => {
    const button = source("components/loja/GoogleSignInButton.tsx");
    const browser = source("lib/supabase-browser.ts");
    expect(button).toContain('provider: "google"');
    expect(button).toContain("signInWithOAuth");
    expect(button).toContain("redirectTo");
    expect(browser).toContain('flowType: "pkce"');
    expect(browser).toContain("persistSession: true");
    expect(browser).toContain("autoRefreshToken: true");
  });

  it("troca o code pela sessão e vincula o Customer no servidor", () => {
    const callback = source("components/loja/GoogleAuthCallback.tsx");
    expect(callback).toContain("exchangeCodeForSession(code)");
    expect(callback).toContain('fetch("/api/auth/google/complete"');
    expect(callback).toContain("Bearer ${data.session.access_token}");
    expect(callback).toContain('signOut({ scope: "local" })');
  });

  it("expõe somente URL e anon key ao navegador", () => {
    const browser = source("lib/supabase-browser.ts");
    expect(browser).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(browser).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(browser).not.toContain("SERVICE_ROLE");
    expect(browser).not.toContain("GOOGLE_CLIENT_SECRET");
  });

  it("mantém login administrativo separado", () => {
    expect(source("app/admin/login/page.tsx")).toContain("/api/auth/admin/login");
  });
});
