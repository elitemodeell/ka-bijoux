const fs = require("node:fs/promises");
const path = require("node:path");
const { editorialFingerprint, validate } = require("./apply-catalog-photo-repair.cjs");

function usage() {
  throw new Error("Use: compile-catalog-photo-repair <catalog.json> <timestamps.json> <review.json> <output.json>");
}

async function main() {
  const [catalogFile, timestampsFile, reviewFile, outputFile] = process.argv.slice(2);
  if (!catalogFile || !timestampsFile || !reviewFile || !outputFile) usage();
  const catalog = JSON.parse(await fs.readFile(catalogFile, "utf8"));
  const timestamps = new Map((JSON.parse(await fs.readFile(timestampsFile, "utf8")))
    .map(({ id, createdAt }) => [id, new Date(`${createdAt}Z`).toISOString()]));
  const review = JSON.parse(await fs.readFile(reviewFile, "utf8"));
  if (catalog.projectRef !== "sxohqngzypmxtmuulfoa" || review.projectRef !== catalog.projectRef) {
    throw new Error("Os artefatos não pertencem ao projeto KA BIJOUX.");
  }
  const products = new Map(catalog.products.map((product) => [product.id, product]));
  const images = new Map();
  for (const image of catalog.images) {
    const rows = images.get(image.productId) ?? [];
    rows.push(image);
    images.set(image.productId, rows);
  }
  const invalid = new Map();
  for (const finding of review.confirmedWithoutSku ?? []) {
    const product = products.get(finding.productId);
    if (!product || product.sku) throw new Error("O caso sem SKU deixou de corresponder ao catálogo revisado.");
    const rows = invalid.get(finding.productId) ?? new Set();
    rows.add(finding.imageId);
    invalid.set(finding.productId, rows);
  }
  const galleries = [...invalid.entries()].map(([productId, invalidIds]) => {
    const product = products.get(productId);
    const before = [...(images.get(productId) ?? [])].map((image) => ({ ...image, createdAt: timestamps.get(image.id) }))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    if (!before.length || [...invalidIds].some((id) => !before.some((image) => image.id === id))) {
      throw new Error("O vínculo de foto a remover não está mais no catálogo revisado.");
    }
    const after = before.filter((image) => !invalidIds.has(image.id)).map((image, order) => ({ ...image, order }));
    if (!after.length) throw new Error("Não remova uma galeria sem SKU sem uma fotografia confirmada restante.");
    return {
      productId,
      sku: null,
      editorialFingerprint: editorialFingerprint(product),
      name: product.name,
      before,
      after,
    };
  });
  const bundle = { version: 1, projectRef: catalog.projectRef, galleries };
  validate(bundle);
  await fs.mkdir(path.dirname(path.resolve(outputFile)), { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(bundle, null, 2)}\n`, { flag: "w", mode: 0o600 });
  console.log(JSON.stringify({ galleries: galleries.length, removedLinks: [...invalid.values()].reduce((sum, set) => sum + set.size, 0) }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
