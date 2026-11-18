const fs = require("node:fs/promises");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const select = { id: true, productId: true, url: true, alt: true, order: true, createdAt: true };
const canonical = (rows) => JSON.stringify([...rows].sort((a, b) => a.id.localeCompare(b.id))
  .map(({ id, productId, url, alt, order, createdAt }) =>
    ({ id, productId, url, alt, order, createdAt: new Date(createdAt).toISOString() })));

function validate(bundle) {
  if (bundle.projectRef !== "sxohqngzypmxtmuulfoa" || bundle.version !== 1 || !Array.isArray(bundle.galleries)) {
    throw new Error("Pacote incompatível com a KA BIJOUX.");
  }
  const owners = new Set();
  for (const entry of bundle.galleries) {
    if (owners.has(entry.productId) || !entry.productId || !entry.sku ||
        !Array.isArray(entry.before) || !Array.isArray(entry.after)) throw new Error("Galeria inválida.");
    owners.add(entry.productId);
    const originals = new Map(entry.before.map((photo) => [photo.id, photo]));
    const seen = new Set();
    for (const row of [...entry.before, ...entry.after]) {
      if (row.productId !== entry.productId || !row.id || typeof row.url !== "string" ||
          !Number.isInteger(row.order) || typeof row.createdAt !== "string" || !Number.isFinite(Date.parse(row.createdAt))) {
        throw new Error("Foto inválida no pacote.");
      }
    }
    for (const row of entry.after) {
      const prior = originals.get(row.id);
      if (seen.has(row.id) || prior?.url !== row.url || prior?.alt !== row.alt || prior?.createdAt !== row.createdAt) {
        throw new Error("Foto sem origem confirmada.");
      }
      seen.add(row.id);
    }
  }
}

async function updateGalleries(db, bundle, rollback, writeBackup) {
  validate(bundle);
  return db.$transaction(async (tx) => {
    const changes = [];
    let alreadyApplied = 0;
    for (const gallery of bundle.galleries) {
      const product = await tx.product.findUnique({ where: { id: gallery.productId },
        select: { sku: true, images: { select } } });
      if (!product || product.sku !== gallery.sku) throw new Error("Identidade do produto divergiu do pacote.");
      const expected = rollback ? gallery.after : gallery.before;
      const desired = rollback ? gallery.before : gallery.after;
      if (canonical(product.images) === canonical(desired)) {
        alreadyApplied++;
        continue;
      }
      if (canonical(product.images) !== canonical(expected)) throw new Error("Galeria modificada desde a revisão. Refaça a conferência.");
      changes.push({ productId: gallery.productId, sku: gallery.sku, current: product.images, desired });
    }
    if (changes.length) await writeBackup(changes);
    for (const { productId, current, desired } of changes) {
      const destination = new Map(desired.map((row) => [row.id, row]));
      const activeIds = new Set(current.map((row) => row.id));
      const removed = current.filter((row) => !destination.has(row.id)).map((row) => row.id);
      if (removed.length) await tx.productImage.deleteMany({ where: { productId, id: { in: removed } } });
      for (const record of desired) {
        if (activeIds.has(record.id)) {
          await tx.productImage.update({ where: { id: record.id, productId }, data: { order: record.order } });
        } else {
          await tx.productImage.create({ data: record });
        }
      }
    }
    return { changed: changes.length, alreadyApplied };
  }, { isolationLevel: "Serializable", timeout: 120_000 });
}

async function main() {
  const [operation, file] = process.argv.slice(2);
  if (!file || !["preview", "apply", "rollback"].includes(operation)) {
    throw new Error("Use preview, apply ou rollback seguido do caminho do pacote.");
  }
  const bundle = JSON.parse(await fs.readFile(file, "utf8"));
  validate(bundle);
  if (operation === "preview") {
    console.log(JSON.stringify({ galleries: bundle.galleries.length, removedLinks: bundle.galleries.reduce(
      (sum, row) => sum + row.before.length - row.after.length, 0),
    }));
    return;
  }
  const url = process.env.CATALOG_HOMOLOGATION_DATABASE_URL;
  const target = new URL(url ?? "invalid:");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
      !/^\/(ka_bijoux|kabijoux)[_-](homolog|test)/i.test(target.pathname) || target.searchParams.has("host")) {
    throw new Error("Aplicação restrita a banco local de homologação da KA BIJOUX.");
  }
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const result = await updateGalleries(db, bundle, operation === "rollback", async (changes) => {
      const backup = path.join(path.dirname(path.resolve(file)), `photo-backup-${Date.now()}-${process.pid}.json`);
      await fs.writeFile(backup, JSON.stringify({ projectRef: bundle.projectRef, operation, changes }, null, 2),
        { flag: "wx", mode: 0o600 });
      console.log(`Backup local: ${backup}`);
    });
    console.log(JSON.stringify(result));
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { updateGalleries, validate };
