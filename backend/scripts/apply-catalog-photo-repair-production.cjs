const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const { createReadStream } = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { updateGalleries, validate } = require("./apply-catalog-photo-repair.cjs");

const APPROVAL = "APPLY_KA_BIJOUX_CATALOG_PRODUCTION";
const PROJECT_REF = "sxohqngzypmxtmuulfoa";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fileSha256 = (file) => new Promise((resolve, reject) => {
  const hash = crypto.createHash("sha256");
  createReadStream(file).on("data", (chunk) => hash.update(chunk)).on("error", reject)
    .on("end", () => resolve(hash.digest("hex")));
});

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
  const bundle = { version: 1, projectRef: PROJECT_REF, galleries };
  validate(bundle);
  return bundle;
}

async function assertPermit(bundle) {
  const url = new URL(process.env.CATALOG_PRODUCTION_DATABASE_URL ?? "invalid:");
  const targetIdentity = `${url.hostname}|${decodeURIComponent(url.username)}`;
  const approvedSha = sha256(JSON.stringify(bundle));
  if (!url.hostname.endsWith("supabase.com") || !targetIdentity.includes(PROJECT_REF)) {
    throw new Error("Produção bloqueada: identidade Supabase divergente.");
  }
  if (process.env.CATALOG_PRODUCTION_PROJECT_REF !== PROJECT_REF) throw new Error("Produção bloqueada: projeto divergente.");
  if (process.env.CATALOG_PRODUCTION_APPROVAL !== APPROVAL) throw new Error("Produção bloqueada: aprovação explícita ausente.");
  if (process.env.CATALOG_PRODUCTION_APPROVED_SHA256 !== approvedSha) throw new Error("Produção bloqueada: SHA-256 do pacote divergente.");
  const backupDir = process.env.CATALOG_PRODUCTION_BACKUP_DIR;
  if (!backupDir || !path.isAbsolute(backupDir)) throw new Error("Diretório absoluto de backup é obrigatório.");
  const databaseBackup = process.env.CATALOG_PRODUCTION_DATABASE_BACKUP_FILE;
  const databaseBackupSha = process.env.CATALOG_PRODUCTION_DATABASE_BACKUP_SHA256;
  if (!databaseBackup || !path.isAbsolute(databaseBackup) || !databaseBackupSha) {
    throw new Error("Backup externo restaurável e seu SHA-256 são obrigatórios.");
  }
  const stat = await fs.stat(databaseBackup);
  const actualBackupSha = await fileSha256(databaseBackup);
  if (!stat.isFile() || stat.size < 1024 || actualBackupSha !== databaseBackupSha) {
    throw new Error("Backup externo ausente, vazio ou com SHA-256 divergente.");
  }
  await fs.mkdir(backupDir, { recursive: true });
  if (!(await fs.stat(backupDir)).isDirectory()) throw new Error("Destino do backup transacional não é um diretório.");
  return { url: process.env.CATALOG_PRODUCTION_DATABASE_URL, backupDir, approvedSha };
}

async function apply(operation, bundle) {
  const { url, backupDir, approvedSha } = await assertPermit(bundle);
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const identity = await db.$queryRawUnsafe(`SELECT current_database() AS database, current_user AS role,
      to_regclass('public.products')::text AS products, to_regclass('public.product_images')::text AS product_images`);
    const target = identity[0];
    if (target?.database !== "postgres" || target?.products !== "products" || target?.product_images !== "product_images") {
      throw new Error("A identidade estrutural do banco de destino não corresponde à KA BIJOUX.");
    }
    const rollback = operation === "rollback-production";
    return await updateGalleries(db, bundle, rollback, async (changes) => {
      const destination = path.join(backupDir, `catalog-photo-${rollback ? "pre-rollback" : "backup"}-${Date.now()}-${process.pid}.json`);
      const backup = { version: 1, projectRef: PROJECT_REF, operation, bundle, changes, sha256: approvedSha };
      await fs.writeFile(destination, JSON.stringify(backup, null, 2), { flag: "wx", mode: 0o600 });
      const verified = JSON.parse(await fs.readFile(destination, "utf8"));
      if (verified.projectRef !== PROJECT_REF || verified.sha256 !== approvedSha ||
          sha256(JSON.stringify(verified.bundle)) !== approvedSha || verified.changes.length !== changes.length) {
        throw new Error("Falha na verificação efetiva do backup transacional.");
      }
      console.log(`Backup restaurável: ${destination}`);
    });
  } finally { await db.$disconnect(); }
}

async function main() {
  const [operation, ...files] = process.argv.slice(2);
  if (!files.length || !["preview", "apply-production", "rollback-production"].includes(operation)) {
    throw new Error("Use preview, apply-production ou rollback-production com pacotes.");
  }
  const bundle = await readBundle(files);
  if (operation === "preview") {
    console.log(JSON.stringify({ galleries: bundle.galleries.length,
      removedLinks: bundle.galleries.reduce((sum, gallery) => sum + gallery.before.length - gallery.after.length, 0),
      sha256: sha256(JSON.stringify(bundle)) }));
    return;
  }
  console.log(JSON.stringify(await apply(operation, bundle)));
}

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { assertPermit, readBundle, sha256 };
