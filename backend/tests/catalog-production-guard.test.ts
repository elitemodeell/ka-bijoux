import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { assertPermit, sha256 } = require("../scripts/apply-catalog-photo-repair-production.cjs");
const original = { ...process.env };

afterEach(() => { process.env = { ...original }; });

describe("catalog production guard", () => {
  it("requires the real project identity, approved package and verified backup", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ka-catalog-guard-"));
    const backup = path.join(root, "database.dump");
    const backupContent = Buffer.alloc(2048, 7);
    await fs.writeFile(backup, backupContent);
    const bundle = { version: 1, projectRef: "sxohqngzypmxtmuulfoa", galleries: [] };
    process.env.CATALOG_PRODUCTION_DATABASE_URL = "postgresql://postgres.sxohqngzypmxtmuulfoa:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";
    process.env.CATALOG_PRODUCTION_PROJECT_REF = bundle.projectRef;
    process.env.CATALOG_PRODUCTION_APPROVAL = "APPLY_KA_BIJOUX_CATALOG_PRODUCTION";
    process.env.CATALOG_PRODUCTION_APPROVED_SHA256 = sha256(JSON.stringify(bundle));
    process.env.CATALOG_PRODUCTION_DATABASE_BACKUP_FILE = backup;
    process.env.CATALOG_PRODUCTION_DATABASE_BACKUP_SHA256 = sha256(backupContent);
    process.env.CATALOG_PRODUCTION_BACKUP_DIR = path.join(root, "existing", "transactional");
    await fs.mkdir(process.env.CATALOG_PRODUCTION_BACKUP_DIR, { recursive: true });
    await expect(assertPermit(bundle)).resolves.toMatchObject({ approvedSha: process.env.CATALOG_PRODUCTION_APPROVED_SHA256 });
    await fs.rm(root, { recursive: true, force: true });
  });

  it("rejects another Supabase project and a package hash mismatch", async () => {
    const bundle = { version: 1, projectRef: "sxohqngzypmxtmuulfoa", galleries: [] };
    process.env.CATALOG_PRODUCTION_DATABASE_URL = "postgresql://postgres.other:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";
    process.env.CATALOG_PRODUCTION_PROJECT_REF = bundle.projectRef;
    process.env.CATALOG_PRODUCTION_APPROVAL = "APPLY_KA_BIJOUX_CATALOG_PRODUCTION";
    process.env.CATALOG_PRODUCTION_APPROVED_SHA256 = "wrong";
    await expect(assertPermit(bundle)).rejects.toThrow(/identidade Supabase/);
  });
});

