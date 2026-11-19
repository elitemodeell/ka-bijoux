const fs = require("node:fs/promises");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const PROJECT_REF = "sxohqngzypmxtmuulfoa";
const variationSelect = { id: true, name: true, value: true, sku: true, imageUrl: true, stock: true,
  priceModifier: true, isDefault: true, order: true, active: true, createdAt: true, productId: true };
const productSelect = { id: true, name: true, sku: true, blingId: true, price: true, stock: true,
  active: true, sharedVariationStock: true, variations: { select: variationSelect } };

function localDatabaseUrl() {
  const raw = process.env.CATALOG_HOMOLOGATION_DATABASE_URL;
  const url = new URL(raw ?? "invalid:");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !/^\/(ka_bijoux|kabijoux)[_-](homolog|test)/i.test(url.pathname) || url.searchParams.has("host")) {
    throw new Error("Aplicação restrita ao banco local de homologação da KA BIJOUX.");
  }
  return raw;
}

async function writeBackup(file, payload) {
  await fs.writeFile(file, JSON.stringify(payload, (_, value) => typeof value?.toJSON === "function" ? value.toJSON() : value, 2),
    { flag: "wx", mode: 0o600 });
  const verified = JSON.parse(await fs.readFile(file, "utf8"));
  if (verified.projectRef !== PROJECT_REF || !verified.products?.length) throw new Error("Backup de variações não pôde ser verificado.");
}

async function applyPlan(db, plan, backupDir) {
  return db.$transaction(async (tx) => {
    const ids = plan.families.flatMap((family) => family.options.map((option) => option.productId));
    const products = await tx.product.findMany({ where: { id: { in: ids } }, select: productSelect });
    const byId = new Map(products.map((product) => [product.id, product]));
    if (products.length !== new Set(ids).size) throw new Error("Produto comprovado ausente na homologação.");
    for (const family of plan.families) {
      const canonical = byId.get(family.canonicalProductId);
      if (canonical.variations.some((variation) => !family.options.some((option) => option.sku === variation.sku))) {
        throw new Error(`Variação editorial não prevista em ${family.name}.`);
      }
      for (const option of family.options) {
        const product = byId.get(option.productId);
        if (product.sku !== option.sku || String(product.blingId) !== option.blingId ||
            Number(product.price) !== option.price || product.stock !== option.stock) {
          throw new Error(`Preço, estoque ou identidade divergente para ${option.sku}.`);
        }
      }
    }
    const backup = path.join(backupDir, `variation-backup-${Date.now()}-${process.pid}.json`);
    await writeBackup(backup, { version: 1, projectRef: PROJECT_REF, operation: "apply", products });
    for (const family of plan.families) {
      await tx.product.update({ where: { id: family.canonicalProductId },
        data: { name: family.name, sharedVariationStock: false } });
      for (const option of family.options) {
        const current = byId.get(family.canonicalProductId).variations.find((variation) => variation.sku === option.sku);
        const data = { name: family.variationName, value: option.value, sku: option.sku, imageUrl: option.imageUrl,
          stock: option.stock, priceModifier: 0, isDefault: option.isDefault, order: option.order, active: true,
          productId: family.canonicalProductId };
        if (current) await tx.productVariation.update({ where: { id: current.id }, data });
        else await tx.productVariation.create({ data });
      }
      if (family.siblingProductIds.length) {
        await tx.product.updateMany({ where: { id: { in: family.siblingProductIds } }, data: { active: false } });
      }
    }
    return { families: plan.families.length, variations: plan.families.reduce((sum, family) => sum + family.options.length, 0), backup };
  }, { isolationLevel: "Serializable", timeout: 120_000 });
}

async function rollback(db, backup) {
  return db.$transaction(async (tx) => {
    for (const product of backup.products) {
      await tx.productVariation.deleteMany({ where: { productId: product.id } });
      await tx.product.update({ where: { id: product.id }, data: { name: product.name, active: product.active,
        sharedVariationStock: product.sharedVariationStock } });
      for (const variation of product.variations) {
        await tx.productVariation.create({ data: { ...variation, priceModifier: variation.priceModifier,
          createdAt: new Date(variation.createdAt) } });
      }
    }
    return { restoredProducts: backup.products.length };
  }, { isolationLevel: "Serializable", timeout: 120_000 });
}

async function main() {
  const [operation, file] = process.argv.slice(2);
  if (!file || !["preview", "apply", "rollback"].includes(operation)) throw new Error("Use preview, apply ou rollback com um pacote.");
  const payload = JSON.parse((await fs.readFile(file, "utf8")).replace(/^\uFEFF/, ""));
  if (payload.projectRef !== PROJECT_REF) throw new Error("Pacote incompatível com a KA BIJOUX.");
  if (operation === "preview") return console.log(JSON.stringify({ families: payload.families.length,
    variations: payload.families.reduce((sum, family) => sum + family.options.length, 0) }));
  const db = new PrismaClient({ datasourceUrl: localDatabaseUrl() });
  try {
    if (operation === "rollback") return console.log(JSON.stringify(await rollback(db, payload)));
    const backupDir = path.dirname(path.resolve(file));
    console.log(JSON.stringify(await applyPlan(db, payload, backupDir)));
  } finally { await db.$disconnect(); }
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });

module.exports = { applyPlan, rollback };
