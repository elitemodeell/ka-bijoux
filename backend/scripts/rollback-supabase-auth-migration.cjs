const { PrismaClient } = require("@prisma/client");
const {
  assertWriteAuthorization,
  authLinkColumnExists,
  listAllAuthUsers,
  loadEnvironment,
  supabaseAdmin,
} = require("./auth-phase1-common.cjs");

loadEnvironment();
const prisma = new PrismaClient();
const client = supabaseAdmin();

async function main() {
  const apply = assertWriteAuthorization();
  const deleteAuthUsers = process.argv.includes("--delete-auth-users");
  const linkColumn = await authLinkColumnExists(prisma);
  if (!linkColumn) {
    process.stdout.write(`${JSON.stringify({ mode: apply ? "apply" : "dry-run", linkedCustomers: 0, status: "migration-not-applied" }, null, 2)}\n`);
    return;
  }

  const linkedCustomers = await prisma.customer.findMany({
    where: { authUserId: { not: null } },
    select: { id: true, authUserId: true, passwordHash: true },
  });
  const authUsers = await listAllAuthUsers(client);
  const authById = new Map(authUsers.map((user) => [user.id, user]));
  const eligible = linkedCustomers.filter((customer) => {
    const user = authById.get(customer.authUserId);
    return user?.app_metadata?.migration_source === "ka_customers_2026"
      && user.app_metadata?.customer_id === customer.id
      && Boolean(customer.passwordHash);
  });

  const summary = {
    mode: apply ? "apply" : "dry-run",
    linkedCustomers: linkedCustomers.length,
    eligibleForRollback: eligible.length,
    protectedFromRollback: linkedCustomers.length - eligible.length,
    authUsersWillBeDeleted: deleteAuthUsers ? eligible.length : 0,
    unlinked: 0,
    authUsersDeleted: 0,
    failed: 0,
  };

  if (apply) {
    for (const customer of eligible) {
      try {
        const updated = await prisma.customer.updateMany({
          where: { id: customer.id, authUserId: customer.authUserId },
          data: { authUserId: null, authMigratedAt: null },
        });
        if (updated.count !== 1) throw new Error("Vínculo mudou durante o rollback");
        summary.unlinked += 1;
        if (deleteAuthUsers) {
          const deleted = await client.auth.admin.deleteUser(customer.authUserId);
          if (deleted.error) throw deleted.error;
          summary.authUsersDeleted += 1;
        }
      } catch {
        summary.failed += 1;
      }
    }
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (summary.protectedFromRollback || summary.failed) process.exitCode = 2;
}

main().catch(() => {
  process.stderr.write("AUTH_ROLLBACK_FAILED\n");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
