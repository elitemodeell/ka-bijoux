const { PrismaClient } = require("@prisma/client");
const {
  authLinkColumnExists,
  isTestAccount,
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
  const linkColumn = await authLinkColumnExists(prisma);
  const [customers, authUsers] = await Promise.all([
    prisma.customer.findMany({
      select: { id: true, name: true, email: true, active: true, passwordHash: true, authUserId: true },
    }),
    listAllAuthUsers(supabaseAdmin()),
  ]);

  const authById = new Map(authUsers.map((user) => [user.id, user]));
  const authByEmail = new Map();
  for (const user of authUsers) {
    if (!user.email) continue;
    const key = normalizeEmail(user.email);
    const group = authByEmail.get(key) ?? [];
    group.push(user);
    authByEmail.set(key, group);
  }

  let migrated = 0;
  let pending = 0;
  let failed = 0;
  let conflicts = 0;
  let realMigrated = 0;
  let realPending = 0;
  let testMigrated = 0;
  let testPending = 0;

  for (const customer of customers) {
    if (!customer.active || !validEmail(customer.email) || passwordAlgorithm(customer.passwordHash) !== "bcrypt") {
      failed += 1;
      continue;
    }
    const test = isTestAccount(customer.name, customer.email);
    if (customer.authUserId) {
      const user = authById.get(customer.authUserId);
      if (!user || normalizeEmail(user.email) !== normalizeEmail(customer.email)) {
        failed += 1;
        continue;
      }
      migrated += 1;
      if (test) testMigrated += 1;
      else realMigrated += 1;
      continue;
    }

    const sameEmail = authByEmail.get(normalizeEmail(customer.email)) ?? [];
    if (sameEmail.length > 0) {
      conflicts += 1;
      continue;
    }
    pending += 1;
    if (test) testPending += 1;
    else realPending += 1;
  }

  process.stdout.write(`${JSON.stringify({
    mode: "read-only",
    authLinkColumnPresent: linkColumn,
    eligible: customers.filter((customer) => customer.active && validEmail(customer.email) && passwordAlgorithm(customer.passwordHash) === "bcrypt").length,
    migrated,
    pending,
    failed,
    conflicts,
    realMigrated,
    realPending,
    testMigrated,
    testPending,
  }, null, 2)}\n`);
}

main().catch(() => {
  process.stderr.write("AUTH_MONITOR_FAILED\n");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
