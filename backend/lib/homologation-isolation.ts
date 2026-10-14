const AUDIT_BRANCH = "codex/security-audit-20261013";

export function isIsolatedHomologation(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.HOMOLOGATION_MODE === "isolated" ||
    (env.VERCEL_ENV === "preview" && env.VERCEL_GIT_COMMIT_REF === AUDIT_BRANCH);
}

export function isHomologationMock(
  variable: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  if (env[variable]?.trim().toLowerCase() !== "mock") return false;
  if (!isIsolatedHomologation(env) || env.VERCEL_ENV === "production") {
    throw new Error(`${variable}=mock is restricted to the isolated homologation branch.`);
  }
  return true;
}
