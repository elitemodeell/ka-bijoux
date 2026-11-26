import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOME_ANNOUNCEMENTS,
  getHomePresentation,
  HOME_QUICK_CATEGORIES,
  HOME_SECTION_DEFINITIONS,
} from "@/lib/home-content";
import { googlePlayCategoryWhere, googlePlayProductWhere } from "@/lib/google-play-distribution";

const repoRoot = path.resolve(process.cwd(), "..");
const source = (relativePath: string) =>
  readFileSync(path.join(repoRoot, relativePath), "utf8");

const homeRoute = source("backend/app/api/mobile/home/route.ts");
const mobileHome = source("mobile/app/(tabs)/index.tsx");
const mobileApi = source("mobile/services/api.ts");
const productCard = source("mobile/components/product/ProductCard.tsx");
const resilientProductImage = source(
  "mobile/components/product/ResilientProductImage.tsx"
);
const siteStories = source("backend/components/loja/KABijouxStories.tsx");

describe("correção completa da Home mobile", () => {
  it("usa o endpoint mobile dedicado", () => {
    expect(mobileApi).toContain("`${MOBILE_API_PREFIX}/home`");
  });

  it("não mantém banners paralelos no aplicativo", () => {
    expect(mobileHome).not.toMatch(/const\s+BANNERS\s*=/);
    expect(mobileHome).not.toContain("banner-ferias-com-estilo-mobile.webp");
  });

  it("não mantém stories de fallback no aplicativo", () => {
    expect(mobileHome).not.toMatch(/STORY_FALLBACK|HIGHLIGHT_COVERS/);
  });

  it("não mantém stories de conteúdo hardcoded no site", () => {
    expect(siteStories).not.toMatch(/fallbackGroups|demo-novidades|demo-promocoes/);
    expect(siteStories).toContain("setGroups(normalizeGroups(json.data))");
  });

  it("não mantém avaliações fictícias no aplicativo", () => {
    expect(mobileHome).not.toMatch(/Mariana Costa|Julia Fernandes|Ana Beatriz Lima/);
    expect(homeRoute).toContain("prisma.review.findMany");
  });

  it("centraliza os banners usados pelo site e pela API", () => {
    expect(source("backend/components/loja/KABijouxStories.tsx")).toContain("presentation.banners");
    expect(homeRoute).toContain("presentation.banners");
    expect(getHomePresentation(new Date("2026-11-25T12:00:00-03:00")).theme).toBe("christmas");
    expect(getHomePresentation(new Date("2026-12-27T12:00:00-03:00")).theme).toBe("default");
  });

  it("centraliza as mensagens usadas pelo site e pela API", () => {
    expect(source("backend/components/loja/AnnouncementBar.tsx")).toContain("HOME_ANNOUNCEMENTS");
    expect(homeRoute).toContain("presentation.announcements");
    expect(HOME_ANNOUNCEMENTS.length).toBeGreaterThan(0);
  });

  it("todos os banners canônicos são próprios para a Play Store", () => {
    expect(JSON.stringify(getHomePresentation(new Date("2026-11-25T12:00:00-03:00")).banners)).not.toMatch(/sex[-_ ]?shop|lingerie|adulto|er[oó]tico/i);
  });

  it("remove a categoria adulta dos atalhos móveis", () => {
    const allowed = HOME_QUICK_CATEGORIES.filter((item) => item.playAllowed);
    expect(allowed.some((item) => /sex|lingerie|adult/i.test(item.href))).toBe(false);
    expect(homeRoute).toContain("filter((category) => category.playAllowed)");
  });

  it("filtra categorias por PLAY_ALLOWED no servidor", () => {
    const where = JSON.stringify(googlePlayCategoryWhere());
    expect(where).toContain("PLAY_ALLOWED");
    expect(where).toContain("GOOGLE_PLAY");
    expect(where).toContain("lingerie");
    expect(where).toContain("sex-shop");
  });

  it("filtra produtos por PLAY_ALLOWED no servidor", () => {
    const where = JSON.stringify(googlePlayProductWhere());
    expect(where).toContain("PLAY_ALLOWED");
    expect(where).toContain("GOOGLE_PLAY");
  });

  it("filtra stories e itens no servidor", () => {
    expect(homeRoute).toContain("googlePlayStoryGroupWhere");
    expect(homeRoute).toContain("googlePlayStoryItemWhere");
    expect(homeRoute).toContain("HIDDEN_HOME_SHORTCUT_STORY_IDS");
    expect(source("backend/app/api/stories/route.ts")).toContain("HIDDEN_HOME_SHORTCUT_STORY_IDS");
  });

  it("não substitui capas publicadas por artes genéricas baseadas no título", () => {
    expect(mobileHome).not.toContain("storyArtwork");
    expect(mobileHome).toContain("thumbnail(resolveUrl(story.cover || story.coverImageUrl), 256)");
  });

  it("calcula colunas de produtos sem depender de larguras percentuais aproximadas", () => {
    const searchScreen = source("mobile/app/(tabs)/busca.tsx");
    const productList = source("mobile/app/produtos/index.tsx");
    const favorites = source("mobile/app/favoritos/index.tsx");
    for (const screen of [searchScreen, productList, favorites]) {
      expect(screen).toContain("useWindowDimensions");
      expect(screen).toContain("(viewportWidth - Spacing.base * 2 - 16) / 3");
      expect(screen).toContain("numColumns={3}");
      expect(screen).not.toContain('width: "31%"');
    }
  });

  it("retorna vitrines na ordem da loja", () => {
    const expected = [
      "ofertas-relampago",
      "achadinhos",
      "novidades",
      "mais-vendidos",
      "para-presentear",
      "beleza-autocuidado",
    ];
    expect(HOME_SECTION_DEFINITIONS.map((section) => section.id)).toEqual(expected);
    expect(homeRoute).toContain("HOME_SECTION_DEFINITIONS.map");
  });

  it("site e endpoint usam a mesma definição de títulos e selos", () => {
    const siteHome = source("backend/app/(loja)/page.tsx");
    expect(siteHome).toContain("HOME_SECTION_DEFINITIONS");
    expect(siteHome).toContain("pickHomeBadge");
    expect(homeRoute).toContain("pickHomeBadge");
  });

  it("mantém a ordem estrutural exata antes das vitrines", () => {
    const homeScreen = mobileHome.slice(mobileHome.indexOf("export default function HomeScreen"));
    const blockPlan = homeScreen.slice(homeScreen.indexOf("const homeBlocks"));
    const markers = [
      '{ key: "special"',
      '{ key: "hero"',
      '{ key: "benefits"',
      '{ key: "stories"',
      '{ key: "seasonal-divider"',
      '{ key: "quick"',
      'type: "products"',
    ];
    let previous = -1;
    for (const marker of markers) {
      const current = blockPlan.indexOf(marker);
      expect(current).toBeGreaterThan(previous);
      previous = current;
    }
  });

  it("mantém seis atalhos reais na Home, em ordem e sem duplicar a seção de Stories", () => {
    expect(HOME_QUICK_CATEGORIES).toHaveLength(6);
    expect(new Set(HOME_QUICK_CATEGORIES.map((category) => category.href)).size).toBe(6);
    expect(mobileHome).toContain("const HIDDEN_HOME_STORY_SHORTCUTS");
    expect(mobileHome).toContain("HIDDEN_HOME_STORY_SHORTCUTS.has(story.id)");
  });

  it("valida a curadoria no servidor e invalida o cache imediatamente após salvar", () => {
    const curadoria = source("backend/app/api/admin/home-curation/route.ts");
    expect(curadoria).toContain("await requireAdmin(req)");
    expect(curadoria).toContain(".max(30)");
    expect(curadoria).toContain('slug: { not: "sex-shop" }');
    expect(curadoria).toContain('revalidateTag("ka-home-sections", { expire: 0 })');
  });

  it("usa o mesmo seletor de vitrines no site e no mobile", () => {
    expect(source("backend/app/(loja)/page.tsx")).toContain("getHomeSections()");
    expect(homeRoute).toContain("getHomeSections({ googlePlay: true })");
  });

  it("carrega somente uma quantidade controlada por vitrine", () => {
    const helper = source("backend/lib/home-sections.ts");
    expect(helper).toContain("ofertasRelampago: promo.slice(0, 8)");
    expect(helper).toContain("novidades: newProducts.slice(0, 8)");
    expect(helper).toContain("maisVendidos: takeSection");
    expect(helper).toContain("limit: 70");
  });

  it("implementa cache controlado e atualização em segundo plano", () => {
    expect(mobileHome).toContain("AsyncStorage.getItem(CACHE_KEY)");
    expect(mobileHome).toContain("AsyncStorage.setItem(CACHE_KEY");
    expect(homeRoute).toContain("stale-while-revalidate=120");
  });

  it("cancela requisições ao desmontar e ao recarregar", () => {
    expect(mobileHome).toContain("new AbortController()");
    expect(mobileHome).toContain("activeController.current?.abort()");
  });

  it("possui retry automático e ação manual", () => {
    expect(mobileHome).toContain("setTimeout(resolve, 500)");
    expect(mobileHome).toContain("Tentar novamente");
  });

  it("possui skeleton e estado offline", () => {
    expect(mobileHome).toContain("function HomeSkeleton");
    expect(mobileHome).toContain("Sem conexão");
    expect(mobileHome).toContain("cloud-offline-outline");
  });

  it("mantém o cabeçalho fora da área rolável", () => {
    const homeScreen = mobileHome.slice(mobileHome.indexOf("export default function HomeScreen"));
    expect(homeScreen.indexOf("<Header itemCount")).toBeLessThan(homeScreen.indexOf("<FlatList"));
  });

  it("bloqueia links adultos antes da navegação", () => {
    expect(mobileHome).toContain("function isSafeStoreHref");
    expect(mobileHome).toContain("allowedCategorySlugs.has(category)");
    expect(mobileHome).toContain("allowedCategorySlugs.has(slug)");
    expect(mobileHome).toContain("if (!isSafeStoreHref(href, allowedCategorySlugs)) return");
  });

  it("cards exibem imagem, estoque, preço e ação Comprar", () => {
    expect(productCard).toContain("ResilientProductImage");
    expect(resilientProductImage).toContain('cachePolicy="memory-disk"');
    expect(productCard).toContain("Esgotado");
    expect(productCard).toContain("formatCurrency(displayPrice)");
    expect(productCard).toContain('product.purchaseReviewRequired ? "Em revisão" : compact ? "Comprar" : "Comprar agora"');
    expect(productCard).toContain("disabled={!isAvailable || cartAction !== null}");
    expect(productCard).toContain('contentFit="contain"');
    expect(productCard).toContain("product.badge");
  });
});
