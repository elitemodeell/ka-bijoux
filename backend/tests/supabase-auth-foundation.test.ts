import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const backendRoot = resolve(__dirname, "..");
const projectRoot = resolve(backendRoot, "..");
const source = (path: string) => readFileSync(resolve(backendRoot, path), "utf8");

describe("fundação Supabase Auth", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20260801190000_supabase_auth_customer_link/migration.sql");
  const authService = source("lib/supabase-auth.ts");
  const migrationScript = source("scripts/migrate-customers-to-supabase-auth.cjs");
  const rollbackScript = source("scripts/rollback-supabase-auth-migration.cjs");
  const verifyScript = source("scripts/verify-supabase-auth-migration.cjs");
  const monitorScript = source("scripts/monitor-supabase-auth-migration.cjs");
  const mobileApi = readFileSync(resolve(projectRoot, "mobile/services/api.ts"), "utf8");

  it("mantém somente o vínculo mínimo no Customer", () => {
    expect(schema).toContain("authUserId");
    expect(schema).toContain("@unique @db.Uuid");
    for (const duplicated of ["model AuthSession", "model RefreshToken", "model AuthIdentity"]) {
      expect(schema).not.toContain(duplicated);
    }
  });

  it("usa migration aditiva e não toca em dados comerciais ou hashes", () => {
    expect(migration).toContain('ADD COLUMN "authUserId" UUID');
    expect(migration).not.toMatch(/DROP|TRUNCATE|DELETE\s+FROM/i);
    expect(migration).not.toContain("passwordHash");
    expect(migration).not.toContain("orders");
    expect(migration).not.toContain("addresses");
  });

  it("importa bcrypt e exige autorização explícita para herdar a verificação legada", () => {
    expect(migrationScript).toContain("password_hash: customer.passwordHash");
    expect(migrationScript).toContain("--inherit-legacy-email-verification");
    expect(migrationScript).toContain("requiresFirstLogin");
    expect(migrationScript).toContain("email_confirm: true");
    expect(migrationScript).toContain("legacy_email_verification");
    expect(migrationScript).toContain("is_test_account");
    expect(migrationScript).toContain('mode: apply ? "apply" : "dry-run"');
    expect(migrationScript).toContain("assertWriteAuthorization()");
  });

  it("protege aplicação e rollback por dupla confirmação", () => {
    const common = source("scripts/auth-phase1-common.cjs");
    expect(common).toContain("AUTH_MIGRATION_ALLOW_WRITE");
    expect(common).toContain("--project-ref=");
    expect(rollbackScript).toContain("--delete-auth-users");
    expect(rollbackScript).toContain('migration_source === "ka_customers_2026"');
  });

  it("possui diagnóstico e verificação pós-migração sem imprimir credenciais", () => {
    expect(source("scripts/diagnose-supabase-auth-migration.cjs")).toContain('mode: "dry-run-read-only"');
    expect(verifyScript).toContain("missingAuthUser");
    expect(verifyScript).toContain("duplicateLinks");
    expect(verifyScript).toContain("migratedOrphans");
    expect(monitorScript).toContain('mode: "read-only"');
    for (const counter of ["eligible", "migrated", "pending", "failed", "conflicts"]) {
      expect(monitorScript).toContain(counter);
    }
  });

  it("mobile persiste e renova a sessão do Supabase no SecureStore", () => {
    expect(mobileApi).toContain('const REFRESH_TOKEN_KEY = "ka-refresh-token"');
    expect(mobileApi).toContain("/api/auth/refresh");
    expect(mobileApi).toContain("let refreshRequest:");
    expect(mobileApi).toContain("clearStoredAuthSession()");
    expect(authService).toContain("refreshSession({ refresh_token: refreshToken })");
    expect(authService).toContain('signOut(accessToken, scope)');
  });
});
