const fs = require("node:fs/promises");
const path = require("node:path");

const directory = path.resolve(__dirname, "../../tmp");

function buildReviewQueue(baseline, current) {
  const issues = new Map();
  function flag(id, issue) {
    const key = String(id ?? "").trim();
    if (!key) return;
    if (!issues.has(key)) issues.set(key, new Set());
    issues.get(key).add(issue);
  }

  for (const group of baseline.duplicates.byName) {
    for (const row of group.items) flag(row.id, "nome-repetido");
  }
  for (const group of baseline.sharedImages) {
    for (const row of group.products) flag(row.blingId, "referencia-de-imagem-compartilhada");
  }
  for (const row of baseline.products) {
    if (row.semImagem) flag(row.blingId, "imagem-ausente-no-export");
  }

  const original = new Map(baseline.products.map((row) => [String(row.blingId), row]));
  const observed = new Map(current?.candidates.map((row) => [String(row.blingId), row]));
  return [...issues].map(([id, reasons]) => {
    const before = original.get(id);
    const after = observed.get(id);
    let photoEvidence = "aguardando-snapshot";
    if (current && !after) photoEvidence = "ausente-no-snapshot";
    if (after) {
      photoEvidence = after.blingPhotoCount || after.localPhotoCount
        ? "referencia-localizada-requer-conferencia"
        : "referencia-nao-localizada";
    }
    return {
      blingId: id, sku: before?.sku ?? null, name: before?.nome ?? null,
      reasons: [...reasons], photoEvidence,
      localId: after?.localId ?? null, parentBlingId: after?.parentBlingId ?? null,
      identity: after?.disposition ?? null, skuMismatch: after?.skuMismatch ?? null,
    };
  });
}

async function main() {
  const baseline = JSON.parse(await fs.readFile(path.join(directory, "bling-products-report.json"), "utf8"));
  const current = await fs.readFile(path.join(directory, "bling-catalog-reconciliation.local.json"), "utf8")
    .then(JSON.parse)
    .catch((error) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
  const queue = buildReviewQueue(baseline, current);
  const target = path.join(directory, "bling-catalog-review.local.json");
  const temporary = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify({ mode: current ? "snapshot" : "export", products: queue }, null, 2),
    { mode: 0o600, flag: "wx" });
  await fs.rename(temporary, target);
  console.log(`Fila local: ${queue.length} produtos. Fonte: ${current ? "snapshot conciliado" : "export existente"}.`);
}

if (require.main === module) {
  main().catch(() => {
    console.error("Não foi possível montar a fila. Verifique os relatórios locais do catálogo.");
    process.exitCode = 1;
  });
}

module.exports = { buildReviewQueue };
