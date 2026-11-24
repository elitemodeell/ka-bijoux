const fs = require("node:fs/promises");
const path = require("node:path");
const { compare } = require("./reconcile-bling-catalog.cjs");
const { blingStockPolicy, commercialProductUpdate, commercialVariationWrite } = require("./bling-commercial-sync.cjs");

const directory = path.resolve(__dirname, "../../tmp");
const key = (value) => String(value ?? "").trim();
const validPrice = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

function individualBalance(entry, balanceRow, warehouseIds) {
  if (warehouseIds.length) {
    const selected = warehouseIds.map((id) =>
      balanceRow?.depositos?.find((warehouse) => key(warehouse.id) === id)?.saldoVirtual);
    if (!selected.every(Number.isSafeInteger)) return null;
    return Math.max(0, selected.reduce((sum, balance) => sum + balance, 0));
  }
  const balance = balanceRow?.saldoVirtualTotal ?? entry.estoque?.saldoVirtualTotal;
  return Number.isSafeInteger(balance) && balance >= 0 ? balance : null;
}

function prepareSync(snapshot, catalog) {
  const warehouseIds = [...new Set((snapshot.sellableWarehouseIds ?? []).map(key))];
  if (warehouseIds.some((id) => !/^[1-9]\d*$/.test(id))) throw new Error("Depósito comercial inválido.");
  const identity = compare(snapshot, catalog);
  const productById = new Map(snapshot.products.map((row) => [key(row.id), row]));
  const balances = new Map(snapshot.stock.map((row) => [key(row.produto?.id), row]));
  const localById = new Map(catalog.map((row) => [row.id, row]));
  const children = new Set(catalog.map((row) => row.parentId).filter(Boolean));
  const activeChildren = new Set(catalog.filter((row) => row.parentId && row.active).map((row) => row.parentId));
  const skuCount = new Map();
  for (const row of snapshot.products) {
    const sku = key(row.codigo);
    if (sku) skuCount.set(sku, (skuCount.get(sku) ?? 0) + 1);
  }
  const confirmedParents = new Map(identity.candidates
    .filter((row) => row.localId && !row.skuMismatch && row.sku && skuCount.get(row.sku) === 1 && !row.parentBlingId &&
      productById.get(key(row.blingId))?.situacao === "A")
    .map((row) => [key(row.blingId), row.localId]));

  const records = identity.candidates.map((row) => {
    const live = productById.get(key(row.blingId));
    const parent = productById.get(key(row.parentBlingId));
    const parentId = confirmedParents.get(key(row.parentBlingId));
    const details = parent?.variacoes?.find((variant) => key(variant.id) === key(row.blingId));
    const label = key(details?.variacao?.nome);
    const stock = individualBalance(live, balances.get(key(live.id)), warehouseIds);
    const explicitSku = Boolean(row.sku && skuCount.get(row.sku) === 1);
    const evidence = {
      blingId: row.blingId, parentBlingId: row.parentBlingId, sku: row.sku, name: row.name,
      localId: row.localId, parentId: parentId ?? null, stock,
      price: validPrice(live.preco) ? live.preco : null,
      localPhotoCount: row.localPhotoCount, categoryId: live.categoria?.id ?? null,
    };

    if (row.skuMismatch || !explicitSku || !validPrice(live.preco)) return { ...evidence, action: "review-identity-or-price" };
    if (live.situacao !== "A" && !(row.parentBlingId && live.situacao === "I" && row.localId)) {
      return { ...evidence, action: "review-inactive-erp-record" };
    }
    if (!row.parentBlingId) {
      if (!row.localId) return { ...evidence, action: "review-unlinked-product" };
      const local = localById.get(row.localId);
      const policy = blingStockPolicy({ format: live.formato, hasChildren: children.has(row.localId),
        activeOptions: activeChildren.has(row.localId), purchaseMode: local.purchaseMode });
      if (live.formato === "S" && policy.useParentBalance && stock !== null) {
        return { ...evidence, action: "update-product" };
      }
      if (live.formato === "V") {
        return { ...evidence, purchaseMode: policy.purchaseMode, action: "protect-parent-stock" };
      }
      if (live.formato === "S" && policy.useParentBalance && stock === null) {
        return { ...evidence, action: "retain-until-stock-confirmed" };
      }
      return { ...evidence, action: "review-parent-or-shared-stock" };
    }
    if (row.localId && !localById.get(row.localId)?.parentId) {
      if (live.situacao !== "A" || parent?.formato !== "V" || parent.situacao !== "A" ||
          children.has(row.localId)) {
        return { ...evidence, action: "review-standalone-child" };
      }
      if (stock === null) return { ...evidence, action: "retain-until-stock-confirmed" };
      return { ...evidence, parentId: null, action: "update-product" };
    }
    if (!parentId || !explicitSku || parent?.formato !== "V" || !details || !label) {
      return { ...evidence, action: "review-variation" };
    }
    if (stock === null) return { ...evidence, label, action: "review-shared-stock" };
    if (!["A", "I"].includes(live.situacao)) return { ...evidence, action: "review-variation-status" };
    if (!row.localId && catalog.some((item) => key(item.sku) === row.sku)) {
      return { ...evidence, action: "review-sku-collision" };
    }
    const localParent = localById.get(parentId);
    if (!validPrice(localParent.price)) return { ...evidence, action: "review-parent-price" };
    if (row.localId && localById.get(row.localId)?.parentId !== parentId) {
      return { ...evidence, action: "review-parent-conflict" };
    }
    return { ...evidence, label, activeInBling: live.situacao === "A",
      action: row.localId ? "update-variation" : "stage-variation" };
  });

  const max = records.find((row) => row.blingId === 16669991571 && row.localId &&
    /\bip\s*11\s*pro\s*max\b/i.test(row.name));
  const editorialCorrections = max ? [{ localId: max.localId, blingId: max.blingId,
    fromCategory: "bijuterias", toCategory: "capinhas-acessorios-celular" }] : [];
  const confirmed = new Set(records.filter((row) => ["update-product", "protect-parent-stock", "update-variation",
    "retain-until-stock-confirmed", "review-shared-stock"].includes(row.action) &&
    row.activeInBling !== false).map((row) => row.localId));
  const restrictions = snapshot.completeCatalog === true ? catalog.filter((row) => row.active && !confirmed.has(row.id))
    .map((row) => ({ id: row.id, parentId: row.parentId ?? null })) : [];
  return { capturedAt: snapshot.capturedAt, records, restrictions, editorialCorrections, duplicateNames: identity.duplicateNames,
    sharedImages: identity.sharedImages, noPhotoEvidence: identity.noPhotoEvidence };
}

async function applyInHomologation(snapshot, url) {
  const connection = new URL(url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(connection.hostname) ||
      !/^\/(ka_bijoux|kabijoux)[_-](homolog|test)/i.test(connection.pathname) ||
      connection.searchParams.has("host")) {
    throw new Error("Destino de homologação local inválido.");
  }
  const { Prisma, PrismaClient } = require("@prisma/client");
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    return await db.$transaction(async (tx) => {
      const products = await tx.product.findMany({ include: { variations: true, images: true, category: true } });
      const catalog = products.flatMap((product) => [
        { ...product, price: Number(product.price) },
        ...product.variations.map((variation) => ({ ...variation, parentId: product.id,
          images: variation.imageUrl ? [variation.imageUrl] : [] })),
      ]);
      const plan = prepareSync(snapshot, catalog);
      const byId = new Map(products.map((product) => [product.id, product]));
      const actions = plan.records.filter((record) =>
        ["update-product", "update-variation", "stage-variation", "protect-parent-stock"].includes(record.action));
      const productIds = new Set(actions.map((row) => row.parentId ?? row.localId));
      for (const row of plan.restrictions) productIds.add(row.parentId ?? row.id);
      const categories = [];
      for (const correction of plan.editorialCorrections) {
        if (byId.get(correction.localId)?.category.slug !== correction.fromCategory) continue;
        const category = await tx.category.findUnique({ where: { slug: correction.toCategory }, select: { id: true, active: true } });
        if (!category?.active) continue;
        productIds.add(correction.localId);
        categories.push({ id: correction.localId, categoryId: category.id });
      }
      const backup = path.join(directory, `bling-catalog-sync.local.json.backup-${Date.now()}-${process.pid}`);
      await fs.writeFile(backup, JSON.stringify(products.filter((row) => productIds.has(row.id)), null, 2),
        { mode: 0o600, flag: "wx" });
      for (const category of categories) {
        await tx.product.update({ where: { id: category.id },
          data: { categoryId: category.categoryId, subcategoryId: null } });
      }
      for (const row of actions) {
        if (row.action === "protect-parent-stock") {
          await tx.product.update({ where: { id: row.localId },
            data: commercialProductUpdate({ purchaseMode: row.purchaseMode, blingId: String(row.blingId),
              blingVerifiedSku: row.sku, promotionalPrice: null }) });
          continue;
        }
        if (row.action === "update-product") {
          const product = byId.get(row.localId);
          await tx.product.update({ where: { id: product.id }, data: commercialProductUpdate({
            blingId: String(row.blingId),
            blingVerifiedSku: row.sku,
            price: row.price,
            promotionalPrice: null,
            stock: row.stock,
          }) });
          continue;
        }
        const parent = byId.get(row.parentId);
        const priceModifier = new Prisma.Decimal(row.price).minus(parent.price);
        if (row.action === "stage-variation") {
          if (!row.activeInBling) continue;
          await tx.productVariation.create({ data: {
            productId: row.parentId,
            ...commercialVariationWrite({ sku: row.sku, blingId: String(row.blingId), blingVerifiedSku: row.sku,
              name: "Opção", value: row.label, priceModifier, stock: row.stock, active: false }),
          } });
          continue;
        }
        await tx.productVariation.update({ where: { id: row.localId, productId: row.parentId },
          data: commercialVariationWrite({
            blingId: String(row.blingId),
            blingVerifiedSku: row.activeInBling ? row.sku : null,
            priceModifier,
            stock: parent.sharedVariationStock ? undefined : row.stock,
            active: row.activeInBling ? undefined : false,
          }) });
      }
      for (const row of plan.restrictions) {
        if (row.parentId) {
          await tx.productVariation.update({ where: { id: row.id, productId: row.parentId }, data: { active: false, blingVerifiedSku: null } });
        } else {
          await tx.product.update({ where: { id: row.id }, data: { active: false, purchaseMode: "REVIEW", blingVerifiedSku: null } });
        }
      }
      return { actions: actions.length, categoryCorrections: categories.length, backup };
    }, { isolationLevel: "Serializable", timeout: 120_000 });
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const snapshot = JSON.parse(await fs.readFile(path.join(directory, "bling-catalog-snapshot.local.json"), "utf8"));
  if (process.env.KA_BLING_SELLABLE_WAREHOUSE_IDS) {
    snapshot.sellableWarehouseIds = process.env.KA_BLING_SELLABLE_WAREHOUSE_IDS.split(",").map(key);
  }
  if (process.argv.includes("--apply-homologation")) {
    const url = process.env.CATALOG_HOMOLOGATION_DATABASE_URL;
    if (!url) throw new Error("Conexão de homologação local ausente.");
    const result = await applyInHomologation(snapshot, url);
    console.log(JSON.stringify(result));
    return;
  }
  const dbUrl = process.env.CATALOG_DATABASE_READONLY_URL;
  let catalog;
  if (dbUrl) {
    const { readLocalCatalog } = require("./reconcile-bling-catalog.cjs");
    catalog = await readLocalCatalog(dbUrl);
  } else {
    const previous = JSON.parse(await fs.readFile(path.join(directory, "bling-products-report.json"), "utf8"));
    catalog = previous.products.map((row) => ({
      id: `export:${row.blingId}`, blingId: row.blingId, sku: row.sku, price: row.preco,
      stock: row.estoque, images: row.imagem ? [{ url: row.imagem }] : [],
    }));
  }
  const plan = prepareSync(snapshot, catalog);
  const counts = {};
  for (const { action } of plan.records) counts[action] = (counts[action] ?? 0) + 1;
  const source = dbUrl ? "database-read-only" : "previous-export";
  const target = path.join(directory, "bling-catalog-sync.local.json");
  const staged = `${target}.${process.pid}.tmp`;
  await fs.writeFile(staged, JSON.stringify({ source, counts, ...plan }, null, 2), { mode: 0o600, flag: "wx" });
  await fs.rename(staged, target);
  console.log(JSON.stringify({ source, records: plan.records.length, counts }));
}

if (require.main === module) {
  main().catch(() => {
    console.error("Proposta indisponível. Verifique o snapshot e a fonte local autorizada.");
    process.exitCode = 1;
  });
}

module.exports = { prepareSync, applyInHomologation };
