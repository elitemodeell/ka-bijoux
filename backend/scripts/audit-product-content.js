const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const BACKEND_ROOT = path.resolve(__dirname, "..");
const PROJECT_ROOT = path.resolve(BACKEND_ROOT, "..");
const REPORT_PATH = path.join(PROJECT_ROOT, "tmp", "product-content-audit.json");
const WRITE_SAFE_DESCRIPTIONS = process.argv.includes("--write-safe-descriptions");

loadEnv(path.join(BACKEND_ROOT, ".env"));
loadEnv(path.join(PROJECT_ROOT, ".env"));
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

const prisma = new PrismaClient();

async function main() {
  let products;
  let dataSource = "database";
  let warning = null;

  try {
    products = await prisma.product.findMany({
      orderBy: { name: "asc" },
      include: {
        category: { select: { name: true, slug: true } },
        subcategory: { select: { name: true, slug: true } },
        images: { select: { url: true }, take: 1 },
      },
    });
  } catch (error) {
    if (WRITE_SAFE_DESCRIPTIONS) throw error;
    dataSource = "bling_export";
    warning = "Banco indisponível; relatório gerado pelo catálogo exportado da Bling. Nenhum dado foi alterado.";
    products = loadBlingFallbackProducts();
  }

  const attention = [];
  let validDescriptions = 0;
  let generatedDescriptions = 0;

  for (const product of products) {
    const categoryName = product.subcategory?.name || product.category?.name || "Produtos";
    const hasDescription = isPublicText(product.description);
    const generatedDescription = hasDescription
      ? null
      : buildCommercialDescription(product.name, categoryName, product.category?.slug === "sex-shop");

    if (hasDescription) validDescriptions += 1;
    if (generatedDescription) {
      generatedDescriptions += 1;
      if (WRITE_SAFE_DESCRIPTIONS) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            description: generatedDescription,
            enrichmentStatus: "NEEDS_MANUAL_REVIEW",
            researchNotes: appendNote(product.researchNotes, "Descrição comercial segura gerada pela auditoria; dados técnicos continuam sujeitos à confirmação."),
          },
        });
      }
    }

    const missing = [];
    if (!product.images.length) missing.push("imagem");
    if (!hasDescription) missing.push("descricao_confirmada");
    if (!isPublicText(product.howToUse)) missing.push("modo_de_uso_confirmado");
    if (!isPublicText(product.composition)) missing.push("composicao_confirmada");
    if (!isPublicText(product.careInstructions)) missing.push("cuidados_confirmados");
    if (!isPublicText(product.packageContents)) missing.push("conteudo_embalagem_confirmado");

    if (missing.length) {
      attention.push({
        id: product.id,
        nome: product.name,
        categoria: categoryName,
        ativo: product.active,
        pendencias: missing,
        descricaoComercialDisponivel: Boolean(hasDescription || generatedDescription),
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: WRITE_SAFE_DESCRIPTIONS ? "write_safe_descriptions" : "report_only",
    dataSource,
    warning,
    totals: {
      products: products.length,
      active: products.filter((product) => product.active).length,
      validDescriptions,
      safeDescriptionsGenerated: generatedDescriptions,
      manualReview: attention.length,
    },
    attention,
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ report: REPORT_PATH, ...report.totals }, null, 2));
}

function loadBlingFallbackProducts() {
  const catalogPath = path.join(BACKEND_ROOT, "data", "produtos-bling.json");
  const imagesPath = path.join(BACKEND_ROOT, "data", "bling-image-files.json");
  const rows = readJson(catalogPath);
  const imageNames = readJson(imagesPath).map((file) => ({
    file,
    normalized: normalize(String(file).replace(/\.[^.]+$/, "")),
  }));

  return rows.map((row) => {
    const category = inferCategory(row.nome || "");
    const productName = normalize(row.nome || "");
    const image = imageNames.find(({ normalized }) => {
      if (!normalized || !productName) return false;
      return normalized === productName || normalized.includes(productName) || productName.includes(normalized);
    });

    return {
      id: String(row.id),
      name: String(row.nome || "Produto"),
      description: null,
      howToUse: null,
      composition: null,
      careInstructions: null,
      packageContents: null,
      researchNotes: null,
      active: row.situacao === "A" && Number(row.estoque) > 0,
      category,
      subcategory: null,
      images: image ? [{ url: `/uploads/products/${image.file}` }] : [],
    };
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function inferCategory(name) {
  const normalized = normalize(name);
  if (/bullet|vibrador|anel peniano|lubrificante|gel intimo|gel corporal|sex|prazer|excitante|masturbador|desodorante intimo|bala liquida/.test(normalized)) {
    return { name: "Sex Shop", slug: "sex-shop" };
  }
  return { name: "Produtos", slug: "produtos" };
}

function buildCommercialDescription(name, categoryName, isAdult) {
  const normalized = normalize(`${name} ${categoryName}`);
  if (normalized.includes("mini bullet") || normalized.includes("bullet")) {
    const doublePoint = normalized.includes("duplo")
      ? " Seu design com dois pontos de contato amplia as possibilidades de uso."
      : " Seu formato favorece estímulos direcionados.";
    return `${name} é uma opção compacta e discreta para explorar novas sensações com praticidade.${doublePoint} O formato reduzido facilita o transporte e o armazenamento.`;
  }
  if (normalized.includes("anel peniano")) {
    return `${name} é um acessório íntimo pensado para complementar os momentos a dois de forma prática e discreta. O formato de anel facilita o posicionamento e acrescenta novas possibilidades à experiência do casal.`;
  }
  if (/gel|creme|lubrificante|oleo|spray|desodorante/.test(normalized)) {
    return `${name} integra a seleção de cuidados e bem-estar da KA Bijoux. É uma opção prática para incluir na rotina, com proposta de uso discreta. Consulte as orientações do rótulo antes da aplicação.`;
  }
  if (isAdult) {
    return `${name} faz parte da Linha Adulto KA Bijoux, uma seleção pensada para proporcionar novas experiências com discrição e cuidado. Utilize conforme as orientações do rótulo ou da embalagem.`;
  }
  return `${name} foi selecionado para a vitrine KA Bijoux por sua proposta prática e versátil. Uma escolha pensada para complementar sua rotina com estilo e cuidado.`;
}

function isPublicText(value) {
  if (!value || value.trim().length < 8) return false;
  const normalized = normalize(value);
  return ![
    "nao informado",
    "revisao",
    "necessita revisao",
    "informacao indisponivel",
    "informacoes tecnicas pendentes",
    "importado da bling",
  ].some((term) => normalized.includes(term));
}

function appendNote(current, note) {
  if (!current) return note;
  if (current.includes(note)) return current;
  return `${current}\n${note}`;
}

function normalize(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
