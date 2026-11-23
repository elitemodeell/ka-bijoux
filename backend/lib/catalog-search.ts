import type { Prisma } from "@prisma/client";

const stopWords = new Set(["a", "o", "de", "do", "da", "dos", "das", "para", "com", "e"]);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function matchIdentity(term: string): Prisma.ProductWhereInput[] {
  const match = { contains: term, mode: "insensitive" as const };
  return [{ name: match },
    { slug: { ...match, contains: normalize(term).replaceAll(" ", "-") } },
  ];
}

function matchTerm(term: string): Prisma.ProductWhereInput[] {
  const match = { contains: term, mode: "insensitive" as const };
  return [
    ...matchIdentity(term), { description: match }, { sku: match },
    { searchTags: { hasSome: [...new Set([term.toLowerCase(), normalize(term)])] } },
    { category: { name: match } }, { subcategory: { name: match } },
  ];
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
  const normalized = normalize(original);
  if (!normalized) return [];

  const wirelessHeadphones = /\bfones?\b/.test(normalized) && /\b(sem fio|bluetooth|wireless|tws)\b/.test(normalized);
  const airConditionerRemote = /\bcontroles?\b/.test(normalized) && /\bar condic/.test(normalized);
  const groups = wirelessHeadphones
    ? [["fone", "fones", "headphone", "headphones", "headset", "headsets", "earbud", "earbuds"], ["sem fio", "bluetooth", "wireless", "tws"]]
    : airConditionerRemote
      ? [["controle", "controles"], ["ar condic", "ar-condic"]]
      : normalized.split(" ").filter((word) => !stopWords.has(word)).slice(0, 8).map((word) => [word]);

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
