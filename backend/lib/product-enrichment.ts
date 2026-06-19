import { Prisma, Product, ProductEnrichmentStatus, ProductImportSource, ProductPublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ProductForResearch = Pick<
  Product,
  "id" | "name" | "brand" | "sku" | "ean" | "importSource"
>;

type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
};

type SourceEvidence = SearchResult & {
  host: string;
  sourceType: "manufacturer" | "authorized_distributor";
  text: string;
};

type EnrichedProductContent = {
  description?: string;
  benefits?: string;
  howToUse?: string;
  composition?: string;
  careInstructions?: string;
  packageContents?: string;
};

type EnrichmentResult =
  | {
      status: "enriched";
      content: EnrichedProductContent;
      sources: SourceEvidence[];
      notes: string[];
    }
  | {
      status: "needs_review";
      sources: SourceEvidence[];
      notes: string[];
    };

const SEARCH_TIMEOUT_MS = 9000;
const PAGE_TIMEOUT_MS = 9000;
const MIN_FIELD_LENGTH = 18;
const MAX_FIELD_LENGTH = 2800;

const FIELD_PATTERNS = {
  benefits: [
    /benef[ií]cios?\s*:?\s*([\s\S]{20,900}?)(?=\n\s*(modo de uso|composi[cç][aã]o|cuidados?|recomenda[cç][oõ]es|conte[uú]do|embalagem|descri[cç][aã]o)\b|$)/i,
    /caracter[ií]sticas?\s*:?\s*([\s\S]{20,900}?)(?=\n\s*(modo de uso|composi[cç][aã]o|cuidados?|recomenda[cç][oõ]es|conte[uú]do|embalagem|descri[cç][aã]o)\b|$)/i,
  ],
  howToUse: [
    /modo de uso\s*:?\s*([\s\S]{20,900}?)(?=\n\s*(benef[ií]cios?|composi[cç][aã]o|cuidados?|recomenda[cç][oõ]es|conte[uú]do|embalagem|descri[cç][aã]o)\b|$)/i,
    /como usar\s*:?\s*([\s\S]{20,900}?)(?=\n\s*(benef[ií]cios?|composi[cç][aã]o|cuidados?|recomenda[cç][oõ]es|conte[uú]do|embalagem|descri[cç][aã]o)\b|$)/i,
  ],
  composition: [
    /composi[cç][aã]o\s*:?\s*([\s\S]{10,900}?)(?=\n\s*(benef[ií]cios?|modo de uso|como usar|cuidados?|recomenda[cç][oõ]es|conte[uú]do|embalagem|descri[cç][aã]o)\b|$)/i,
    /ingredientes?\s*:?\s*([\s\S]{10,900}?)(?=\n\s*(benef[ií]cios?|modo de uso|como usar|cuidados?|recomenda[cç][oõ]es|conte[uú]do|embalagem|descri[cç][aã]o)\b|$)/i,
  ],
  careInstructions: [
    /cuidados?(?: e recomenda[cç][oõ]es)?\s*:?\s*([\s\S]{20,900}?)(?=\n\s*(benef[ií]cios?|modo de uso|como usar|composi[cç][aã]o|conte[uú]do|embalagem|descri[cç][aã]o)\b|$)/i,
    /recomenda[cç][oõ]es\s*:?\s*([\s\S]{20,900}?)(?=\n\s*(benef[ií]cios?|modo de uso|como usar|composi[cç][aã]o|conte[uú]do|embalagem|descri[cç][aã]o)\b|$)/i,
  ],
  packageContents: [
    /conte[uú]do da embalagem\s*:?\s*([\s\S]{6,600}?)(?=\n\s*(benef[ií]cios?|modo de uso|como usar|composi[cç][aã]o|cuidados?|recomenda[cç][oõ]es|descri[cç][aã]o)\b|$)/i,
    /cont[eé]m\s*:?\s*([\s\S]{6,600}?)(?=\n\s*(benef[ií]cios?|modo de uso|como usar|composi[cç][aã]o|cuidados?|recomenda[cç][oõ]es|descri[cç][aã]o)\b|$)/i,
  ],
} as const;

export async function enrichRecentBlingProducts(options: { limit?: number } = {}) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const products = await prisma.product.findMany({
    where: {
      importSource: ProductImportSource.BLING,
      enrichmentStatus: {
        in: [
          ProductEnrichmentStatus.PENDING_RESEARCH,
          ProductEnrichmentStatus.NEEDS_MANUAL_REVIEW,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const results = [];
  for (const product of products) {
    results.push(await enrichProductFromTrustedSources(product));
  }

  return {
    processed: results.length,
    enriched: results.filter((item) => item.status === ProductEnrichmentStatus.ENRICHED).length,
    needsReview: results.filter((item) => item.status === ProductEnrichmentStatus.NEEDS_MANUAL_REVIEW).length,
    results,
  };
}

export async function enrichBlingProductsByIds(productIds: string[]) {
  const ids = Array.from(new Set(productIds.filter(Boolean))).slice(0, 20);
  const products = await prisma.product.findMany({
    where: {
      id: { in: ids },
      importSource: ProductImportSource.BLING,
    },
    orderBy: { createdAt: "desc" },
  });

  const results = [];
  for (const product of products) {
    results.push(await enrichProductFromTrustedSources(product));
  }

  return {
    processed: results.length,
    enriched: results.filter((item) => item.status === ProductEnrichmentStatus.ENRICHED).length,
    needsReview: results.filter((item) => item.status === ProductEnrichmentStatus.NEEDS_MANUAL_REVIEW).length,
    results,
  };
}

export async function enrichProductFromTrustedSources(product: ProductForResearch) {
  const result = await researchProduct(product);
  const now = new Date();

  if (result.status === "enriched") {
    const data: Prisma.ProductUpdateInput = {
      ...result.content,
      enrichmentStatus: ProductEnrichmentStatus.ENRICHED,
      publicationStatus: ProductPublicationStatus.PENDING_REVIEW,
      researchSources: serializeSources(result.sources),
      researchNotes: result.notes.join("\n"),
      researchedAt: now,
    };

    await prisma.product.update({ where: { id: product.id }, data });

    return {
      productId: product.id,
      name: product.name,
      status: ProductEnrichmentStatus.ENRICHED,
      fields: Object.keys(result.content),
      sourceCount: result.sources.length,
      notes: result.notes,
    };
  }

  await prisma.product.update({
    where: { id: product.id },
    data: {
      enrichmentStatus: ProductEnrichmentStatus.NEEDS_MANUAL_REVIEW,
      publicationStatus: ProductPublicationStatus.MISSING_DESCRIPTION,
      researchSources: serializeSources(result.sources),
      researchNotes: result.notes.join("\n"),
      researchedAt: now,
    },
  });

  return {
    productId: product.id,
    name: product.name,
    status: ProductEnrichmentStatus.NEEDS_MANUAL_REVIEW,
    fields: [],
    sourceCount: result.sources.length,
    notes: result.notes,
  };
}

async function researchProduct(product: ProductForResearch): Promise<EnrichmentResult> {
  const notes: string[] = [];
  const searchConfig = getSearchConfig();
  const trustedDomains = getTrustedDomains(product.brand);

  if (!searchConfig) {
    return {
      status: "needs_review",
      sources: [],
      notes: [
        "Pesquisa automática não configurada. Configure GOOGLE_SEARCH_API_KEY e GOOGLE_SEARCH_CX para habilitar busca confiável.",
      ],
    };
  }

  if (trustedDomains.length === 0 && !product.brand) {
    return {
      status: "needs_review",
      sources: [],
      notes: ["Produto sem marca/fabricante. Não é seguro pesquisar só por nome; revisão manual necessária."],
    };
  }

  const queries = buildSearchQueries(product, trustedDomains);
  const searchResults = await runSearches(queries, searchConfig);
  const rankedResults = rankTrustedResults(searchResults, trustedDomains);
  const evidence: SourceEvidence[] = [];

  for (const result of rankedResults.slice(0, 8)) {
    const text = await fetchEvidenceText(result.url);
    if (!text) continue;

    evidence.push({
      ...result,
      host: getHost(result.url),
      sourceType: isOfficialManufacturer(result.url, trustedDomains)
        ? "manufacturer"
        : "authorized_distributor",
      text,
    });

    if (evidence.length >= 4) break;
  }

  if (evidence.length === 0) {
    return {
      status: "needs_review",
      sources: [],
      notes: ["Nenhuma página confiável com conteúdo aproveitável foi encontrada."],
    };
  }

  const content = extractContentFromEvidence(product, evidence, notes);
  const filledFields = Object.entries(content).filter(([, value]) => isUseful(value));

  if (filledFields.length < 2 || !content.description) {
    return {
      status: "needs_review",
      sources: evidence,
      notes: [
        ...notes,
        "Dados insuficientes para enriquecer automaticamente sem risco de inventar informação.",
      ],
    };
  }

  return {
    status: "enriched",
    content,
    sources: evidence,
    notes,
  };
}

function getSearchConfig() {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  if (!apiKey || !cx) return null;
  return { apiKey, cx };
}

function getTrustedDomains(brand?: string | null) {
  const configured = (process.env.PRODUCT_RESEARCH_TRUSTED_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  const brandDomains = brand
    ? (process.env[`PRODUCT_RESEARCH_${normalizeEnvKey(brand)}_DOMAINS`] ?? "")
        .split(",")
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean)
    : [];

  return Array.from(new Set([...brandDomains, ...configured]));
}

function buildSearchQueries(product: ProductForResearch, trustedDomains: string[]) {
  const identifiers = [product.ean, product.sku, product.name]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .map((value) => value.trim());
  const brand = product.brand?.trim();
  const base = [brand, ...identifiers].filter(Boolean).join(" ");
  const siteFilters = trustedDomains.slice(0, 8).map((domain) => `site:${domain}`);

  const queries = [
    `${base} descrição composição modo de uso`,
    `${base} conteúdo da embalagem cuidados`,
    ...siteFilters.map((site) => `${site} ${base}`),
  ];

  return Array.from(new Set(queries)).slice(0, 10);
}

async function runSearches(
  queries: string[],
  config: { apiKey: string; cx: string }
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  for (const query of queries) {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", config.apiKey);
    url.searchParams.set("cx", config.cx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "5");
    url.searchParams.set("safe", "active");

    try {
      const response = await fetchWithTimeout(url, SEARCH_TIMEOUT_MS);
      if (!response.ok) continue;
      const json = (await response.json()) as {
        items?: Array<{ title?: string; link?: string; snippet?: string }>;
      };
      for (const item of json.items ?? []) {
        if (!item.link || !item.title) continue;
        results.push({ title: item.title, url: item.link, snippet: item.snippet });
      }
    } catch {
      continue;
    }
  }

  const seen = new Set<string>();
  return results.filter((result) => {
    const key = normalizeUrl(result.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankTrustedResults(results: SearchResult[], trustedDomains: string[]) {
  return results
    .filter((result) => isTrustedSource(result.url, trustedDomains))
    .sort((a, b) => {
      const officialScore =
        Number(isOfficialManufacturer(b.url, trustedDomains)) -
        Number(isOfficialManufacturer(a.url, trustedDomains));
      if (officialScore !== 0) return officialScore;
      return getHost(a.url).localeCompare(getHost(b.url));
    });
}

async function fetchEvidenceText(url: string) {
  try {
    const response = await fetchWithTimeout(url, PAGE_TIMEOUT_MS);
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) return null;

    const html = await response.text();
    const text = htmlToText(html);
    return text.length > 250 ? text.slice(0, 14000) : null;
  } catch {
    return null;
  }
}

function extractContentFromEvidence(
  product: ProductForResearch,
  evidence: SourceEvidence[],
  notes: string[]
): EnrichedProductContent {
  const combined = evidence
    .map((source) => `${source.title}\n${source.snippet ?? ""}\n${source.text}`)
    .join("\n\n");

  if (!matchesProductIdentity(product, combined)) {
    notes.push("As fontes encontradas não confirmaram nome, SKU ou EAN do produto com segurança.");
    return {};
  }

  const content: EnrichedProductContent = {};
  const description = extractDescription(product, evidence);
  if (description) content.description = description;

  for (const field of Object.keys(FIELD_PATTERNS) as Array<keyof typeof FIELD_PATTERNS>) {
    const value = extractByPatterns(combined, FIELD_PATTERNS[field]);
    if (value) content[field] = value;
  }

  if (Object.keys(content).length === 0) {
    notes.push("Fontes confiáveis foram encontradas, mas os campos esperados não estavam estruturados.");
  }

  return content;
}

function extractDescription(product: ProductForResearch, evidence: SourceEvidence[]) {
  for (const source of evidence) {
    const candidates = source.text
      .split(/\n{2,}/)
      .map(cleanField)
      .filter((paragraph): paragraph is string => Boolean(paragraph))
      .filter((paragraph) => {
        const lower = paragraph.toLowerCase();
        return (
          paragraph.length >= 80 &&
          paragraph.length <= MAX_FIELD_LENGTH &&
          lower.includes(product.name.toLowerCase().slice(0, 14))
        );
      });

    if (candidates[0]) return candidates[0];
  }

  const snippet = evidence.find((source) => isUseful(source.snippet))?.snippet;
  return cleanField(snippet);
}

function extractByPatterns(text: string, patterns: readonly RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = cleanField(match?.[1]);
    if (isUseful(value)) return value;
  }
  return undefined;
}

function matchesProductIdentity(product: ProductForResearch, text: string) {
  const normalizedText = normalizeSearchText(text);
  const checks = [
    product.ean ? normalizedText.includes(normalizeSearchText(product.ean)) : false,
    product.sku ? normalizedText.includes(normalizeSearchText(product.sku)) : false,
    product.brand ? normalizedText.includes(normalizeSearchText(product.brand)) : false,
    normalizedText.includes(normalizeSearchText(product.name).slice(0, 18)),
  ];

  return checks.filter(Boolean).length >= (product.ean || product.sku ? 1 : 2);
}

function isTrustedSource(url: string, trustedDomains: string[]) {
  const host = getHost(url);
  if (!host) return false;
  return trustedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function isOfficialManufacturer(url: string, trustedDomains: string[]) {
  const officialDomains = (process.env.PRODUCT_RESEARCH_MANUFACTURER_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  const host = getHost(url);
  return [...officialDomains, ...trustedDomains.slice(0, 3)].some(
    (domain) => host === domain || host.endsWith(`.${domain}`)
  );
}

async function fetchWithTimeout(url: URL | string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "KA Bijoux product research bot; contact=admin",
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(p|li|h1|h2|h3|h4|div|section|article|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanField(value?: string | null) {
  if (!value) return undefined;
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
  if (!isUseful(cleaned)) return undefined;
  return cleaned.slice(0, MAX_FIELD_LENGTH);
}

function isUseful(value?: string | null) {
  return Boolean(value && value.trim().length >= MIN_FIELD_LENGTH);
}

function getHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function normalizeEnvKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function serializeSources(sources: SourceEvidence[]) {
  return sources.map(({ title, url, snippet, host, sourceType }) => ({
    title,
    url,
    snippet,
    host,
    sourceType,
  }));
}
