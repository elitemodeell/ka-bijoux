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
  if (!line) throw new Error("DATABASE_URL ausente");
  let value = line.slice("DATABASE_URL=".length).trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  process.env.DATABASE_URL = value;
}

function normalizeCpf(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidCpf(value) {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

function duplicateGroupCount(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
}

async function main() {
  loadDatabaseUrl();
  const prisma = new PrismaClient();
  try {
    const customers = await prisma.customer.findMany({
      select: {
        cpf: true,
        email: true,
        authUserId: true,
        asaasCustomerId: true,
        asaasCreationClaimedAt: true,
      },
    });
    const withCpf = customers.filter((customer) => customer.cpf);
    const normalizedCpfs = withCpf.map((customer) => normalizeCpf(customer.cpf));
    console.log(`CUSTOMERS_TOTAL=${customers.length}`);
    console.log(`CUSTOMERS_WITH_CPF=${withCpf.length}`);
    console.log(`CPF_NOT_NORMALIZED=${withCpf.filter((customer) => customer.cpf !== normalizeCpf(customer.cpf)).length}`);
    console.log(`CPF_INVALID=${withCpf.filter((customer) => !isValidCpf(customer.cpf)).length}`);
    console.log(`CPF_NORMALIZED_DUPLICATE_GROUPS=${duplicateGroupCount(normalizedCpfs)}`);
    console.log(`AUTH_USER_DUPLICATE_GROUPS=${duplicateGroupCount(customers.map((customer) => customer.authUserId))}`);
    console.log(`EMAIL_CASE_INSENSITIVE_DUPLICATE_GROUPS=${duplicateGroupCount(customers.map((customer) => customer.email.toLowerCase()))}`);
    console.log(`ASAAS_ID_DUPLICATE_GROUPS=${duplicateGroupCount(customers.map((customer) => customer.asaasCustomerId))}`);
    console.log(`ASAAS_WITHOUT_CPF=${customers.filter((customer) => customer.asaasCustomerId && !customer.cpf).length}`);
    console.log(`ASAAS_CLAIM_WITHOUT_CPF=${customers.filter((customer) => customer.asaasCreationClaimedAt && !customer.cpf).length}`);
    console.log("CPF_AUDIT_EXPOSED_VALUES=0");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`CPF_AUDIT_FAILED=${error instanceof Error ? error.name : "unknown"}`);
  process.exitCode = 1;
});
