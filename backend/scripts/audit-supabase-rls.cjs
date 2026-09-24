const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;

  const envPath = path.resolve(__dirname, "..", ".env");
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith("DATABASE_URL="));

  if (!line) throw new Error("DATABASE_URL não encontrada.");
  let value = line.slice("DATABASE_URL=".length).trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  process.env.DATABASE_URL = value;
}

async function main() {
  loadDatabaseUrl();
  const prisma = new PrismaClient();

  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        c.relname AS "tableName",
        c.relrowsecurity AS "rlsEnabled",
        has_table_privilege('anon', c.oid, 'SELECT') AS "anonSelect",
        has_table_privilege('anon', c.oid, 'INSERT') AS "anonInsert",
        has_table_privilege('anon', c.oid, 'UPDATE') AS "anonUpdate",
        has_table_privilege('anon', c.oid, 'DELETE') AS "anonDelete",
        has_table_privilege('authenticated', c.oid, 'SELECT') AS "authenticatedSelect",
        COUNT(pol.polname)::int AS "policyCount"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_policy pol ON pol.polrelid = c.oid
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p')
      GROUP BY c.oid, c.relname, c.relrowsecurity
      ORDER BY c.relname
    `);

    const unsafe = rows.filter((row) => !row.rlsEnabled);
    console.table(rows);
    console.log(`PUBLIC_TABLES=${rows.length}`);
    console.log(`RLS_DISABLED_TABLES=${unsafe.length}`);
    console.log(`RLS_DISABLED_NAMES=${unsafe.map((row) => row.tableName).join(",") || "NONE"}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`RLS_AUDIT_FAILED=${error instanceof Error ? error.message : "unknown"}`);
  process.exitCode = 1;
});
