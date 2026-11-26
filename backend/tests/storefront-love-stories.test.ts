import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { publicStoryGroupWhere } from "@/lib/stories";
import { isValidStoreVisitorId } from "@/lib/store-likes";
import { STORY_CATEGORY_LABELS } from "@/types/stories";

const root = path.resolve(process.cwd(), "..");
const source = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("Stories e curtida da loja", () => {
  it("aceita somente um identificador persistente em formato UUID", () => {
    expect(isValidStoreVisitorId("4e93cc1c-76a0-4ae7-9bc1-9b40522c716b")).toBe(true);
    expect(isValidStoreVisitorId("cliente@example.com")).toBe(false);
    expect(isValidStoreVisitorId("not-a-uuid")).toBe(false);
  });

  it("expira Stories e exige confirmação para conteúdo de clientes", () => {
    expect(JSON.stringify(publicStoryGroupWhere(new Date("2026-11-26T15:00:00.000Z")))).toContain("CUSTOMER");
    expect(JSON.stringify(publicStoryGroupWhere(new Date("2026-11-26T15:00:00.000Z")))).toContain("2026-11-26T15:00:00.000Z");
    expect(source("backend/prisma/migrations/20261126200000_store_likes_story_categories/migration.sql")).toContain("customerConsentConfirmedAt");
  });

  it("apresenta somente as quatro seções solicitadas", () => {
    expect(Object.values(STORY_CATEGORY_LABELS)).toEqual(["KA Stories", "Clientes", "Avaliações", "Destaques"]);
    const mobile = source("mobile/app/(tabs)/index.tsx");
    const web = source("backend/components/loja/KABijouxStories.tsx");
    expect(mobile).toContain("STORY_CATEGORIES = [");
    expect(web).toContain("storyCategories: StoryCategory[] = [\"OFFICIAL\", \"CUSTOMER\", \"REVIEW\", \"HIGHLIGHT\"]");
    expect(mobile).not.toContain("Visitar o Instagram da KA Bijoux");
    expect(web).not.toContain("instagramProfileUrl");
  });

  it("só oferece avaliações aprovadas e com compra confirmada para a seção Avaliações", () => {
    const createRoute = source("backend/app/api/admin/stories/route.ts");
    const updateRoute = source("backend/app/api/admin/stories/[id]/route.ts");
    const moderationRoute = source("backend/app/api/admin/reviews/[id]/route.ts");
    const adminPage = source("backend/app/admin/stories/page.tsx");
    expect(createRoute).toContain('where: { id: data.reviewId, approved: true }');
    expect(updateRoute).toContain('where: { id: nextReviewId, approved: true }');
    expect(createRoute).toContain("status: { in: [\"ENTREGUE\", \"PRONTO_PARA_RETIRADA\"] }");
    expect(updateRoute).toContain("status: { in: [\"ENTREGUE\", \"PRONTO_PARA_RETIRADA\"] }");
    expect(moderationRoute).toContain("if (approved)");
    expect(moderationRoute).toContain("A avaliação não possui uma compra confirmada.");
    expect(adminPage).toContain("review.approved && review.verifiedPurchase");
    expect(updateRoute).toContain("const consentRevoked = input.customerConsentConfirmed === false");
    expect(updateRoute).toContain("isActive: nextIsActive");
  });

  it("permite que o grupo administrativo Clientes seja preenchido sem expor a capa padrão", () => {
    const stories = source("backend/lib/stories.ts");
    const migration = source("backend/prisma/migrations/20261126200000_store_likes_story_categories/migration.sql");
    expect(stories).not.toContain('"story-clientes"');
    expect(migration).toContain("SET \"category\" = 'CUSTOMER'");
    expect(migration).toContain("WHERE \"id\" = 'story-clientes'");
    expect(migration).toContain("customerConsentConfirmedAt");
  });

  it("mantém a curtida da loja separada dos favoritos de produto e sem contador inventado", () => {
    const route = source("backend/app/api/store-likes/route.ts");
    const migration = source("backend/prisma/migrations/20261126200000_store_likes_story_categories/migration.sql");
    expect(route).toContain("setStoreLike");
    expect(route).toContain("RATE_LIMITS.storeLike");
    expect(route).toContain("RATE_LIMITS.storeLikeIp");
    expect(migration).toContain("CREATE TABLE \"store_likes\"");
    expect(migration).toContain("CREATE UNIQUE INDEX \"store_likes_customerId_key\"");
    expect(source("backend/components/loja/StoreLoveButton.tsx")).toContain("count === null ? \"—\"");
  });
});
