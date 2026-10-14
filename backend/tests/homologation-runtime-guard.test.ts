import { describe, expect, it } from "vitest";
import { validateHomologationRuntime } from "@/lib/homologation-runtime-guard";

function jwt(role: "anon" | "service_role") {
  const payload = Buffer.from(JSON.stringify({ ref: "pxhsgdfsypvqgmuyvfjt", role })).toString("base64url");
  return `header.${payload}.signature`;
}

function environment(): Record<string, string | undefined> {
  const anon = jwt("anon");
  return {
    HOMOLOGATION_MODE: "isolated", HOMOLOGATION_RUNTIME_ID: "ka-preview-20261013-v1",
    DATABASE_URL: "postgresql://synthetic:synthetic@db.pxhsgdfsypvqgmuyvfjt.supabase.co:5432/postgres",
    DIRECT_URL: "postgresql://synthetic:synthetic@db.pxhsgdfsypvqgmuyvfjt.supabase.co:5432/postgres",
    NEXT_PUBLIC_SUPABASE_URL: "https://pxhsgdfsypvqgmuyvfjt.supabase.co",
    SUPABASE_URL: "https://pxhsgdfsypvqgmuyvfjt.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon, SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: jwt("service_role"), JWT_SECRET: "jwt-synthetic-secret-00000000000000001",
    STORAGE_BUCKET: "products", HOMOLOGATION_EXTERNAL_MODE: "mock", EMAIL_DELIVERY_MODE: "mock",
    PAYMENT_PROVIDER_MODE: "mock", SHIPPING_PROVIDER_MODE: "mock", BLING_PROVIDER_MODE: "mock",
    PAYMENT_CHECKOUT_RETURN_URL: "https://preview.example.invalid/checkout/mock-return",
  };
}

describe("homologation runtime guard", () => {
  it("accepts the complete isolated runtime identity", () => {
    expect(validateHomologationRuntime(environment())).toBe(true);
  });

  it("allows only the named Vercel production URL metadata", () => {
    expect(validateHomologationRuntime({
      ...environment(),
      VERCEL_PROJECT_PRODUCTION_URL: "kabijoux.com.br",
      NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: "kabijoux.com.br",
    })).toBe(true);
  });

  it("blocks a production URL in an operational payment variable", () => {
    expect(() => validateHomologationRuntime({
      ...environment(),
      PAYMENT_CHECKOUT_RETURN_URL: "https://kabijoux.com.br/checkout/return",
    })).toThrow(/PAYMENT_CHECKOUT_RETURN_URL references Production/);
  });

  it("blocks Production project inheritance", () => {
    expect(() => validateHomologationRuntime({ ...environment(), SUPABASE_URL: "https://sxohqngzypmxtmuulfoa.supabase.co" })).toThrow(/BLOCKED/);
  });

  it("blocks homologation variables in Production", () => {
    expect(() => validateHomologationRuntime({ ...environment(), VERCEL_ENV: "production" })).toThrow(/leaked into Production/);
  });

  it("blocks an unsafe application JWT secret", () => {
    expect(() => validateHomologationRuntime({ ...environment(), JWT_SECRET: "too-short" })).toThrow(/JWT_SECRET is weak or unsafe/);
  });
});
