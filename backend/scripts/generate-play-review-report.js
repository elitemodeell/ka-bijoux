const fs = require("node:fs");
const path = require("node:path");
const envPath = path.join(__dirname, "..", ".env");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
}
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const output = path.join(__dirname, "..", "..", "REVISAO_CATALOGO_GOOGLE_PLAY_KA_BIJOUX_2026.md");

const blockedPattern =
  /(vibrador|sugador|estimulador|masturbador|plug[ -]?anal|acess[oó]rio anal|pr[oó]tese|fetiche|bdsm|brinquedo sexual|estimula[cç][aã]o sexual|prazer sexual|desempenho sexual)/i;
const restrictedCategoryPattern =
  /(vibrador|sugador|estimulador|masturbador|plug|anal|protese|fetiche|bdsm|anel)/i;
const allowedNeutralIds = new Set([
  "cmr6i1s0c0031rhf8nqzyc2ef",
  "cmr6i1s470034rhf850dp3t4e",
]);
const forcedReviewIds = new Set(["cmr6c4fnf001ifu1pxv82tyer"]);

function maskName(name) {
  const words = String(name || "Produto").split(/\s+/);
  return words
    .map((word) => (word.length <= 2 ? "**" : `${word[0]}${"*".repeat(Math.min(word.length - 1, 8))}`))
    .join(" ");
}

function classify(product) {
  const categorySlug = product.categorySlug || "";
  const subcategorySlug = product.subcategorySlug || "";
  const text = [
    product.name,
    product.description,
    product.benefits,
    product.howToUse,
    product.composition,
    product.packageContents,
    Array.isArray(product.searchTags) ? product.searchTags.join(" ") : "",
  ].join(" ");

  if (allowedNeutralIds.has(product.id)) {
    return {
      status: "PLAY_ALLOWED",
      reason: "Apresentação comercial neutra revisada individualmente.",
      human: "Concluída",
    };
  }
  if (forcedReviewIds.has(product.id)) {
    return {
      status: "PLAY_REVIEW_REQUIRED",
      reason: "Mídia incompatível com o cadastro; não liberar sem nova revisão.",
      human: "Pendente",
    };
  }
  if (
    blockedPattern.test(text) ||
    restrictedCategoryPattern.test(subcategorySlug)
  ) {
    return {
      status: "PLAY_BLOCKED",
      reason: "Função, texto ou contexto comercial claramente incompatível.",
      human: "Concluída",
    };
  }
  if (categorySlug === "sex-shop" || categorySlug.startsWith("sex-shop-")) {
    return {
      status: "PLAY_REVIEW_REQUIRED",
      reason: "Item da linha restrita sem evidência suficiente para aprovação individual.",
      human: "Pendente",
    };
  }
  if (categorySlug === "lingerie") {
    return {
      status: "PLAY_REVIEW_REQUIRED",
      reason: "Vestuário íntimo exige revisão visual e textual individual.",
      human: "Pendente",
    };
  }
  return {
    status: "PLAY_ALLOWED",
    reason: "Produto geral: tipo, texto e referências de mídia sem indicador incompatível no inventário.",
    human: "Concluída por inventário; amostragem visual recomendada",
  };
}

async function main() {
  const products = await prisma.$queryRawUnsafe(`
    SELECT
      p."id", p."name", p."description", p."benefits", p."howToUse",
      p."composition", p."packageContents", p."searchTags", p."active",
      c."name" AS "categoryName", c."slug" AS "categorySlug",
      sc."name" AS "subcategoryName", sc."slug" AS "subcategorySlug",
      COUNT(pi."id")::int AS "imageCount"
    FROM "products" p
    JOIN "categories" c ON c."id" = p."categoryId"
    LEFT JOIN "categories" sc ON sc."id" = p."subcategoryId"
    LEFT JOIN "product_images" pi ON pi."productId" = p."id"
    GROUP BY p."id", c."name", c."slug", sc."name", sc."slug"
    ORDER BY c."name", p."name"
  `);

  const rows = products.map((product) => ({ product, decision: classify(product) }));
  const counts = rows.reduce(
    (acc, row) => {
      acc[row.decision.status] += 1;
      return acc;
    },
    { PLAY_ALLOWED: 0, PLAY_BLOCKED: 0, PLAY_REVIEW_REQUIRED: 0 }
  );

  const lines = [
    "# Revisão do catálogo Google Play — KA Bijoux",
    "",
    "Data: 28 de julho de 2026",
    "",
    "Este relatório é interno. Nomes de itens bloqueados são mascarados. A decisão usa tipo, função, textos, categoria/subcategoria e inventário de mídias cadastradas. Registros ambíguos permanecem fora da primeira versão até revisão humana. A amostragem visual de produtos gerais não substitui o teste visual completo em aparelho.",
    "",
    "## Totais sugeridos",
    "",
    `- PLAY_ALLOWED: ${counts.PLAY_ALLOWED}`,
    `- PLAY_BLOCKED: ${counts.PLAY_BLOCKED}`,
    `- PLAY_REVIEW_REQUIRED: ${counts.PLAY_REVIEW_REQUIRED}`,
    `- Total: ${rows.length}`,
    "",
    "## Produtos",
    "",
    "| ID | Produto | Categoria | Status sugerido | Motivo | Revisar imagem | Revisar descrição | Decisão humana |",
    "|---|---|---|---|---|---|---|---|",
  ];

  for (const { product, decision } of rows) {
    const displayedName =
      decision.status === "PLAY_BLOCKED" ? maskName(product.name) : String(product.name).replace(/\|/g, "/");
    const category = [product.categoryName, product.subcategoryName].filter(Boolean).join(" / ");
    const reviewImage =
      decision.status === "PLAY_REVIEW_REQUIRED" || Number(product.imageCount) === 0 ? "SIM" : "NÃO";
    const reviewDescription =
      decision.status === "PLAY_REVIEW_REQUIRED" || !String(product.description || "").trim() ? "SIM" : "NÃO";
    lines.push(
      `| ${product.id} | ${displayedName} | ${category} | ${decision.status} | ${decision.reason} | ${reviewImage} | ${reviewDescription} | ${decision.human} |`
    );
  }

  fs.writeFileSync(output, `${lines.join("\n")}\n`, "utf8");
  process.stdout.write(JSON.stringify({ output, counts, total: rows.length }));
}

main()
  .catch((error) => {
    process.stderr.write(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
