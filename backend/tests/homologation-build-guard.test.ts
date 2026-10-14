import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

function jwt(role: "anon" | "service_role") {
  const payload = Buffer.from(JSON.stringify({ ref: "pxhsgdfsypvqgmuyvfjt", role })).toString("base64url");
  return `header.${payload}.signature`;
}

function environment(): NodeJS.ProcessEnv {
  const anon = jwt("anon");
  return {
    PATH: process.env.PATH,
    HOMOLOGATION_MODE: "isolated",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "codex/security-audit-20261013",
    HOMOLOGATION_RUNTIME_ID: "ka-preview-20261013-v1",
    DATABASE_URL: "postgresql://postgres.pxhsgdfsypvqgmuyvfjt:synthetic@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1",
    DIRECT_URL: "postgresql://postgres.pxhsgdfsypvqgmuyvfjt:synthetic@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
    NEXT_PUBLIC_SUPABASE_URL: "https://pxhsgdfsypvqgmuyvfjt.supabase.co",
    SUPABASE_URL: "https://pxhsgdfsypvqgmuyvfjt.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
    SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: jwt("service_role"),
    JWT_SECRET: "jwt-synthetic-secret-00000000000000001",
    STORAGE_BUCKET: "products",
    HOMOLOGATION_EXTERNAL_MODE: "mock",
    EMAIL_DELIVERY_MODE: "mock",
    PAYMENT_PROVIDER_MODE: "mock",
    SHIPPING_PROVIDER_MODE: "mock",
    BLING_PROVIDER_MODE: "mock",
    PAYMENT_CHECKOUT_RETURN_URL: "https://preview.example.invalid/checkout/mock-return",
  };
}

function run(overrides: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [path.join(process.cwd(), "scripts", "validate-homologation-env.cjs")], {
    cwd: process.cwd(),
    env: { ...environment(), ...overrides },
    encoding: "utf8",
  });
}

describe("homologation build guard", () => {
  it("allows only the named informational Vercel metadata", () => {
    const result = run({
      VERCEL_PROJECT_PRODUCTION_URL: "kabijoux.com.br",
      NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: "kabijoux.com.br",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[homologation-guard] PASS");
  });

  it("blocks the production domain in an operational payment callback", () => {
    const result = run({ PAYMENT_CHECKOUT_RETURN_URL: "https://kabijoux.com.br/checkout/return" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("PAYMENT_CHECKOUT_RETURN_URL references a production resource");
  });

  it("does not create a generic exception for other Vercel variables", () => {
    const result = run({ VERCEL_OPERATIONAL_CALLBACK_URL: "https://kabijoux.com.br/callback" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("VERCEL_OPERATIONAL_CALLBACK_URL references a production resource");
  });

  it("blocks the production Supabase project", () => {
    const result = run({ SUPABASE_URL: "https://sxohqngzypmxtmuulfoa.supabase.co" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("SUPABASE_URL references a production resource");
  });

  it("blocks a different shared pooler host", () => {
    const result = run({
      DATABASE_URL: "postgresql://postgres.pxhsgdfsypvqgmuyvfjt:synthetic@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("DATABASE_URL has an unexpected host or protocol");
  });

  it("blocks a session pooler without required SSL", () => {
    const result = run({
      DIRECT_URL: "postgresql://postgres.pxhsgdfsypvqgmuyvfjt:synthetic@aws-1-sa-east-1.pooler.supabase.com:5432/postgres",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("DIRECT_URL must use the homologation database with SSL");
  });

  it("blocks an unsafe application JWT secret", () => {
    const result = run({ JWT_SECRET: "too-short" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("JWT_SECRET is too short");
  });
});
