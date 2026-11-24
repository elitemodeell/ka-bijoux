const fs = require("node:fs/promises");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { approvedOwnPhotoUrls } = require("./bling-commercial-sync.cjs");

const files = path.resolve(__dirname, "../../tmp");

function indexBy(entries, getKey) {
  const index = new Map();
  for (const entry of entries) {
    const key = getKey(entry);
    if (key) index.set(key, [...(index.get(key) ?? []), entry]);
  }
  return index;
}

function key(value) {
  return value == null ? "" : String(value).trim();
}

function compare(snapshot, local) {
  const byId = indexBy(local.filter((entry) => !entry.parentId), (row) => key(row.blingId));
  const bySku = indexBy(local, (row) => key(row.sku));
  const erpSkus = indexBy(snapshot.products, (row) => key(row.codigo));
  const erpIds = indexBy(snapshot.products, (row) => key(row.id));
  const inventory = indexBy(snapshot.stock, (entry) => key(entry.produto?.id));
  const photosByProduct = new Map(local.map((entry) => [entry.id, approvedOwnPhotoUrls(entry.images, entry.parentId ?? entry.id)]));
  const candidates = snapshot.products.map((entry) => {
    const idMatches = byId.get(key(entry.id)) ?? [];
    const sku = key(entry.codigo);
    const skuMatches = bySku.get(sku) ?? [];
    const parent = (byId.get(key(entry.idProdutoPai)) ?? [])[0];
    const remoteParents = erpIds.get(key(entry.idProdutoPai)) ?? [];
    const uniqueSku = sku && erpSkus.get(sku)?.length === 1 && skuMatches.length === 1 ? skuMatches[0] : undefined;
    const byExactSku = uniqueSku && (entry.idProdutoPai
      ? (uniqueSku.parentId ? parent?.id === uniqueSku.parentId :
        (!uniqueSku.blingId || key(uniqueSku.blingId) === key(entry.id)) &&
        remoteParents.length === 1 && remoteParents[0].situacao === "A" && remoteParents[0].formato === "V")
      : !uniqueSku.parentId && (!uniqueSku.blingId || key(uniqueSku.blingId) === key(entry.id)));
    const idConflict = idMatches.length > 1 || (idMatches[0] && sku && skuMatches.some((match) => match.id !== idMatches[0].id));
    const match = idConflict ? undefined : (idMatches[0] ?? (byExactSku ? uniqueSku : undefined));
    return {
      blingId: entry.id, parentBlingId: entry.idProdutoPai ?? null, sku, name: entry.nome,
      localId: match?.id ?? null,
      skuMismatch: Boolean(match && key(match.sku) !== sku),
      disposition: match ? "identidade-confirmada" : "revisar-identidade",
      localPhotoCount: match ? photosByProduct.get(match.id).length : null,
      stockRecords: inventory.get(key(entry.id))?.length ?? 0,
    };
  });
  const normalizedNames = indexBy(candidates, (row) => key(row.name).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase());
  const sharedPhotos = indexBy(candidates.flatMap((row) => (photosByProduct.get(row.localId) ?? []).map((image) => ({ image, id: row.blingId }))), (item) => item.image);
  return {
    capturedAt: snapshot.capturedAt,
    candidates,
    duplicateNames: [...normalizedNames.values()].filter((rows) => rows.length > 1).map((rows) => rows.map((row) => row.blingId)),
    sharedImages: [...sharedPhotos.values()].filter((rows) => rows.length > 1).map((rows) => rows.map((row) => row.id)),
    noPhotoEvidence: candidates.filter((row) => !row.localPhotoCount).map((row) => row.blingId),
  };
}

async function readLocalCatalog(url) {
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const products = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return tx.product.findMany({
        select: { id: true, blingId: true, sku: true, price: true, stock: true, active: true, purchaseMode: true,
          images: { select: { url: true } }, variations: { select: { id: true, sku: true, imageUrl: true, stock: true, active: true } } },
      });
    }, { timeout: 60_000 });
    return products.flatMap(({ variations, ...p }) => [
      { ...p, price: Number(p.price) },
      ...variations.map(({ imageUrl, ...row }) => ({ ...row, parentId: p.id, images: imageUrl ? [imageUrl] : [] })),
    ]);
  } finally {
    await db.$disconnect();
  }
}

async function main() {
    const url = process.env.CATALOG_DATABASE_READONLY_URL;
    if (!url) throw new Error("CATALOG_DATABASE_READONLY_URL não está disponível na sessão autorizada.");
    const snapshot = JSON.parse(await fs.readFile(path.join(files, "bling-catalog-snapshot.local.json"), "utf8"));
    const report = compare(snapshot, await readLocalCatalog(url));
    const target = path.join(files, "bling-catalog-reconciliation.local.json");
    const temporary = `${target}.${process.pid}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(report, null, 2), { mode: 0o600, flag: "wx" });
    await fs.rename(temporary, target);
    console.log(`Conciliação somente leitura: ${report.candidates.length} itens. Arquivo local em ${target}.`);
}

if (require.main === module) {
  main().catch(() => {
    console.error("Conciliação indisponível. Verifique o snapshot local e a conexão de leitura autorizada.");
    process.exitCode = 1;
  });
}

module.exports = { compare, readLocalCatalog };
