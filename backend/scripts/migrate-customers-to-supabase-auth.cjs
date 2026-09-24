const { PrismaClient } = require("@prisma/client");
const {
  assertWriteAuthorization,
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
const client = supabaseAdmin();

async function main() {
  const apply = assertWriteAuthorization();
  const inheritLegacyVerification = process.argv.includes("--inherit-legacy-email-verification");
  const linkColumn = await authLinkColumnExists(prisma);
  if (apply && !linkColumn) throw new Error("Migration de authUserId ainda não foi aplicada");

  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, email: true, passwordHash: true },
    orderBy: { id: "asc" },
  });
  const authUsers = await listAllAuthUsers(client);
  const authByEmail = new Map();
  for (const user of authUsers) {
    if (!user.email) continue;
    const key = normalizeEmail(user.email);
    const entries = authByEmail.get(key) ?? [];
    entries.push(user);
    authByEmail.set(key, entries);
  }

  const summary = {
    mode: apply ? "apply" : "dry-run",
    totalCustomers: customers.length,
    hashCompatible: 0,
    customersLinkable: 0,
    ignored: 0,
    createAuthUser: 0,
    requiresFirstLogin: 0,
    alreadyMigratedByMetadata: 0,
    conflicts: 0,
    invalidEmail: 0,
    incompatibleHash: 0,
    created: 0,
    linked: 0,
    failed: 0,
  };

  for (const customer of customers) {
    if (!validEmail(customer.email)) {
      summary.invalidEmail += 1;
      summary.ignored += 1;
      continue;
    }
    if (passwordAlgorithm(customer.passwordHash) !== "bcrypt") {
      summary.incompatibleHash += 1;
      summary.ignored += 1;
      continue;
    }
    summary.hashCompatible += 1;

    const existing = authByEmail.get(normalizeEmail(customer.email)) ?? [];
    if (existing.length > 0) {
      const exact = existing.find((user) => user.app_metadata?.customer_id === customer.id);
      if (exact) {
        summary.alreadyMigratedByMetadata += 1;
        if (apply) {
          const linked = await prisma.customer.updateMany({
            where: { id: customer.id, authUserId: null },
            data: { authUserId: exact.id, authMigratedAt: new Date() },
          });
          summary.linked += linked.count;
        }
      } else {
        summary.conflicts += 1;
        summary.ignored += 1;
      }
      continue;
    }

    summary.customersLinkable += 1;
    if (!inheritLegacyVerification) {
      // Sem evidência individual de login anterior, a conta só pode herdar a
      // verificação depois de comprovar a senha no primeiro login.
      summary.requiresFirstLogin += 1;
      summary.ignored += 1;
      continue;
    }

    summary.createAuthUser += 1;
    if (!apply) continue;
    const created = await client.auth.admin.createUser({
      email: customer.email,
      password_hash: customer.passwordHash,
      email_confirm: true,
      user_metadata: { full_name: customer.name },
      app_metadata: {
        customer_id: customer.id,
        migration_source: "ka_customers_2026",
        legacy_email_verification: "inherited_by_controlled_import",
        ...(isTestAccount(customer.name, customer.email) ? { is_test_account: true } : {}),
      },
    });
    if (created.error || !created.data.user) {
      summary.failed += 1;
      continue;
    }
    try {
      const linked = await prisma.customer.updateMany({
        where: { id: customer.id, authUserId: null },
        data: { authUserId: created.data.user.id, authMigratedAt: new Date() },
      });
      if (linked.count !== 1) throw new Error("Customer não pôde ser vinculado");
      summary.created += 1;
      summary.linked += 1;
    } catch {
      await client.auth.admin.deleteUser(created.data.user.id);
      summary.failed += 1;
    }
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (summary.conflicts || summary.invalidEmail || summary.incompatibleHash || summary.failed) process.exitCode = 2;
}

main().catch(() => {
  process.stderr.write("AUTH_MIGRATION_FAILED\n");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
