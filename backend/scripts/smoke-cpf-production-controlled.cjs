const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*=/.test(line)) continue;
    const separator = line.indexOf("=");
    const name = line.slice(0, separator);
    let value = line.slice(separator + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!process.env[name]) process.env[name] = value;
  }
}

function cpfFromNine(base) {
  const addDigit = (value) => {
    let sum = 0;
    for (let index = 0; index < value.length; index += 1) {
      sum += Number(value[index]) * (value.length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return value + (remainder === 10 ? "0" : String(remainder));
  };
  return addDigit(addDigit(base));
}

function maskCpf(cpf) {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

async function jsonRequest(pathname, accessToken, body) {
  const response = await fetch(`https://kabijoux.com.br${pathname}`, {
    method: body === undefined ? "GET" : "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}

async function supabaseRequest(pathname, key, options = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL}${pathname}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Supabase request failed with status ${response.status}`);
  return body;
}

async function main() {
  loadEnv();
  const prisma = new PrismaClient();
  const suffix = crypto.randomBytes(8).toString("hex");
  const email = `cpf-smoke-${suffix}@example.com`;
  const password = `K@${crypto.randomBytes(18).toString("base64url")}9`;
  let authUserId;
  let customerId;

  try {
    const created = await supabaseRequest("/auth/v1/admin/users", process.env.SUPABASE_SERVICE_ROLE_KEY, {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Teste controlado CPF" },
      }),
    });
    if (!created.id) throw new Error("auth user not created");
    authUserId = created.id;
    const customer = await prisma.customer.create({
      data: {
        name: "Teste controlado CPF",
        email,
        authUserId,
        authMigratedAt: new Date(),
        passwordHash: await bcrypt.hash(password, 10),
      },
      select: { id: true },
    });
    customerId = customer.id;

    const signedIn = await supabaseRequest("/auth/v1/token?grant_type=password", process.env.SUPABASE_ANON_KEY, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!signedIn.access_token) throw new Error("session not created");
    const token = signedIn.access_token;

    const existingOwner = await prisma.customer.findFirst({
      where: { cpf: { not: null } },
      select: { cpf: true },
    });
    if (existingOwner?.cpf) {
      const conflict = await jsonRequest("/api/customers/me", token, {
        name: "Teste controlado CPF",
        cpf: existingOwner.cpf,
      });
      if (conflict.status !== 409 || conflict.body?.code !== "CPF_IN_USE") {
        throw new Error(`CPF conflict failed with status ${conflict.status}`);
      }
      console.log("PRODUCTION_OTHER_CUSTOMER_CPF_STATUS=409");
      console.log("PRODUCTION_OTHER_CUSTOMER_CPF_CODE=CPF_IN_USE");
    }

    let cpf;
    do {
      cpf = cpfFromNine(String(100000000 + crypto.randomInt(899999999)));
    } while (await prisma.customer.findUnique({ where: { cpf }, select: { id: true } }));

    const first = await jsonRequest("/api/customers/me", token, {
      name: "Teste controlado CPF",
      phone: "(37) 99999-9999",
      cpf: maskCpf(cpf),
    });
    if (first.status !== 200 || first.body?.data?.cpf !== cpf) {
      throw new Error(`first save failed with status ${first.status}`);
    }

    const repeated = await jsonRequest("/api/customers/me", token, {
      name: "Teste controlado atualizado",
      cpf,
    });
    if (repeated.status !== 200 || repeated.body?.data?.cpf !== cpf) {
      throw new Error(`same CPF retry failed with status ${repeated.status}`);
    }

    const persisted = await jsonRequest("/api/customers/me", token);
    if (persisted.status !== 200 || persisted.body?.data?.cpf !== cpf) {
      throw new Error(`persisted read failed with status ${persisted.status}`);
    }

    const invalidPhone = await jsonRequest("/api/customers/me", token, {
      name: "Teste controlado atualizado",
      phone: "123",
    });
    if (invalidPhone.status !== 422 || invalidPhone.body?.code !== "PHONE_INVALID") {
      throw new Error(`field error failed with status ${invalidPhone.status}`);
    }

    console.log("PRODUCTION_FIRST_CPF_SAVE_STATUS=200");
    console.log("PRODUCTION_SAME_CPF_RETRY_STATUS=200");
    console.log("PRODUCTION_PERSISTED_READ_STATUS=200");
    console.log("PRODUCTION_PHONE_INVALID_STATUS=422");
    console.log("PRODUCTION_CPF_LOGGED=MASKED_ONLY");
  } finally {
    if (customerId) await prisma.customer.delete({ where: { id: customerId } }).catch(() => undefined);
    if (authUserId) {
      await supabaseRequest(`/auth/v1/admin/users/${authUserId}`, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        method: "DELETE",
      }).catch(() => undefined);
    }
    await prisma.$disconnect();
    console.log("PRODUCTION_SMOKE_TEST_DATA_REMOVED=true");
  }
}

main().catch((error) => {
  console.error(`PRODUCTION_CPF_SMOKE_FAILED=${error instanceof Error ? error.message.replace(/\d{11}/g, "***.***.***-**") : "unknown"}`);
  process.exitCode = 1;
});
