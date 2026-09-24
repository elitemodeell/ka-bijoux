function loadEnvironment() {
  require("@next/env").loadEnvConfig(process.cwd());
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} não configurado`);
  return value;
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function isTestAccount(name, email) {
  return /(^|[+._-])(test|teste)([+._@-]|$)|@(example|test)\./i.test(String(email ?? ""))
    || /\bteste?\b/i.test(String(name ?? ""));
}

function passwordAlgorithm(hash) {
  const value = String(hash ?? "");
  if (/^\$2[aby]\$\d{2}\$/.test(value)) return "bcrypt";
  if (/^\$argon2(id|i|d)\$/.test(value)) return "argon2";
  return value ? "unknown" : "missing";
}

function bcryptCost(hash) {
  const match = String(hash ?? "").match(/^\$2[aby]\$(\d{2})\$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function projectRef() {
  const hostname = new URL(required("SUPABASE_URL")).hostname;
  return hostname.split(".")[0];
}

function assertWriteAuthorization() {
  if (!process.argv.includes("--apply")) return false;
  if (process.env.AUTH_MIGRATION_ALLOW_WRITE?.trim().toLowerCase() !== "true") {
    throw new Error("AUTH_MIGRATION_ALLOW_WRITE precisa ser true para --apply");
  }
  const confirmation = process.argv.find((argument) => argument.startsWith("--project-ref="))?.split("=")[1];
  if (!confirmation || confirmation !== projectRef()) {
    throw new Error("Confirmação --project-ref não corresponde ao projeto Supabase conectado");
  }
  return true;
}

function supabaseAdmin() {
  const baseUrl = required("SUPABASE_URL");
  const serviceRole = required("SUPABASE_SERVICE_ROLE_KEY");
  async function request(path, init = {}) {
    const response = await fetch(`${baseUrl}/auth/v1${path}`, {
      ...init,
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error("Supabase Auth admin request failed");
      error.status = response.status;
      error.code = payload?.code ?? payload?.error_code ?? "auth_admin_error";
      return { data: null, error };
    }
    return { data: payload, error: null };
  }
  return {
    auth: {
      admin: {
        listUsers: async ({ page, perPage }) => request(`/admin/users?page=${page}&per_page=${perPage}`),
        createUser: async (attributes) => {
          const result = await request("/admin/users", { method: "POST", body: JSON.stringify(attributes) });
          return result.error ? result : { data: { user: result.data }, error: null };
        },
        deleteUser: async (id) => request(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
      },
    },
  };
}

async function listAllAuthUsers(client) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const pageUsers = Array.isArray(data?.users) ? data.users : [];
    users.push(...pageUsers);
    if (pageUsers.length < 1000) break;
  }
  return users;
}

async function authLinkColumnExists(prisma) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'customers'
        AND column_name = 'authUserId'
    ) AS "exists"
  `);
  return Boolean(rows[0]?.exists);
}

module.exports = {
  assertWriteAuthorization,
  authLinkColumnExists,
  bcryptCost,
  listAllAuthUsers,
  loadEnvironment,
  isTestAccount,
  normalizeEmail,
  passwordAlgorithm,
  projectRef,
  supabaseAdmin,
  validEmail,
};
