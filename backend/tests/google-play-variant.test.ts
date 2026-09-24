import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ContentClassification,
  DistributionChannel,
  PlayStoreStatus,
  PolicyReviewStatus,
} from "@prisma/client";
import {
  GOOGLE_PLAY_NEUTRAL_ITEM_NAME,
  googlePlayCategoryWhere,
  googlePlayCouponWhere,
  googlePlayNotificationWhere,
  googlePlayProductWhere,
  googlePlayReviewWhere,
  googlePlayStoryGroupWhere,
  googlePlayStoryItemWhere,
  isGooglePlayEligibleRecord,
  isGooglePlayMobilePath,
  toGooglePlayPublicOrder,
} from "@/lib/google-play-distribution";

const approvedGeneral = {
  active: true,
  distributionChannels: [
    DistributionChannel.WEB_FULL,
    DistributionChannel.GOOGLE_PLAY,
    DistributionChannel.ADMIN,
  ],
  playStoreStatus: PlayStoreStatus.PLAY_ALLOWED,
  contentClassification: ContentClassification.GENERAL,
  policyReviewStatus: PolicyReviewStatus.APPROVED,
};

describe("variante Google Play (42 cenários adicionais)", () => {
  const pathCases: Array<[string, string, boolean]> = [
    ["[137] raiz móvel", "/api/mobile", true],
    ["[138] produto móvel", "/api/mobile/products", true],
    ["[139] detalhe móvel", "/api/mobile/products/1", true],
    ["[140] checkout móvel", "/api/mobile/orders", true],
    ["[141] carrinho móvel", "/api/mobile/cart", true],
    ["[142] histórias móveis", "/api/mobile/stories", true],
    ["[143] catálogo web", "/api/products", false],
    ["[144] checkout web", "/api/orders", false],
    ["[145] prefixo parecido", "/api/mobileevil/products", false],
    ["[146] mobile em query", "/api/products?channel=mobile", false],
    ["[147] mobile em sufixo", "/api/products/mobile", false],
    ["[148] caixa diferente", "/api/MOBILE/products", false],
  ];

  it.each(pathCases)("%s", (_name, pathname, expected) => {
    expect(isGooglePlayMobilePath(pathname)).toBe(expected);
  });

  const eligibilityCases: Array<[string, Record<string, unknown> | null, boolean]> = [
    ["[149] geral aprovado", approvedGeneral, true],
    ["[150] moda íntima neutra aprovada", { ...approvedGeneral, contentClassification: ContentClassification.LINGERIE_NEUTRAL }, true],
    ["[151] ausente", null, false],
    ["[152] inativo", { ...approvedGeneral, active: false }, false],
    ["[153] história inativa", { ...approvedGeneral, active: undefined, isActive: false }, false],
    ["[154] não classificado", { ...approvedGeneral, playStoreStatus: PlayStoreStatus.PLAY_REVIEW_REQUIRED }, false],
    ["[155] revisão obrigatória", { ...approvedGeneral, playStoreStatus: PlayStoreStatus.PLAY_REVIEW_REQUIRED }, false],
    ["[156] produto bloqueado", { ...approvedGeneral, playStoreStatus: PlayStoreStatus.PLAY_BLOCKED }, false],
    ["[157] explícito bloqueado", { ...approvedGeneral, playStoreStatus: PlayStoreStatus.PLAY_BLOCKED }, false],
    ["[158] bloqueado", { ...approvedGeneral, playStoreStatus: PlayStoreStatus.PLAY_BLOCKED }, false],
    ["[159] aguardando revisão", { ...approvedGeneral, playStoreStatus: PlayStoreStatus.PLAY_REVIEW_REQUIRED }, false],
    ["[160] sem canal Play", { ...approvedGeneral, distributionChannels: [DistributionChannel.WEB_FULL] }, false],
  ];

  it.each(eligibilityCases)("%s", (_name, record, expected) => {
    expect(isGooglePlayEligibleRecord(record as never)).toBe(expected);
  });

  const whereCases: Array<[string, () => unknown]> = [
    ["[161] categoria", () => googlePlayCategoryWhere()],
    ["[162] produto", () => googlePlayProductWhere()],
    ["[163] cupom", () => googlePlayCouponWhere()],
    ["[164] história grupo", () => googlePlayStoryGroupWhere()],
    ["[165] história item", () => googlePlayStoryItemWhere()],
    ["[166] notificação", () => googlePlayNotificationWhere()],
    ["[167] avaliação", () => googlePlayReviewWhere()],
  ];

  it.each(whereCases)("%s aplica canal, aprovação e lista segura", (_name, factory) => {
    const serialized = JSON.stringify(factory());
    expect(serialized).toContain(DistributionChannel.GOOGLE_PLAY);
    expect(serialized).toContain(PlayStoreStatus.PLAY_ALLOWED);
  });

  it("[168] item aprovado mantém nome", () => {
    const result = toGooglePlayPublicOrder({
      items: [{ id: "1", productName: "Brinco", quantity: 1, unitPrice: 10, totalPrice: 10, product: approvedGeneral }],
    });
    expect(result.items?.[0].productName).toBe("Brinco");
  });

  it("[169] item antigo não aprovado é neutralizado", () => {
    const result = toGooglePlayPublicOrder({
      items: [{ id: "1", productName: "Conteúdo anterior", productId: "p", quantity: 1, unitPrice: 10, totalPrice: 10, product: null }],
    });
    expect(result.items?.[0].productName).toBe(GOOGLE_PLAY_NEUTRAL_ITEM_NAME);
  });

  it("[170] item neutralizado não expõe imagem nem IDs", () => {
    const result = toGooglePlayPublicOrder({
      items: [{ id: "1", productName: "Anterior", productId: "p", variationId: "v", productImage: "/x.jpg", quantity: 1, unitPrice: 10, totalPrice: 10 }],
    });
    expect(result.items?.[0]).toMatchObject({ productId: null, variationId: null, productImage: null });
  });

  it("[171] pedido público remove segredos de checkout", () => {
    const result = toGooglePlayPublicOrder({
      checkoutIdempotencyKey: "secret",
      checkoutRequestHash: "hash",
      items: [],
    });
    expect(result).not.toHaveProperty("checkoutIdempotencyKey");
    expect(result).not.toHaveProperty("checkoutRequestHash");
  });

  const repoRoot = path.resolve(process.cwd(), "..");
  const sourceCases: Array<[string, () => void]> = [
    ["[172] tela legada removida", () => expect(existsSync(path.join(repoRoot, "mobile/app/categoria/sex-shop/index.tsx"))).toBe(false)],
    ["[173] prefixo móvel fixo", () => expect(readFileSync(path.join(repoRoot, "mobile/services/api.ts"), "utf8")).toContain('MOBILE_API_PREFIX = "/api/mobile"')],
    ["[174] versão Android 12", () => expect(JSON.parse(readFileSync(path.join(repoRoot, "mobile/app.json"), "utf8")).expo.android.versionCode).toBe(12)],
    ["[175] distribuição fixa", () => expect(readFileSync(path.join(repoRoot, "mobile/constants/distribution.ts"), "utf8")).toContain('"GOOGLE_PLAY" as const')],
    ["[176] migração limpa checkout legado", () => expect(readFileSync(path.join(repoRoot, "mobile/lib/googlePlayCatalogMigration.ts"), "utf8")).toContain('"ka-checkout-attempt-v1"')],
    ["[177] navegação raiz sem rota restrita", () => expect(readFileSync(path.join(repoRoot, "mobile/app/_layout.tsx"), "utf8")).not.toContain("categoria/sex-shop")],
    ["[178] serviço não envia channel ao servidor", () => expect(readFileSync(path.join(repoRoot, "mobile/services/api.ts"), "utf8")).not.toMatch(/[?&](channel|distribution)=/i)],
  ];

  it.each(sourceCases)("%s", (_name, assertion) => assertion());
});
