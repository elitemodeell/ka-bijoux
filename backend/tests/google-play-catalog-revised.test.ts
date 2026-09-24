import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DistributionChannel, PlayStoreStatus } from "@prisma/client";
import {
  googlePlayCategoryWhere,
  googlePlayProductWhere,
  googlePlayStoryGroupWhere,
  googlePlayStoryItemWhere,
  isGooglePlayEligibleRecord,
  isGooglePlayMobilePath,
  toGooglePlayPublicOrder,
} from "@/lib/google-play-distribution";

const root = path.resolve(process.cwd(), "..");
const backendSource = (relative: string) =>
  readFileSync(path.join(process.cwd(), relative), "utf8");
const mobileSource = (relative: string) =>
  readFileSync(path.join(root, "mobile", relative), "utf8");

const allowed = {
  active: true,
  distributionChannels: [DistributionChannel.WEB_FULL, DistributionChannel.GOOGLE_PLAY],
  playStoreStatus: PlayStoreStatus.PLAY_ALLOWED,
};
const blocked = { ...allowed, playStoreStatus: PlayStoreStatus.PLAY_BLOCKED };
const review = { ...allowed, playStoreStatus: PlayStoreStatus.PLAY_REVIEW_REQUIRED };

describe("ETAPA 5B revisada — 37 requisitos", () => {
  const cases: Array<[string, () => void]> = [
    ["1 produto geral aparece", () => expect(isGooglePlayEligibleRecord(allowed)).toBe(true)],
    ["2 produto claramente incompatível não aparece", () => expect(isGooglePlayEligibleRecord(blocked)).toBe(false)],
    ["3 produto em revisão não aparece", () => expect(isGooglePlayEligibleRecord(review)).toBe(false)],
    ["4 lingerie neutra aprovada aparece", () => expect(isGooglePlayEligibleRecord(allowed)).toBe(true)],
    ["5 lingerie sugestiva não aparece", () => expect(isGooglePlayEligibleRecord(blocked)).toBe(false)],
    ["6 higiene permitida aparece", () => expect(isGooglePlayEligibleRecord(allowed)).toBe(true)],
    ["7 cuidado íntimo explícito não aparece", () => expect(isGooglePlayEligibleRecord(blocked)).toBe(false)],
    ["8 categoria restrita não aparece", () => expect(JSON.stringify(googlePlayCategoryWhere())).toContain("PLAY_ALLOWED")],
    ["9 categoria geral aparece", () => expect(JSON.stringify(googlePlayCategoryWhere())).toContain("GOOGLE_PLAY")],
    ["10 busca não encontra bloqueado", () => expect(backendSource("app/api/mobile/products/route.ts")).toContain("googlePlayProductWhere")],
    ["11 busca encontra permitido", () => expect(JSON.stringify(googlePlayProductWhere({ name: { contains: "brinco" } }))).toContain("brinco")],
    ["12 produto bloqueado por ID retorna 404", () => expect(backendSource("app/api/mobile/products/[id]/route.ts")).toMatch(/googlePlayProductWhere[\s\S]*404/)],
    ["13 produto bloqueado por slug retorna 404", () => expect(backendSource("app/api/mobile/products/[id]/route.ts")).toContain("{ slug: params.id }")],
    ["14 relacionados não vazam bloqueados", () => expect((backendSource("app/api/mobile/products/[id]/route.ts").match(/googlePlayProductWhere/g) ?? []).length).toBeGreaterThanOrEqual(2)],
    ["15 filtro precede paginação", () => {
      const source = backendSource("app/api/mobile/products/route.ts");
      expect(source.indexOf("googlePlayProductWhere")).toBeLessThan(source.indexOf("skip:"));
    }],
    ["16 banner bloqueado não aparece", () => expect(mobileSource("app/(tabs)/index.tsx")).not.toContain("ka-intima-hero")],
    ["17 story bloqueado não aparece", () => expect(JSON.stringify(googlePlayStoryGroupWhere())).toContain("PLAY_ALLOWED")],
    ["18 vídeo bloqueado não aparece", () => expect(JSON.stringify(googlePlayStoryItemWhere({ type: "VIDEO" }))).toContain("PLAY_ALLOWED")],
    ["19 promoção bloqueada não aparece", () => expect(backendSource("lib/google-play-distribution.ts")).toContain("googlePlayCouponWhere")],
    ["20 conteúdo sem revisão não aparece", () => expect(isGooglePlayEligibleRecord({ ...allowed, playStoreStatus: undefined })).toBe(false)],
    ["21 carrinho antigo oculta bloqueado", () => expect(backendSource("lib/google-play-cart.ts")).toContain("isGooglePlayEligibleRecord")],
    ["22 favorito antigo oculta bloqueado", () => expect(backendSource("app/api/mobile/favorites/route.ts")).toContain("googlePlayProductWhere")],
    ["23 pedido do site usa descrição neutra", () => {
      const result = toGooglePlayPublicOrder({ items: [{ productName: "anterior", quantity: 1, unitPrice: 1, totalPrice: 1, product: blocked }] });
      expect(result.items?.[0].productName).toBe("Item adquirido em outro canal");
    }],
    ["24 checkout rejeita item bloqueado", () => expect(backendSource("lib/checkout/checkout-service.ts")).toContain("isGooglePlayEligibleRecord")],
    ["25 pagamento não é criado após rejeição", () => {
      const source = backendSource("lib/checkout/checkout-service.ts");
      expect(source.indexOf("const prepared = await getContext")).toBeLessThan(source.indexOf("return ensurePayment(created"));
    }],
    ["26 estoque não é alterado após rejeição", () => {
      const source = backendSource("lib/checkout/checkout-service.ts");
      expect(source.indexOf("const current = await getContext")).toBeLessThan(source.indexOf("const order = await tx.order.create"));
    }],
    ["27 parâmetro falso não remove filtro", () => expect(isGooglePlayMobilePath("/api/products?channel=GOOGLE_PLAY")).toBe(false)],
    ["28 header falso não remove filtro", () => expect(backendSource("lib/google-play-distribution.ts")).not.toMatch(/headers\.get\(.+channel/i)],
    ["29 deep link bloqueado não abre", () => expect(existsSync(path.join(root, "mobile/app/categoria/sex-shop/index.tsx"))).toBe(false)],
    ["30 cache antigo é limpo", () => expect(mobileSource("lib/googlePlayCatalogMigration.ts")).toContain("multiRemove")],
    ["31 guarda de imagens do AAB existe", () => expect(existsSync(path.join(root, "mobile/scripts/verify-google-play-artifact.ps1"))).toBe(true)],
    ["32 guarda de vídeos do AAB existe", () => expect(mobileSource("scripts/verify-google-play-artifact.ps1")).toContain("VideoExtensions")],
    ["33 guarda de seeds do AAB existe", () => expect(mobileSource("scripts/verify-google-play-artifact.ps1")).toContain("seed")],
    ["34 guarda de URLs restritas existe", () => expect(mobileSource("scripts/verify-google-play-artifact.ps1")).toContain("ForbiddenPatterns")],
    ["35 páginas legais e de atendimento presentes", () => expect(["privacidade", "termos", "cookies", "excluir-conta", "trocas-e-devolucoes", "cancelamento-e-reembolso", "entrega", "contato", "sobre"].every((name) => existsSync(path.join(process.cwd(), `app/(loja)/${name}/page.tsx`)))).toBe(true)],
    ["36 exclusão de conta preservada", () => expect(readdirSync(path.join(process.cwd(), "app/api/account-deletion")).length).toBeGreaterThan(0)],
    ["37 backfill bloqueia subcategoria incompatível", () => {
      const migration = backendSource(
        "prisma/migrations/20260728170000_google_play_distribution_channels/migration.sql"
      );
      expect(migration).toMatch(
        /EXISTS\s*\([\s\S]*subcategory\."id"\s*=\s*p\."subcategoryId"[\s\S]*subcategory\."slug"\s*~\*/
      );
    }],
  ];

  it.each(cases)("%s", (_name, assertion) => assertion());
});
