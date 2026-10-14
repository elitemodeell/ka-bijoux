const AUDIT_BRANCH = "codex/security-audit-20261013";
const HOMOLOG_REF = "pxhsgdfsypvqgmuyvfjt";
const RUNTIME_ID = "ka-preview-20261013-v1";
const PROD_MARKERS = ["sxohqngzypmxtmuulfoa", "kabijoux.com.br"];
const INFORMATIONAL_VERCEL_METADATA = new Set([
  "VERCEL_PROJECT_PRODUCTION_URL",
  "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL",
]);
const MOCK_VARIABLES = [
  "HOMOLOGATION_EXTERNAL_MODE", "EMAIL_DELIVERY_MODE", "PAYMENT_PROVIDER_MODE",
  "SHIPPING_PROVIDER_MODE", "BLING_PROVIDER_MODE",
] as const;

function blocked(reason: string): never {
  throw new Error(`[homologation-runtime] BLOCKED: ${reason}`);
}

function jwtClaim(value: string, claim: string): unknown {
  try { return JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8"))[claim]; }
  catch { blocked("a Supabase key is not a valid project JWT"); }
}

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export function validateHomologationRuntime(env: RuntimeEnvironment = process.env): boolean {
  if (env.VERCEL_ENV === "production") {
    if (env.HOMOLOGATION_MODE === "isolated" || env.HOMOLOGATION_RUNTIME_ID || MOCK_VARIABLES.some((name) => env[name]?.toLowerCase() === "mock")) blocked("homologation configuration leaked into Production");
    return false;
  }
  const active = env.HOMOLOGATION_MODE === "isolated" || env.VERCEL_ENV === "preview";
  if (!active) return false;
  if (env.VERCEL_ENV === "preview" && (env.VERCEL !== "1" || env.VERCEL_GIT_COMMIT_REF !== AUDIT_BRANCH)) blocked("unexpected Preview identity");
  if (env.HOMOLOGATION_RUNTIME_ID !== RUNTIME_ID) blocked("exclusive runtime identity is missing");

  const required = [
    "DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
    "JWT_SECRET", "STORAGE_BUCKET", ...MOCK_VARIABLES,
  ];
  for (const name of required) if (!env[name]?.trim()) blocked(`${name} is missing`);
  for (const [name, value] of Object.entries(env)) {
    if (INFORMATIONAL_VERCEL_METADATA.has(name)) continue;
    const normalized = String(value || "").toLowerCase();
    if (PROD_MARKERS.some((marker) => normalized.includes(marker))) blocked(`${name} references Production`);
  }
  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    try { if (new URL(env[name]!).hostname !== `db.${HOMOLOG_REF}.supabase.co`) blocked(`${name} has an unexpected host`); }
    catch { blocked(`${name} is not a valid database URL`); }
  }
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]) if (env[name] !== `https://${HOMOLOG_REF}.supabase.co`) blocked(`${name} has an unexpected project identity`);
  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== env.SUPABASE_ANON_KEY) blocked("public and server anon keys disagree");
  if (jwtClaim(env.SUPABASE_ANON_KEY!, "ref") !== HOMOLOG_REF || jwtClaim(env.SUPABASE_ANON_KEY!, "role") !== "anon") blocked("anon key belongs to an unexpected project or role");
  if (jwtClaim(env.SUPABASE_SERVICE_ROLE_KEY!, "ref") !== HOMOLOG_REF || jwtClaim(env.SUPABASE_SERVICE_ROLE_KEY!, "role") !== "service_role") blocked("service key belongs to an unexpected project or role");
  if (env.SUPABASE_ANON_KEY === env.SUPABASE_SERVICE_ROLE_KEY) blocked("Supabase roles are not isolated");
  if (env.STORAGE_BUCKET !== "products") blocked("storage is not isolated");
  if (MOCK_VARIABLES.some((name) => env[name] !== "mock")) blocked("an external integration is not in safe mode");
  if (env.JWT_SECRET!.length < 32 || /placeholder|changeme|production/i.test(env.JWT_SECRET!)) blocked("JWT_SECRET is weak or unsafe");
  return true;
}

export function installHomologationNetworkGuard(env: RuntimeEnvironment = process.env): boolean {
  if (!validateHomologationRuntime(env)) return false;
  const allowed = new Set([`${HOMOLOG_REF}.supabase.co`, env.VERCEL_URL].filter(Boolean));
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    let url: URL;
    try { url = new URL(raw); } catch { blocked("a server fetch used a non-absolute URL"); }
    if (url.protocol !== "https:" || !allowed.has(url.hostname)) blocked("outbound network destination is not allowlisted");
    return original(input, init);
  };
  return true;
}
