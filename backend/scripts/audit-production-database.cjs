const fs = require("node:fs");
const { PrismaClient } = require("@prisma/client");

function parseEnvFile(path) {
  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
      .map((line) => {
        const separator = line.indexOf("=");
        let value = line.slice(separator + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        return [line.slice(0, separator), value];
      })
  );
}

async function main() {
  const local = parseEnvFile(".env");
  for (const name of ["DATABASE_URL", "DIRECT_URL", "SUPABASE_URL"]) {
    console.log(
      `${name}_MATCHES_VERCEL_PRODUCTION=${local[name] === process.env[name]}`
    );
  }

  const prisma = new PrismaClient();
  try {
    const [customers, orders, products, store, state] = await Promise.all([
      prisma.customer.count(),
      prisma.order.count(),
      prisma.product.count(),
      prisma.storeSettings.findFirst({
        select: {
          storeName: true,
          storeCity: true,
          storeState: true,
        },
      }),
      prisma.$queryRawUnsafe(`
        SELECT
          (SELECT COUNT(*)::int
           FROM "_prisma_migrations"
           WHERE "finished_at" IS NULL
             AND "rolled_back_at" IS NULL) AS "incompleteMigrations",
          (
            to_regclass('public.payment_webhook_events') IS NOT NULL
            OR to_regclass('public.account_deletion_requests') IS NOT NULL
            OR to_regclass('public.rate_limit_buckets') IS NOT NULL
            OR EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = 'categories'
                AND column_name = 'distributionChannels'
            )
            OR EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = 'customers'
              AND column_name = 'asaasCustomerId'
            )
          ) AS "pendingObjectsAlreadyExist"
          ,
          (
            to_regclass('public.payment_webhook_events') IS NOT NULL
            AND to_regclass('public.account_deletion_requests') IS NOT NULL
            AND to_regclass('public.rate_limit_buckets') IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = 'categories'
                AND column_name = 'distributionChannels'
            )
            AND EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = 'customers'
                AND column_name = 'asaasCustomerId'
            )
          ) AS "requiredObjectsPresent",
          (
            SELECT COUNT(*)::int
            FROM "_prisma_migrations"
            WHERE "finished_at" IS NOT NULL
              AND "migration_name" IN (
                '20260727110000_asaas_financial_safety',
                '20260727143000_payment_multi_provider_methods',
                '20260728100000_account_deletion_flow',
                '20260728170000_google_play_distribution_channels',
                '20260729210000_database_rate_limit'
              )
          ) AS "requiredMigrationsApplied"
      `),
    ]);

    console.log(
      `CORE_TABLES_QUERYABLE=${
        Number.isInteger(customers) &&
        Number.isInteger(orders) &&
        Number.isInteger(products)
      }`
    );
    console.log(
      `STORE_IDENTITY_MATCH=${
        Boolean(store) &&
        String(store.storeName).toLowerCase().includes("ka bijoux") &&
        store.storeCity === "Itaúna" &&
        store.storeState === "MG"
      }`
    );
    console.log(
      `FAILED_OR_INCOMPLETE_MIGRATIONS=${state[0].incompleteMigrations}`
    );
    console.log(
      `PENDING_OBJECTS_ALREADY_EXIST=${state[0].pendingObjectsAlreadyExist}`
    );
    console.log(
      `REQUIRED_MIGRATION_OBJECTS_PRESENT=${state[0].requiredObjectsPresent}`
    );
    console.log(
      `REQUIRED_MIGRATIONS_APPLIED=${state[0].requiredMigrationsApplied}`
    );
    console.log("PRODUCTION_DATABASE_REACHABLE=true");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.log("PRODUCTION_DATABASE_REACHABLE=false");
  process.exitCode = 1;
});
