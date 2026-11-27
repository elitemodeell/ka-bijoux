import type { Prisma } from "@prisma/client";

const stopWords = new Set(["a", "o", "de", "do", "da", "dos", "das", "para", "com", "e", "sem"]);
const commonTypos: Record<string, string> = {
  carregdor: "carregador",
  carregadore: "carregador",
  carergador: "carregador",
};
const synonyms: Record<string, string[]> = {
  pulseira: ["pulseira", "pulseiras", "bracelete", "braceletes"],
  capinha: ["capinha", "capinhas", "capa", "capas"],
  perfume: ["perfume", "perfumes", "fragrancia", "fragrancias", "colonia", "colonias"],
  fone: ["fone", "fones", "headphone", "headphones", "headset", "headsets", "earbud", "earbuds", "auricular", "auriculares"],
  carregador: ["carregador", "carregadores", "fonte", "fontes"],
  ac: ["ac", "ar condicionado", "ar-condicionado"],
};
const typoVocabulary = ["pulseira", "capinha", "perfume", "carregador", "controle", "fone", "brinco", "bolsa", "maquiagem", "pelicula", "cabo", "fonte", "tomada", "suporte"];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function matchIdentity(term: string): Prisma.ProductWhereInput[] {
  const match = { contains: term, mode: "insensitive" as const };
  return [{ name: match },
    { slug: { ...match, contains: normalize(term).replaceAll(" ", "-") } },
    { brand: match },
  ];
}

function matchTerm(term: string): Prisma.ProductWhereInput[] {
  const spellings = searchSpellings(term);
  return spellings.flatMap((spelling) => {
    const match = { contains: spelling, mode: "insensitive" as const };
    return [
      ...matchIdentity(spelling), { description: match }, { sku: match }, { ean: match },
      { variations: { some: { active: true, OR: [{ name: match }, { value: match }, { sku: match }] } } },
      { searchTags: { hasSome: [...new Set([spelling.toLowerCase(), normalize(spelling)])] } },
      { category: { name: match } }, { category: { slug: match } },
      { subcategory: { name: match } }, { subcategory: { slug: match } },
    ];
  });
}

const portugueseAccents: Record<string, string[]> = {
  a: ["á", "à", "â", "ã"], e: ["é", "ê"], i: ["í"],
  o: ["ó", "ô", "õ"], u: ["ú"], c: ["ç"],
};
const commonAccentedEndings: Array<[string, string]> = [
  ["coes", "ções"], ["cao", "ção"], ["oes", "ões"], ["ao", "ão"],
  ["ancia", "ância"], ["encia", "ência"], ["uncia", "úncia"],
  ["ario", "ário"], ["aria", "ária"], ["orio", "ório"], ["oria", "ória"],
  ["avel", "ável"], ["ivel", "ível"], ["eis", "éis"], ["mae", "mãe"],
];

function searchSpellings(value: string) {
  const normalized = normalize(value);
  const chars = Array.from(normalized);
  const variants = new Set([value, normalized]);
  const positions = chars.flatMap((char, index) => portugueseAccents[char]
    ? [{ index, replacements: portugueseAccents[char] }]
    : []);

  // Include likely Portuguese diacritics so ASCII queries can match accented
  // catalog fields while keeping the database OR list bounded.
  for (const position of positions) {
    for (const replacement of position.replacements) {
      const copy = [...chars];
      copy[position.index] = replacement;
      variants.add(copy.join(""));
    }
  }
  for (const [plain, accented] of commonAccentedEndings) {
    if (normalized.endsWith(plain)) variants.add(normalized.slice(0, -plain.length) + accented);
  }
  return [...variants].slice(0, 24);
}

function singularAndPlural(term: string) {
  const forms = new Set([term]);
  if (term.length > 4 && term.endsWith("s")) forms.add(term.slice(0, -1));
  if (term.length > 5 && term.endsWith("es")) forms.add(term.slice(0, -2));
  else if (term.length > 4) forms.add(`${term}s`);
  return [...forms];
}

export function normalizeCatalogSearchQuery(query: string) {
  return normalize(query.trim().slice(0, 120))
    .split(" ")
    .map((word) => commonTypos[word] ?? correctNearMatch(word))
    .join(" ");
}

function correctNearMatch(word: string) {
  if (word.length < 5) return word;
  return typoVocabulary.find((candidate) => differsByOneCharacter(word, candidate)) ?? word;
}

function differsByOneCharacter(left: string, right: string) {
  if (left === right || Math.abs(left.length - right.length) > 1) return false;
  let i = 0;
  let j = 0;
  let differences = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) { i += 1; j += 1; continue; }
    differences += 1;
    if (differences > 1) return false;
    if (left.length >= right.length) i += 1;
    if (right.length >= left.length) j += 1;
  }
  if (i < left.length || j < right.length) differences += 1;
  return differences === 1;
}

function searchTermForms(term: string) {
  const canonical = commonTypos[term] ?? term;
  const related = synonyms[canonical];
  return related ? [...new Set(related)] : singularAndPlural(canonical);
}

function matchProductWord(term: string): Prisma.ProductWhereInput[] {
  const mode = "insensitive" as const;
  return [
    { name: { equals: term, mode } },
    { name: { startsWith: `${term} `, mode } },
    { name: { contains: ` ${term} `, mode } },
    { name: { endsWith: ` ${term}`, mode } },
    { slug: { equals: term, mode } },
    { slug: { startsWith: `${term}-`, mode } },
    { slug: { contains: `-${term}-`, mode } },
    { slug: { endsWith: `-${term}`, mode } },
  ];
}

export function catalogSearchAlternatives(query: string): Prisma.ProductWhereInput[] {
  const original = query.trim().slice(0, 120);
  const normalized = normalizeCatalogSearchQuery(original);
  if (!normalized) return [];

  const wirelessHeadphones = /\bfones?\b/.test(normalized) && /\b(sem fio|bluetooth|wireless|tws)\b/.test(normalized);
  const airConditionerRemote = /\bcontroles?\b/.test(normalized) && /\b(ac|ar condic)/.test(normalized);
  const groups = wirelessHeadphones
    ? [["fone", "fones", "headphone", "headphones", "headset", "headsets", "earbud", "earbuds"], ["sem fio", "bluetooth", "wireless", "tws"]]
    : airConditionerRemote
      ? [["controle", "controles"], ["ar condicionado", "ar-condicionado", "ar condic", "ac"]]
      : normalized.split(" ").filter((word) => !stopWords.has(word)).slice(0, 8).map(searchTermForms);

  if (wirelessHeadphones || airConditionerRemote) {
    return [{ AND: [
      { OR: groups[0].flatMap(matchProductWord) },
      { OR: groups[1].flatMap(matchTerm) },
    ] }];
  }

  return [
    ...matchTerm(original),
    ...(groups.length ? [{ AND: groups.map((group) => ({ OR: group.flatMap(matchTerm) })) }] : []),
  ];
}

export function catalogSearchRank(product: {
  name?: string | null;
  slug?: string | null;
  sku?: string | null;
  ean?: string | null;
  brand?: string | null;
  description?: string | null;
  category?: { name?: string | null } | null;
  subcategory?: { name?: string | null } | null;
  variations?: Array<{ sku?: string | null; name?: string | null; value?: string | null }>;
}, query: string) {
  const key = normalizeCatalogSearchQuery(query);
  const name = normalize(product.name ?? "");
  const slug = normalize((product.slug ?? "").replaceAll("-", " "));
  const sku = normalize(product.sku ?? "");
  const ean = normalize(product.ean ?? "");
  const brand = normalize(product.brand ?? "");
  const category = normalize(product.category?.name ?? "");
  const subcategory = normalize(product.subcategory?.name ?? "");
  const description = normalize(product.description ?? "");
  const variations = (product.variations ?? []).map((variation) => ({
    sku: normalize(variation.sku ?? ""),
    name: normalize(variation.name ?? ""),
    value: normalize(variation.value ?? ""),
  }));
  const searchableText = [name, slug, sku, ean, brand, category, subcategory, description,
    ...variations.flatMap((variation) => [variation.sku, variation.name, variation.value])].join(" ");

  if (sku === key || ean === key || name === key || slug === key) return 0;
  if (brand === key || category === key || subcategory === key) return 0;
  if (variations.some((variation) => variation.sku === key || variation.value === key || variation.name === key)) return 0;
  if (name.startsWith(key) || slug.startsWith(key)) return 1;
  if (name.includes(key) || slug.includes(key) || sku.includes(key) || ean.includes(key)) return 2;
  if (variations.some((variation) => variation.sku.includes(key) || variation.value.includes(key) || variation.name.includes(key))) return 2;
  if (brand.includes(key) || category.includes(key) || subcategory.includes(key)) return 3;
  const wirelessQuery = /\bfones?\b/.test(key) && /\b(sem fio|bluetooth|wireless|tws)\b/.test(key);
  if (wirelessQuery && /\b(fone|fones|headphone|headphones|headset|earbud|earbuds)\b/.test(searchableText) && /\b(sem fio|bluetooth|wireless|tws)\b/.test(searchableText)) return 3;
  const airRemoteQuery = /\bcontroles?\b/.test(key) && /\b(ac|ar condic)/.test(key);
  if (airRemoteQuery && /\b(controle|controles)\b/.test(searchableText) && /\bar condic/.test(searchableText)) return 3;
  const queryTerms = key.split(" ").filter((word) => word && !stopWords.has(word)).slice(0, 8);
  if (queryTerms.length && queryTerms.every((term) => searchTermForms(term).some((form) => searchableText.includes(form)))) return 3;
  if (description.includes(key)) return 4;
  return 5;
}
