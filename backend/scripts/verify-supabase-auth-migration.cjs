const { PrismaClient } = require("@prisma/client");
const {
  authLinkColumnExists,
  listAllAuthUsers,
  loadEnvironment,
  normalizeEmail,
  supabaseAdmin,
} = require("./auth-phase1-common.cjs");

loadEnvironment();
const prisma = new PrismaClient();
const client = supabaseAdmin();

async function main() {
  const linkColumn = await authLinkColumnExists(prisma);
  const [customerCount, orderCount, addressCount, authUsers] = await Promise.all([
    prisma.customer.count(),
    prisma.order.count(),
    prisma.address.count(),
    listAllAuthUsers(client),
  ]);

  let linked = [];
  if (linkColumn) {
    linked = await prisma.customer.findMany({
      where: { authUserId: { not: null } },
      select: { id: true, email: true, authUserId: true },
    });
  }
  const authById = new Map(authUsers.map((user) => [user.id, user]));
  const missingAuthUser = linked.filter((customer) => !authById.has(customer.authUserId)).length;
  const emailMismatch = linked.filter((customer) => {
    const user = authById.get(customer.authUserId);
    return user?.email && normalizeEmail(user.email) !== normalizeEmail(customer.email);
  }).length;
  const duplicateLinks = linked.length - new Set(linked.map((customer) => customer.authUserId)).size;
  const migratedOrphans = authUsers.filter((user) => {
    if (user.app_metadata?.migration_source !== "ka_customers_2026") return false;
    return !linked.some((customer) => customer.id === user.app_metadata?.customer_id && customer.authUserId === user.id);
  }).length;

  const result = {
    mode: "dry-run-read-only",
    authUserIdColumnPresent: linkColumn,
    customers: customerCount,
    orders: orderCount,
    addresses: addressCount,
    supabaseAuthUsers: authUsers.length,
    linkedCustomers: linked.length,
    missingAuthUser,
    emailMismatch,
    duplicateLinks,
    migratedOrphans,
    valid: linkColumn && missingAuthUser === 0 && emailMismatch === 0 && duplicateLinks === 0 && migratedOrphans === 0,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.valid) process.exitCode = 2;
}

main().catch(() => {
  process.stderr.write("AUTH_POST_VERIFY_FAILED\n");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
