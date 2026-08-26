import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../..");
const source = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

describe("política do catálogo para o build iOS submetido à Apple", () => {
  it("não abre a exportação LGPD protegida no navegador", () => {
    const profile = source("mobile/app/(tabs)/perfil.tsx");
    expect(profile).toContain("customerApi.exportData()");
    expect(profile).toContain("Sharing.shareAsync");
    expect(profile).not.toContain("Linking.openURL(`${BASE_URL}/api/customers/me/export`)");
  });

  it("anexa autenticação e identidade iOS às requisições do aplicativo", () => {
    const api = source("mobile/services/api.ts");
    expect(api).toContain("`Bearer ${token}`");
    expect(api).toContain('config.headers["X-KA-Client-Platform"] = Platform.OS');
    expect(api).toContain('Platform.OS === "ios" ? { line: "normal" }');
  });

  it("remove entradas adultas da home e das categorias somente no iOS", () => {
    const home = source("mobile/app/(tabs)/index.tsx");
    const categories = source("mobile/app/(tabs)/categorias.tsx");
    expect(home).toContain('Platform.OS !== "ios" && <SexShopCard');
    expect(home).toContain('Platform.OS === "ios" ? []');
    expect(categories).toContain('includeAdult: Platform.OS !== "ios"');
  });

  it("bloqueia rotas adultas e deep links de produto no iOS", () => {
    const adultRoute = source("mobile/app/categoria/sex-shop/index.tsx");
    const productRoute = source("mobile/app/produto/[id].tsx");
    const productApi = source("backend/app/api/products/[id]/route.ts");
    expect(adultRoute).toContain('<Redirect href="/(tabs)" />');
    expect(productRoute).toContain("shouldHideCatalogItemOnIos(p)");
    expect(productApi).toContain("iosRequest && isRestrictedIosProduct(product)");
  });

  it("aplica defesa em profundidade a busca, favoritos, carrinho e checkout", () => {
    expect(source("mobile/app/(tabs)/busca.tsx")).toContain("shouldHideCatalogItemOnIos");
    expect(source("mobile/app/favoritos/index.tsx")).toContain("shouldHideCatalogItemOnIos");
    expect(source("mobile/stores/cartStore.ts")).toContain("shouldHideCatalogItemOnIos");
    expect(source("backend/app/api/cart/route.ts")).toContain("isIosAppRequest(req)");
    expect(source("backend/app/api/customers/me/favorites/route.ts")).toContain("isIosAppRequest(req) && isRestrictedIosProduct(product)");
    expect(source("backend/app/api/orders/route.ts")).toContain("item indisponível neste dispositivo");
  });
});
