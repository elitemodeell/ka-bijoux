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

const commonAccentedWords: Record<string, string> = {
  coracao: "cora\u00e7\u00e3o", coracoes: "cora\u00e7\u00f5es",
  fragrancia: "fragr\u00e2ncia", fragrancias: "fragr\u00e2ncias",
  colonia: "col\u00f4nia", colonias: "col\u00f4nias",
  oculos: "\u00f3culos", pelicula: "pel\u00edcula", peliculas: "pel\u00edculas",
  informacao: "informa\u00e7\u00e3o", informacoes: "informa\u00e7\u00f5es",
  promocao: "promo\u00e7\u00e3o", promocoes: "promo\u00e7\u00f5es",
  lancamento: "lan\u00e7amento", lancamentos: "lan\u00e7amentos",
  cartao: "cart\u00e3o", cartoes: "cart\u00f5es", mae: "m\u00e3e", pao: "p\u00e3o",
  saude: "sa\u00fade", liquido: "l\u00edquido", eletronico: "eletr\u00f4nico",
  eletronicos: "eletr\u00f4nicos", edicao: "edi\u00e7\u00e3o", edicoes: "edi\u00e7\u00f5es",
};

function searchSpellings(value: string) {
  const normalized = normalize(value);
  const variants = new Set([value, normalized]);
  const words = normalized.split(" ");
  const accented = words.map((word) => commonAccentedWords[word] ?? word);
  if (accented.some((word, index) => word !== words[index])) variants.add(accented.join(" "));
  return [...variants];
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
    { name: { contains: term, mode } },
    { slug: { contains: term.replaceAll(" ", "-"), mode } },
  ];
}

export function catalogSearchAlternatives(query: string): Prisma.ProductWhereInput[] {
  const original = query.trim().slice(0, 120);
  const normalized = normalizeCatalogSearchQuery(original);
  if (!normalized) return [];

  // Three- and four-character inputs are common prefixes ("cap", "perf").
  // Use indexed prefix matches instead of broad substring searches across every
  // relation, which can time out while suggestion cards are being assembled.
  if (/^[a-z0-9]{3,4}$/.test(normalized)) {
    const mode = "insensitive" as const;
    const candidates = new Set(typoVocabulary.filter((word) => word.startsWith(normalized)));
    for (const [canonical, related] of Object.entries(synonyms)) {
      for (const term of [canonical, ...related]) {
        if (term.startsWith(normalized)) candidates.add(term);
      }
    }
    const prefixes = [...candidates];
    if (!prefixes.length) prefixes.push(normalized);
    return [{ OR: [
      { sku: { equals: normalized, mode } },
      { ean: { equals: normalized, mode } },
      ...prefixes.flatMap((term) => [
        { name: { startsWith: term, mode } },
        { slug: { startsWith: term.replaceAll(" ", "-"), mode } },
      ]),
    ] }];
  }

  const wirelessHeadphones = /\bfones?\b/.test(normalized) && /\b(sem fio|bluetooth|wireless|tws)\b/.test(normalized);
  const airConditionerRemote = /\bcontroles?\b/.test(normalized) && /\b(ac|ar condic)/.test(normalized);
  const groups = wirelessHeadphones
    ? [["fone", "fones", "headphone", "headphones", "headset", "headsets", "earbud", "earbuds"], ["sem fio", "bluetooth", "wireless", "tws"]]
    : airConditionerRemote
      ? [["controle", "controles"], ["ar condicionado", "ar-condicionado", "ar condic"]]
      : normalized.split(" ").filter((word) => !stopWords.has(word)).slice(0, 8).map(searchTermForms);

  if (wirelessHeadphones || airConditionerRemote) {
    return [{ AND: [
      { OR: groups[0].flatMap(matchProductWord) },
      { OR: groups[1].flatMap(matchProductWord) },
    ] }];
  }

  const corrected = normalize(original) !== normalized;
  return [
    ...matchTerm(corrected ? normalized : original),
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
