import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("production deployment smoke safety", () => {
  it("keeps production checks read-only unless explicitly approved", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts", "validate-production-deployment.cjs"),
      "utf8"
    );

    const guard = source.indexOf("if (!writeSmokeApproved)");
    const databasePreflight = source.indexOf("await prisma.$queryRaw`SELECT 1`");
    const firstMutation = source.indexOf('request("/api/webhooks/asaas"');
    const registration = source.indexOf('request("/api/auth/register"');

    expect(source).toContain(
      'const WRITE_SMOKE_APPROVAL = "I_APPROVE_KA_PRODUCTION_SMOKE_WRITES"'
    );
    expect(guard).toBeGreaterThan(-1);
    expect(databasePreflight).toBeGreaterThan(guard);
    expect(firstMutation).toBeGreaterThan(databasePreflight);
    expect(registration).toBeGreaterThan(databasePreflight);
  });
});
