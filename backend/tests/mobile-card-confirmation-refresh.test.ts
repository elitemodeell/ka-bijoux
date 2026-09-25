import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "../mobile/app/checkout/confirmacao.tsx"),
  "utf8"
);

describe("mobile hosted card confirmation", () => {
  it("refreshes the real server status when the app returns to foreground", () => {
    expect(source).toContain('AppState.addEventListener("change"');
    expect(source).toContain('nextState === "active"');
    expect(source).toContain("void loadOrder()");
  });

  it("polls only while the provider payment is pending or under analysis", () => {
    expect(source).toContain('order?.payment?.status === "AGUARDANDO"');
    expect(source).toContain('order?.payment?.status === "EM_ANALISE"');
    expect(source).toContain("clearInterval(interval)");
  });

  it("does not treat returning from the hosted page as approval", () => {
    expect(source).toContain('paymentStatus === "PAGO"');
    expect(source).toContain("retorno ao aplicativo não confirma o pagamento");
  });
});
