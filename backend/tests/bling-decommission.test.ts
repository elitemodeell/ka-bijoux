import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const backendRoot = resolve(process.cwd());
const repositoryRoot = resolve(backendRoot, "..");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = resolve(directory, entry);
      return statSync(path).isDirectory() ? sourceFiles(path) : [path];
    })
    .filter((path) => /\.(?:ts|tsx|js|mjs|cjs)$/.test(path));
}

describe("Bling desativado como dependencia operacional", () => {
  it("nao oferece exportacao ou reimportacao do Bling", () => {
    const packageJson = JSON.parse(readFileSync(resolve(backendRoot, "package.json"), "utf8"));

    expect(packageJson.scripts["bling:import"]).toBeUndefined();
    expect(existsSync(resolve(repositoryRoot, "export-bling.js"))).toBe(false);
    expect(existsSync(resolve(backendRoot, "scripts/import-bling-products.js"))).toBe(false);
  });

  it("nao permite imagens remotas nem chamadas para a API do Bling", () => {
    const runtimeSources = [resolve(backendRoot, "app"), resolve(backendRoot, "lib")]
      .flatMap(sourceFiles)
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    const nextConfig = readFileSync(resolve(backendRoot, "next.config.mjs"), "utf8");

    expect(runtimeSources).not.toMatch(/api\.bling\.com|www\.bling\.com\/Api/i);
    expect(runtimeSources).not.toMatch(/BLING_CLIENT_(?:ID|SECRET)|BLING_ACCESS_TOKEN/i);
    expect(nextConfig).not.toMatch(/hostname:\s*["'][^"']*bling\.com\.br/i);
  });

  it("mantem catalogo, carrinho e pedidos apoiados no banco proprio", () => {
    const products = readFileSync(resolve(backendRoot, "app/api/products/route.ts"), "utf8");
    const cart = readFileSync(resolve(backendRoot, "app/api/cart/route.ts"), "utf8");
    const orders = readFileSync(resolve(backendRoot, "app/api/orders/route.ts"), "utf8");

    expect(products).toContain("prisma.product");
    expect(cart).toContain("prisma.cart");
    expect(orders).toContain("prisma.order");
    expect(`${products}\n${cart}\n${orders}`).not.toMatch(/fetch\([^)]*bling/i);
  });
});
