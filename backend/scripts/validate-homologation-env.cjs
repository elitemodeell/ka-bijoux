const EXPECTED_BRANCH = "codex/security-audit-20261013";
const HOMOLOG_REF = "pxhsgdfsypvqgmuyvfjt";
const RUNTIME_ID = "ka-preview-20261013-v1";
const PROD_MARKERS = ["sxohqngzypmxtmuulfoa", "kabijoux.com.br"];

function fail(message) {
  console.error(`[homologation-guard] BLOCKED: ${message}`);
  process.exitCode = 1;
}

const active = process.env.HOMOLOGATION_MODE === "isolated" ||
  (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === EXPECTED_BRANCH);
if (!active) {
  console.log("[homologation-guard] skipped outside the isolated audit branch");
  process.exit(0);
}

const required = [
  "DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_SECRET", "HOMOLOGATION_EXTERNAL_MODE", "EMAIL_DELIVERY_MODE",
  "PAYMENT_PROVIDER_MODE", "SHIPPING_PROVIDER_MODE", "BLING_PROVIDER_MODE",
  "HOMOLOGATION_RUNTIME_ID", "STORAGE_BUCKET",
];
for (const name of required) if (!process.env[name]?.trim()) fail(`${name} is missing`);
for (const [name, value] of Object.entries(process.env)) {
  const normalized = String(value || "").toLowerCase();
  for (const marker of PROD_MARKERS) if (normalized.includes(marker)) fail(`${name} references a production resource`);
}
for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  try {
    const url = new URL(process.env[name]);
    if (url.hostname !== `db.${HOMOLOG_REF}.supabase.co`) fail(`${name} has an unexpected host`);
  } catch { fail(`${name} is not a valid database URL`); }
}
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"])
  if (process.env[name] !== `https://${HOMOLOG_REF}.supabase.co`) fail(`${name} does not match homologation`);
if (process.env.HOMOLOGATION_RUNTIME_ID !== RUNTIME_ID) fail("exclusive runtime identity is missing");
if (process.env.STORAGE_BUCKET !== "products") fail("storage bucket is not isolated");
for (const name of ["HOMOLOGATION_EXTERNAL_MODE", "EMAIL_DELIVERY_MODE", "PAYMENT_PROVIDER_MODE", "SHIPPING_PROVIDER_MODE", "BLING_PROVIDER_MODE"])
  if (process.env[name] !== "mock") fail(`${name} must be mock`);
if ((process.env.JWT_SECRET || "").length < 32) fail("JWT_SECRET is too short");
if (/placeholder|changeme|production/i.test(process.env.JWT_SECRET || "")) fail("JWT_SECRET is unsafe");

function claim(value, name) {
  try { return JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8"))[name]; }
  catch { fail("a Supabase key is not a valid project JWT"); return undefined; }
}
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== process.env.SUPABASE_ANON_KEY) fail("anon keys disagree");
if (claim(process.env.SUPABASE_ANON_KEY || "", "ref") !== HOMOLOG_REF || claim(process.env.SUPABASE_ANON_KEY || "", "role") !== "anon") fail("anon key identity is incorrect");
if (claim(process.env.SUPABASE_SERVICE_ROLE_KEY || "", "ref") !== HOMOLOG_REF || claim(process.env.SUPABASE_SERVICE_ROLE_KEY || "", "role") !== "service_role") fail("service key identity is incorrect");
if (!process.exitCode) console.log("[homologation-guard] PASS");
