const fs = require("node:fs/promises");
const path = require("node:path");
const { compare } = require("./reconcile-bling-catalog.cjs");

const directory = path.resolve(__dirname, "../../tmp");
const key = (value) => String(value ?? "").trim();
const validPrice = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

function individualBalance(entry, balances) {
  const balance = balances.get(key(entry.id)) ?? entry.estoque?.saldoVirtualTotal;
  return Number.isSafeInteger(balance) && balance >= 0 ? balance : null;
}

function prepareSync(snapshot, catalog) {
  const identity = compare(snapshot, catalog);
  const productById = new Map(snapshot.products.map((row) => [key(row.id), row]));
  const balances = new Map(snapshot.stock.map((row) => [key(row.produto?.id), row.saldoVirtualTotal]));
  const localById = new Map(catalog.map((row) => [row.id, row]));
  const children = new Set(catalog.map((row) => row.parentId).filter(Boolean));
  const skuCount = new Map();
  for (const row of snapshot.products) {
    const sku = key(row.codigo);
    if (sku) skuCount.set(sku, (skuCount.get(sku) ?? 0) + 1);
  }
  const confirmedParents = new Map(identity.candidates
    .filter((row) => row.localId && !row.skuMismatch && !row.parentBlingId)
    .map((row) => [key(row.blingId), row.localId]));

  const records = identity.candidates.map((row) => {
    const live = productById.get(key(row.blingId));
    const parent = productById.get(key(row.parentBlingId));
    const parentId = confirmedParents.get(key(row.parentBlingId));
    const details = parent?.variacoes?.find((variant) => key(variant.id) === key(row.blingId));
    const label = key(details?.variacao?.nome);
    const stock = individualBalance(live, balances);
    const explicitSku = Boolean(row.sku && skuCount.get(row.sku) === 1);
    const evidence = {
      blingId: row.blingId, parentBlingId: row.parentBlingId, sku: row.sku, name: row.name,
      localId: row.localId, parentId: parentId ?? null, stock,
      price: validPrice(live.preco) ? live.preco : null,
      photoReferences: row.blingPhotoCount, categoryId: live.categoria?.id ?? null,
    };

    if (row.skuMismatch || !validPrice(live.preco)) return { ...evidence, action: "review-identity-or-price" };
    if (!row.parentBlingId) {
      if (!row.localId) return { ...evidence, action: "review-unlinked-product" };
      if (live.formato === "S" && !children.has(row.localId)) {
        return { ...evidence, action: "update-product" };
      }
      return { ...evidence, action: "review-parent-or-shared-stock" };
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
  return { capturedAt: snapshot.capturedAt, records, editorialCorrections, duplicateNames: identity.duplicateNames,
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
        ["update-product", "update-variation", "stage-variation"].includes(record.action));
      const productIds = new Set(actions.map((row) => row.parentId ?? row.localId));
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
        if (row.action === "update-product") {
          const product = byId.get(row.localId);
          await tx.product.update({ where: { id: product.id }, data: {
            price: row.price,
            stock: row.stock === null ? undefined : Math.min(product.stock, row.stock),
          } });
          continue;
        }
        const parent = byId.get(row.parentId);
        const priceModifier = new Prisma.Decimal(row.price).minus(parent.promotionalPrice ?? parent.price);
        if (row.action === "stage-variation") {
          if (!row.activeInBling) continue;
          await tx.productVariation.create({ data: { productId: row.parentId, sku: row.sku,
            name: "Opção", value: row.label, priceModifier, stock: row.stock, active: false } });
          continue;
        }
        const variation = parent.variations.find((record) => record.id === row.localId);
        await tx.productVariation.update({ where: { id: row.localId, productId: row.parentId },
          data: { priceModifier, stock: Math.min(variation.stock, row.stock),
            active: row.activeInBling ? undefined : false } });
      }
      return { actions: actions.length, categoryCorrections: categories.length, backup };
    }, { isolationLevel: "Serializable", timeout: 120_000 });
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const snapshot = JSON.parse(await fs.readFile(path.join(directory, "bling-catalog-snapshot.local.json"), "utf8"));
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
