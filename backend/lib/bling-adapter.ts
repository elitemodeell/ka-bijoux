import { isHomologationMock } from "@/lib/homologation-isolation";

export type BlingOperationResult = { ok: true; operationId: string } | { ok: false; reason: "simulated_failure" };

export async function runBlingOperation(input: { operation: string; simulateFailure?: boolean }): Promise<BlingOperationResult> {
  if (!isHomologationMock("BLING_PROVIDER_MODE")) {
    throw new Error("Bling online adapter is not enabled in this audited path.");
  }
  if (input.simulateFailure) return { ok: false, reason: "simulated_failure" };
  return { ok: true, operationId: `mock-bling-${input.operation.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}` };
}
