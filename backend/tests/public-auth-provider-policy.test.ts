import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

function source(relative: string) {
  return readFileSync(path.join(root, relative), "utf8");
}

function sourceTree(relative: string): string {
  const absolute = path.join(root, relative);
  return readdirSync(absolute)
    .flatMap((entry) => {
      const child = path.join(absolute, entry);
      if (statSync(child).isDirectory()) {
        return sourceTree(path.join(relative, entry));
      }
      return /\.(?:ts|tsx)$/.test(entry) ? [readFileSync(child, "utf8")] : [];
    })
    .join("\n");
}

describe("política de provedores públicos de autenticação web", () => {
  const publicAuthSource = [
    sourceTree("app/api/auth"),
    sourceTree("app/(loja)/auth"),
    source("app/(loja)/entrar/page.tsx"),
    source("app/(loja)/conta/page.tsx"),
    source("components/loja/GoogleSignInButton.tsx"),
    source("components/loja/GoogleAuthCallback.tsx"),
    source("components/loja/CustomerAccount.tsx"),
    source("lib/supabase-auth.ts"),
    source("lib/supabase-browser.ts"),
    source("lib/google-auth-customer.ts"),
  ].join("\n");

  it("permite Google web e Apple para o aplicativo iOS", () => {
    expect(publicAuthSource).toContain('provider: "google"');
    expect(publicAuthSource).toContain('provider: "apple"');
    expect(publicAuthSource).not.toMatch(
      /provider\s*:\s*["'](?:facebook|twitter|azure|linkedin|discord|spotify|github|gitlab|bitbucket|keycloak|notion|slack|workos|twitch)["']/i
    );
  });

  it("não oferece Facebook, Apple, telefone/SMS ou magic link na UI web", () => {
    expect(publicAuthSource).not.toMatch(
      /continuar com (?:facebook|apple|telefone)|entrar com (?:facebook|apple|telefone)|magic link/i
    );
    expect(publicAuthSource).not.toMatch(/signInWithOtp|verifyOtp|inviteUserByEmail|signInAnonymously/i);
  });

  it("não declara credenciais ou dependências desses provedores no backend", () => {
    const environment = source(".env.example");
    const packageJson = source("package.json");
    expect(environment).not.toMatch(/FACEBOOK_|TWILIO_|APPLE_(?:CLIENT|SECRET|SERVICE)/i);
    expect(packageJson).not.toMatch(/facebook|twilio|apple-auth/i);
  });

  it("preserva e-mail/senha, recuperação, Google e login administrativo", () => {
    expect(source("app/api/auth/login/route.ts")).toContain("signInWithSupabasePassword");
    expect(source("app/api/auth/register/route.ts")).toContain("createSupabasePasswordUser");
    expect(source("app/api/auth/forgot-password/route.ts")).toContain("generatePasswordResetCode");
    expect(source("app/api/auth/forgot-password/route.ts")).toContain("sendTransactionalEmail");
    expect(source("app/api/auth/reset-password/route.ts")).toContain("updateSupabasePassword");
    expect(source("app/admin/login/page.tsx")).toContain("/api/auth/admin/login");
    expect(source("components/loja/GoogleSignInButton.tsx")).toContain("signInWithOAuth");
  });
});
