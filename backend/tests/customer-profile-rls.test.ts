import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Customer RLS", () => {
  it("mantém Customer acessível somente pelo backend", () => {
    const sql = readFileSync(
      path.resolve(__dirname, "../prisma/migrations/20260805100000_customers_backend_only_rls/migration.sql"),
      "utf8"
    );
    expect(sql).toContain('ALTER TABLE IF EXISTS "customers" ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('REVOKE ALL ON TABLE "customers" FROM anon, authenticated');
  });
});
