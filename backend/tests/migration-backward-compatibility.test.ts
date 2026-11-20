import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("installed app migration compatibility", () => {
  it("keeps the new order and stock fields additive with safe defaults", () => {
    const root = path.resolve(process.cwd(), "prisma", "migrations");
    const sql = [
      "20261118143000_order_item_sku_snapshot",
      "20261118150000_shared_variation_stock",
      "20261120150000_explicit_catalog_color",
    ].map((migration) => fs.readFileSync(path.join(root, migration, "migration.sql"), "utf8")).join("\n");
    expect(sql).toContain('ADD COLUMN "sku" TEXT');
    expect(sql).toContain('ADD COLUMN "sharedVariationStock" BOOLEAN NOT NULL DEFAULT FALSE');
    expect(sql).toContain('ADD COLUMN "usesProductStock" BOOLEAN NOT NULL DEFAULT FALSE');
    expect(sql).toContain('ADD COLUMN "assortedColors" BOOLEAN NOT NULL DEFAULT FALSE');
    expect(sql).toContain('ADD COLUMN "fixedColor" TEXT');
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN)|ALTER\s+COLUMN|RENAME\s+COLUMN/i);
  });
});
