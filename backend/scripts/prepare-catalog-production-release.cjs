const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { validate } = require("./apply-catalog-photo-repair.cjs");

const digest = (text) => crypto.createHash("sha256").update(text).digest("hex");

async function main() {
  const [outputFile, ...files] = process.argv.slice(2);
  if (!outputFile || !files.length) throw new Error("Use: prepare-catalog-production-release <manifest.json> <repair-package...>");
  const packages = [];
  const owners = new Set();
  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const bundle = JSON.parse(raw);
    validate(bundle);
    for (const gallery of bundle.galleries) {
      if (owners.has(gallery.productId)) throw new Error("Um produto não pode aparecer em dois pacotes.");
      owners.add(gallery.productId);
    }
    packages.push({ file: path.basename(file), sha256: digest(raw), galleries: bundle.galleries.length,
      removedLinks: bundle.galleries.reduce((sum, gallery) => sum + gallery.before.length - gallery.after.length, 0) });
  }
  const manifest = {
    version: 1,
    projectRef: "sxohqngzypmxtmuulfoa",
    generatedAt: new Date().toISOString(),
    packages,
    safeguards: [
      "Recollect the exact galleries using the Supabase read-only role immediately before apply.",
      "Verify every package SHA-256 and re-run preview against a restored homologation backup.",
      "Take and verify a database backup before the serializable transaction.",
      "Use a time-limited KA BIJOUX production-only database role and revoke it after validation.",
      "Run rollback from the backup package if post-apply gallery counts or order/customer counts diverge.",
    ],
  };
  await fs.mkdir(path.dirname(path.resolve(outputFile)), { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "w", mode: 0o600 });
  console.log(JSON.stringify({ packages: packages.length, galleries: owners.size,
    removedLinks: packages.reduce((sum, item) => sum + item.removedLinks, 0) }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
