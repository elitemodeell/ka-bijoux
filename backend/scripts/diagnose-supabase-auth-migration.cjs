const { PrismaClient } = require("@prisma/client");
const {
  authLinkColumnExists,
  bcryptCost,
  listAllAuthUsers,
  loadEnvironment,
  normalizeEmail,
  passwordAlgorithm,
  supabaseAdmin,
  validEmail,
} = require("./auth-phase1-common.cjs");

loadEnvironment();
const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, email: true, passwordHash: true, active: true },
  });
  const [orders, addresses, admins, store, linkColumn, integrity] = await Promise.all([
    prisma.order.groupBy({ by: ["customerId"], _count: { _all: true } }),
    prisma.address.groupBy({ by: ["customerId"], _count: { _all: true } }),
    prisma.admin.findMany({ select: { name: true, email: true, password: true, active: true } }),
    prisma.storeSettings.findFirst({ select: { storeName: true, storeCity: true, storeState: true } }),
    authLinkColumnExists(prisma),
    prisma.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*)::int FROM orders o LEFT JOIN customers c ON c.id = o."customerId" WHERE c.id IS NULL) AS "orphanOrders",
        (SELECT COUNT(*)::int FROM addresses a LEFT JOIN customers c ON c.id = a."customerId" WHERE c.id IS NULL) AS "orphanAddresses"
    `),
  ]);

  const emailCounts = new Map();
  for (const customer of customers) {
    const normalized = normalizeEmail(customer.email);
    emailCounts.set(normalized, (emailCounts.get(normalized) ?? 0) + 1);
  }
  const algorithms = {};
  const costs = {};
  for (const customer of customers) {
    const algorithm = passwordAlgorithm(customer.passwordHash);
    algorithms[algorithm] = (algorithms[algorithm] ?? 0) + 1;
    const cost = bcryptCost(customer.passwordHash);
    if (cost !== null) costs[cost] = (costs[cost] ?? 0) + 1;
  }

  let authUsers = [];
  let authReadStatus = "ok";
  let authReadErrorCode = null;
  let authUsersFromDatabase = null;
  try {
    authUsers = await listAllAuthUsers(supabaseAdmin());
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : "unknown";
    authReadStatus = `unavailable-${status}`;
    authReadErrorCode = String(error?.code ?? error?.name ?? "unknown").slice(0, 80);
    try {
      const count = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS "count" FROM auth.users');
      authUsersFromDatabase = count[0]?.count ?? null;
    } catch {
      authUsersFromDatabase = null;
    }
  }

  const testPattern = /(^|[+._-])(test|teste)([+._@-]|$)|@(example|test)\./i;
  const result = {
    mode: "dry-run-read-only",
    storeIdentityConfirmed: Boolean(
      store && String(store.storeName).toLowerCase().includes("ka bijoux") && store.storeState === "MG",
    ),
    customers: {
      total: customers.length,
      active: customers.filter((customer) => customer.active).length,
      withPassword: customers.filter((customer) => passwordAlgorithm(customer.passwordHash) !== "missing").length,
      invalidEmail: customers.filter((customer) => !validEmail(customer.email)).length,
      duplicatedNormalizedEmails: [...emailCounts.values()].filter((count) => count > 1).length,
      testAccounts: customers.filter((customer) => testPattern.test(customer.email) || /\bteste?\b/i.test(customer.name)).length,
      passwordAlgorithms: algorithms,
      bcryptCosts: costs,
      lastLoginEvidenceAvailable: false,
    },
    commercialLinks: {
      customersWithOrders: orders.length,
      totalOrders: orders.reduce((total, item) => total + item._count._all, 0),
      customersWithAddresses: addresses.length,
      totalAddresses: addresses.reduce((total, item) => total + item._count._all, 0),
      orphanOrders: integrity[0]?.orphanOrders ?? null,
      orphanAddresses: integrity[0]?.orphanAddresses ?? null,
    },
    admins: {
      total: admins.length,
      active: admins.filter((admin) => admin.active).length,
      withPassword: admins.filter((admin) => Boolean(admin.password)).length,
      testAccounts: admins.filter((admin) => testPattern.test(admin.email) || /\bteste?\b/i.test(admin.name)).length,
    },
    supabaseAuth: {
      readStatus: authReadStatus,
      errorCode: authReadErrorCode,
      usersFromAdminApi: authReadStatus === "ok" ? authUsers.length : null,
      usersFromDatabase: authUsersFromDatabase,
    },
    authUserIdColumnPresent: linkColumn,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch(() => {
  process.stderr.write("AUTH_DIAGNOSTIC_FAILED\n");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
