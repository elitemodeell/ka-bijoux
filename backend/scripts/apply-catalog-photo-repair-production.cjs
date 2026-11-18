const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { updateGalleries, validate } = require("./apply-catalog-photo-repair.cjs");

const APPROVAL = "APPLY_KA_BIJOUX_CATALOG_PRODUCTION";
const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");

async function readBundle(files) {
  const galleries = [];
  const owners = new Set();
  for (const file of files) {
    const bundle = JSON.parse(await fs.readFile(file, "utf8"));
    validate(bundle);
    for (const gallery of bundle.galleries) {
      if (owners.has(gallery.productId)) throw new Error("Produto repetido entre pacotes.");
      owners.add(gallery.productId);
      galleries.push(gallery);
    }
  }
  const bundle = { version: 1, projectRef: "sxohqngzypmxtmuulfoa", galleries };
  validate(bundle);
  return bundle;
}

function assertPermit() {
  const url = new URL(process.env.CATALOG_PRODUCTION_DATABASE_URL ?? "invalid:");
  if (!url.hostname.endsWith("supabase.co") || process.env.CATALOG_PRODUCTION_PROJECT_REF !== "sxohqngzypmxtmuulfoa" ||
      process.env.CATALOG_PRODUCTION_APPROVAL !== APPROVAL || process.env.CATALOG_PRODUCTION_DATABASE_BACKUP_VERIFIED !== "true") {
    throw new Error("Produção bloqueada: URL Supabase, projeto, backup verificado e aprovação explícita são obrigatórios.");
  }
  const backupDir = process.env.CATALOG_PRODUCTION_BACKUP_DIR;
  if (!backupDir || !path.isAbsolute(backupDir)) throw new Error("Diretório absoluto de backup é obrigatório.");
  return { url: process.env.CATALOG_PRODUCTION_DATABASE_URL, backupDir };
}

async function apply(operation, bundle, backupFile) {
  const { url, backupDir } = assertPermit();
  await fs.mkdir(backupDir, { recursive: false });
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const rollback = operation === "rollback-production";
    return await updateGalleries(db, bundle, rollback, async (changes) => {
      const destination = backupFile ?? path.join(backupDir, `catalog-photo-backup-${Date.now()}-${process.pid}.json`);
      await fs.writeFile(destination, JSON.stringify({ version: 1, projectRef: bundle.projectRef, bundle, changes, sha256: sha256(JSON.stringify(bundle)) }, null, 2), { flag: "wx", mode: 0o600 });
      console.log(`Backup restaurável: ${destination}`);
    });
  } finally { await db.$disconnect(); }
}

async function main() {
  const [operation, ...files] = process.argv.slice(2);
  if (!files.length || !["preview", "apply-production", "rollback-production"].includes(operation)) throw new Error("Use preview, apply-production ou rollback-production com pacotes.");
  const bundle = await readBundle(files);
  if (operation === "preview") return console.log(JSON.stringify({ galleries: bundle.galleries.length, removedLinks: bundle.galleries.reduce((sum, gallery) => sum + gallery.before.length - gallery.after.length, 0), sha256: sha256(JSON.stringify(bundle)) }));
  console.log(JSON.stringify(await apply(operation, bundle)));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
