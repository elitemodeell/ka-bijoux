const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const BACKEND_ROOT = path.resolve(__dirname, "..");
const PROJECT_ROOT = path.resolve(BACKEND_ROOT, "..");
const CSV_PATH = path.join(PROJECT_ROOT, "produtos-bling.csv");
const IMAGE_MAP_PATH = path.join(PROJECT_ROOT, "mapeamento-imagens-produtos.json");
const BIJOUX_IMAGE_DIRS = [
  path.join(BACKEND_ROOT, "public", "imagens", "Bijoux"),
  path.join(BACKEND_ROOT, "public", "images", "Bijoux"),
];
const UPLOAD_DIR = path.join(BACKEND_ROOT, "public", "uploads", "products");
const REPORT_DIR = path.join(PROJECT_ROOT, "tmp");

loadEnv(path.join(BACKEND_ROOT, ".env"));
loadEnv(path.join(PROJECT_ROOT, ".env"));

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

const CATEGORY_DEFS = [
  { id: "cat-sex-shop", name: "Sex Shop", slug: "sex-shop", description: "Linha adulta com discricao", order: 1 },
  { id: "cat-capinhas", name: "Capinhas e acessorios de celular", slug: "capinhas-acessorios-celular", description: "Capinhas e acessorios para celular", order: 2 },
  { id: "cat-bijuterias", name: "Bijuterias", slug: "bijuterias", description: "Brincos, colares e pulseiras", order: 3 },
  { id: "cat-bolsas", name: "Bolsas e Necessaires", slug: "bolsas-necessaires", description: "Bolsas, carteiras e necessaires", order: 4 },
  { id: "cat-relogios", name: "Relogios", slug: "relogios", description: "Relogios masculinos e femininos", order: 5 },
  { id: "cat-maquiagem", name: "Maquiagem", slug: "maquiagem", description: "Maquiagem e cosmeticos", order: 6 },
  { id: "cat-utilidades", name: "Utilidades domesticas", slug: "utilidades-domesticas", description: "Utilidades para o lar", order: 7 },
  { id: "cat-decoracao", name: "Decoracao", slug: "decoracao", description: "Itens de decoracao", order: 8 },
  { id: "cat-perfumaria", name: "Perfumaria", slug: "perfumaria", description: "Perfumes e fragrancias", order: 9 },
  { id: "cat-oculos", name: "Oculos", slug: "oculos", description: "Oculos de sol e grau fashion", order: 10 },
  { id: "cat-acessorios-cabelo", name: "Acessorios de cabelo", slug: "acessorios-cabelo", description: "Tiaras, presilhas e acessorios", order: 11 },
  { id: "cat-pijamas", name: "Pijamas", slug: "pijamas", description: "Pijamas confortaveis", order: 12 },
  { id: "cat-lingerie", name: "Lingerie", slug: "lingerie", description: "Lingerie feminina", order: 13 },
  { id: "cat-roupa-infantil", name: "Roupa infantil", slug: "roupa-infantil", description: "Roupas para criancas", order: 14 },
  { id: "cat-acessorios-inverno", name: "Acessorios de inverno", slug: "acessorios-inverno", description: "Cachecois, luvas e gorros", order: 15 },
  { id: "cat-pet", name: "Pet", slug: "pet", description: "Produtos para pets", order: 16 },
  { id: "cat-papelaria", name: "Papelaria", slug: "papelaria", description: "Cadernos, canetas e papelaria", order: 17 },
  { id: "cat-brinquedos", name: "Brinquedos", slug: "brinquedos", description: "Brinquedos e jogos", order: 18 },
  { id: "cat-cintos", name: "Cintos", slug: "cintos", description: "Cintos masculinos e femininos", order: 19 },
];

const SUBCATEGORY_DEFS = [
  { id: "sub-geis", name: "Geis & Cremes", slug: "sex-shop-geis-e-cremes", description: "Geis e cremes sensuais", order: 1, parentSlug: "sex-shop" },
  { id: "sub-vibradores", name: "Vibradores", slug: "sex-shop-vibradores", description: "Vibradores e massageadores", order: 2, parentSlug: "sex-shop" },
  { id: "sub-aneis", name: "Aneis Penianos", slug: "sex-shop-aneis", description: "Aneis penianos", order: 3, parentSlug: "sex-shop" },
  { id: "sub-masturbadores", name: "Masturbadores", slug: "sex-shop-masturbadores", description: "Masturbadores masculinos", order: 4, parentSlug: "sex-shop" },
  { id: "sub-lubrificantes", name: "Lubrificantes", slug: "sex-shop-lubrificantes", description: "Lubrificantes intimos", order: 5, parentSlug: "sex-shop" },
  { id: "sub-balas", name: "Balas Liquidas", slug: "sex-shop-balas-liquidas", description: "Balas e gomas sensuais", order: 6, parentSlug: "sex-shop" },
  { id: "sub-desodorantes", name: "Desodorantes Intimos", slug: "sex-shop-desodorantes", description: "Desodorantes intimos", order: 7, parentSlug: "sex-shop" },
  { id: "sub-oculos-infantil", name: "Infantil", slug: "oculos-infantil", description: "Oculos infantis", order: 1, parentSlug: "oculos" },
  { id: "sub-oculos-adulto", name: "Adulto", slug: "oculos-adulto", description: "Oculos adulto", order: 2, parentSlug: "oculos" },
];

const TECH_PLACEHOLDER =
  "Produto KA Bijoux importado da Bling. Nome, preco, estoque e codigo seguem o cadastro da loja. Informacoes tecnicas aguardam revisao manual no admin.";

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`Arquivo nao encontrado: ${CSV_PATH}`);
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const imageIndex = buildImageIndex();
  const rows = parseBlingCsv(fs.readFileSync(CSV_PATH, "utf8"));
  const products = rows.filter((row) => row.id && row.nome);
  const duplicates = findDuplicates(products);

  if (process.argv.includes("--report-only")) {
    writeReport(buildReportOnly(products, duplicates, imageIndex));
    return;
  }

  await ensureBlingCatalogSchema();
  const categoryIndex = await ensureCategories();
  const importedIds = [];
  const attention = [];
  const productReport = [];

  const existingManualBefore = await prisma.product.count({
    where: { importSource: "MANUAL", blingId: null },
  });

  for (const row of products) {
    const normalizedRow = normalizeBlingRow(row);
    const imageMatch = findImageForProduct(normalizedRow, imageIndex);
    const imageUrl = normalizedRow.imageUrl || (imageMatch ? materializeImage(imageMatch, normalizedRow) : null);
    const category = inferCategory(normalizedRow.nome, normalizedRow.categoria);
    const categoryId = categoryIndex.bySlug.get(category.categorySlug) ?? categoryIndex.fallbackId;
    const subcategoryId = category.subcategorySlug
      ? categoryIndex.bySlug.get(category.subcategorySlug) ?? null
      : null;

    const slug = await uniqueSlug(slugify(normalizedRow.nome), normalizedRow.id);
    const existing = await findExistingProduct(normalizedRow, slug);
    const existingHasDescription = hasTrustedDescription(existing?.description);
    const description = existingHasDescription ? existing.description : TECH_PLACEHOLDER;
    const hasImage = Boolean(imageUrl || existing?.images?.[0]?.url);
    const hasDescription = hasTrustedDescription(description);
    const publicationStatus = getPublicationStatus({
      blingActive: normalizedRow.situacao === "A",
      hasImage,
      hasDescription,
    });
    const active = normalizedRow.situacao === "A" && normalizedRow.estoque > 0 && hasImage;

    const data = {
      name: normalizedRow.nome,
      slug: existing?.slug || slug,
      description,
      brand: existing?.brand ?? null,
      ean: existing?.ean ?? null,
      benefits: existing?.benefits ?? null,
      howToUse: existing?.howToUse ?? null,
      composition: existing?.composition ?? null,
      careInstructions: existing?.careInstructions ?? null,
      packageContents: existing?.packageContents ?? null,
      price: normalizedRow.preco,
      stock: normalizedRow.estoque,
      sku: normalizedRow.codigo || null,
      blingId: normalizedRow.id,
      importSource: "BLING",
      enrichmentStatus: existingHasDescription ? "MANUAL_REVIEWED" : "NEEDS_MANUAL_REVIEW",
      publicationStatus,
      searchTags: buildSearchTags(normalizedRow.nome, category.categorySlug, category.subcategorySlug),
      importedAt: new Date(),
      active,
      isNew: true,
      categoryId,
      subcategoryId,
    };

    const product = existing
      ? await prisma.product.update({ where: { id: existing.id }, data })
      : await prisma.product.create({ data });

    if (imageUrl) {
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: imageUrl,
          alt: normalizedRow.nome,
          order: 0,
        },
      });
    }

    importedIds.push(product.id);

    const issues = [];
    if (!hasImage) issues.push("sem_imagem");
    if (!hasDescription) issues.push("sem_descricao");
    if (!normalizedRow.codigo) issues.push("sem_sku");
    if (normalizedRow.estoque <= 0) issues.push("sem_estoque");
    if (publicationStatus !== "PUBLISHED") issues.push("necessita_revisao");
    if (issues.length) attention.push({ id: normalizedRow.id, nome: normalizedRow.nome, sku: normalizedRow.codigo, issues });

    productReport.push({
      blingId: normalizedRow.id,
      nome: normalizedRow.nome,
      sku: normalizedRow.codigo || null,
      ean: null,
      marca: data.brand,
      preco: normalizedRow.preco,
      estoque: normalizedRow.estoque,
      categoria: category.categorySlug,
      subcategoria: category.subcategorySlug,
      imagem: imageUrl,
      semImagem: !hasImage,
      semDescricao: !hasDescription,
      status: publicationStatus,
      ativo: active,
      origemImagem: normalizedRow.imageUrl ? "bling_image" : imageMatch?.reason ?? null,
    });
  }

  const totals = {
    totalNaBling: products.length,
    totalImportadoMarketplace: importedIds.length,
    totalComImagem: productReport.filter((item) => !item.semImagem).length,
    totalSemImagem: productReport.filter((item) => item.semImagem).length,
    totalComDescricao: productReport.filter((item) => !item.semDescricao).length,
    totalSemDescricao: productReport.filter((item) => item.semDescricao).length,
    totalPublicado: productReport.filter((item) => item.ativo).length,
    totalPendenteRevisao: attention.length,
    produtosExistentesPreservados: existingManualBefore,
    produtosAntigosOcultos: 0,
    duplicadosPorSku: duplicates.bySku.length,
    duplicadosPorNome: duplicates.byName.length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    source: {
      csv: CSV_PATH,
      imageMapping: IMAGE_MAP_PATH,
      imageDirs: BIJOUX_IMAGE_DIRS.filter((dir) => fs.existsSync(dir)),
    },
    totals,
    duplicates,
    attention,
    products: productReport,
  };

  writeReport(report);
}

async function ensureBlingCatalogSchema() {
  await prisma.$executeRawUnsafe(`
DO $$ BEGIN
  CREATE TYPE "ProductImportSource" AS ENUM ('MANUAL', 'BLING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductEnrichmentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING_RESEARCH', 'ENRICHED', 'NEEDS_MANUAL_REVIEW', 'MANUAL_REVIEWED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductPublicationStatus" AS ENUM ('IMPORTED', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'HIDDEN', 'MISSING_IMAGE', 'MISSING_DESCRIPTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "brand" TEXT,
  ADD COLUMN IF NOT EXISTS "ean" TEXT,
  ADD COLUMN IF NOT EXISTS "benefits" TEXT,
  ADD COLUMN IF NOT EXISTS "howToUse" TEXT,
  ADD COLUMN IF NOT EXISTS "composition" TEXT,
  ADD COLUMN IF NOT EXISTS "careInstructions" TEXT,
  ADD COLUMN IF NOT EXISTS "packageContents" TEXT,
  ADD COLUMN IF NOT EXISTS "blingId" TEXT,
  ADD COLUMN IF NOT EXISTS "importSource" "ProductImportSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "enrichmentStatus" "ProductEnrichmentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS "publicationStatus" "ProductPublicationStatus" NOT NULL DEFAULT 'IMPORTED',
  ADD COLUMN IF NOT EXISTS "searchTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "researchSources" JSONB,
  ADD COLUMN IF NOT EXISTS "researchNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "researchedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "products_blingId_key" ON "products"("blingId");
`);
}

async function ensureCategories() {
  const bySlug = new Map();
  for (const category of CATEGORY_DEFS) {
    const item = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        active: true,
        order: category.order,
      },
      create: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        active: true,
        order: category.order,
      },
    });
    bySlug.set(item.slug, item.id);
  }

  for (const subcategory of SUBCATEGORY_DEFS) {
    const parentId = bySlug.get(subcategory.parentSlug);
    const item = await prisma.category.upsert({
      where: { slug: subcategory.slug },
      update: {
        name: subcategory.name,
        description: subcategory.description,
        active: true,
        order: subcategory.order,
        parentId,
      },
      create: {
        id: subcategory.id,
        name: subcategory.name,
        slug: subcategory.slug,
        description: subcategory.description,
        active: true,
        order: subcategory.order,
        parentId,
      },
    });
    bySlug.set(item.slug, item.id);
  }

  return { bySlug, fallbackId: bySlug.get("bijuterias") };
}

function parseBlingCsv(text) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""), ";");
  const [header, ...lines] = rows;
  return lines
    .filter((line) => line.some((value) => String(value ?? "").trim()))
    .map((line) => Object.fromEntries(header.map((key, index) => [key, line[index] ?? ""])));
}

function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function normalizeBlingRow(row) {
  return {
    id: String(row.id ?? "").trim(),
    nome: String(row.nome ?? "").replace(/\s+/g, " ").trim(),
    codigo: String(row.codigo ?? "").trim(),
    preco: Number(String(row.preco ?? "0").replace(",", ".")) || 0,
    situacao: String(row.situacao ?? "").trim() || "I",
    estoque: Math.max(0, Number.parseInt(String(row.estoque ?? "0"), 10) || 0),
    categoria: String(row.categoria ?? "").trim(),
    imageUrl: extractBlingImageUrl(row),
  };
}

function extractBlingImageUrl(row) {
  const keys = [
    "imagem",
    "imagens",
    "image",
    "images",
    "imageUrl",
    "urlImagem",
    "url_imagem",
    "foto",
    "fotos",
    "midia",
    "media",
    "mediaUrl",
    "anexo",
    "anexos",
  ];

  for (const key of keys) {
    const value = String(row[key] ?? row[key.toLowerCase()] ?? "").trim();
    if (!value) continue;
    const first = value.split(/[|,]/).map((item) => item.trim()).find(Boolean);
    if (!first) continue;
    if (/^https?:\/\//i.test(first) || first.startsWith("/")) return first;
    if (/\.(png|jpe?g|webp)$/i.test(first)) return `/uploads/products/${first}`;
  }

  return "";
}

function buildImageIndex() {
  const mapping = fs.existsSync(IMAGE_MAP_PATH)
    ? JSON.parse(fs.readFileSync(IMAGE_MAP_PATH, "utf8"))
    : [];
  const byId = new Map();
  const bySku = new Map();
  const semantic = [];

  for (const item of mapping) {
    const entry = {
      ...item,
      id: item.id ? String(item.id) : null,
      sku: item.sku ? String(item.sku) : null,
      normalizedName: normalizeSearch(`${item.nome ?? ""} ${item.src ?? ""}`),
    };
    if (entry.id) byId.set(entry.id, entry);
    if (entry.sku) bySku.set(entry.sku, entry);
    semantic.push(entry);
  }

  if (fs.existsSync(UPLOAD_DIR)) {
    for (const fileName of fs.readdirSync(UPLOAD_DIR)) {
      if (!/\.(png|jpe?g|webp)$/i.test(fileName)) continue;
      const entry = {
        src: null,
        nome: fileName,
        id: null,
        sku: null,
        normalizedName: normalizeSearch(fileName.replace(/\.[^.]+$/, "")),
      };
      if (!semantic.some((item) => item.nome === fileName)) {
        semantic.push(entry);
      }
    }
  }

  return { byId, bySku, semantic };
}

function findImageForProduct(product, imageIndex) {
  if (imageIndex.byId.has(product.id)) {
    return { item: imageIndex.byId.get(product.id), reason: "bling_id" };
  }

  if (product.codigo && imageIndex.bySku.has(product.codigo)) {
    return { item: imageIndex.bySku.get(product.codigo), reason: "sku" };
  }

  const productTokens = tokenize(product.nome);
  let best = null;
  for (const item of imageIndex.semantic) {
    const itemTokens = tokenize(item.nome || item.src || "");
    const score = similarityScore(productTokens, itemTokens);
    if (!best || score > best.score) best = { item, score };
  }

  if (best && best.score >= 0.55) {
    return { item: best.item, reason: `nome_parecido_${best.score.toFixed(2)}` };
  }

  return null;
}

function materializeImage(match, product) {
  const item = match.item;
  const finalName = item.nome || `${slugify(product.nome)}.png`;
  const sourcePath = BIJOUX_IMAGE_DIRS
    .map((dir) => path.join(dir, item.src || ""))
    .find((file) => item.src && fs.existsSync(file));
  const existingUploadPath = path.join(UPLOAD_DIR, finalName);
  const destPath = path.join(UPLOAD_DIR, finalName);

  if (sourcePath) {
    fs.copyFileSync(sourcePath, destPath);
    return `/uploads/products/${finalName}`;
  }

  if (fs.existsSync(existingUploadPath)) {
    return `/uploads/products/${finalName}`;
  }

  return null;
}

async function findExistingProduct(product, slug) {
  const or = [{ blingId: product.id }, { slug }];
  if (product.codigo) or.push({ sku: product.codigo });
  or.push({ name: { equals: product.nome, mode: "insensitive" } });

  return prisma.product.findFirst({
    where: { OR: or },
    include: { images: { orderBy: { order: "asc" } } },
  });
}

async function uniqueSlug(baseSlug, blingId) {
  const fallback = baseSlug || `produto-${blingId}`;
  const existing = await prisma.product.findUnique({ where: { slug: fallback } });
  if (!existing) return fallback;
  return `${fallback}-${blingId}`;
}

function inferCategory(name, blingCategory) {
  const fromBling = mapBlingCategory(blingCategory);
  const n = normalizeSearch(name);

  if (isPhoneAccessoryName(n)) {
    return { categorySlug: "capinhas-acessorios-celular", subcategorySlug: null };
  }

  if (fromBling) return fromBling;

  if (/\b(cachecol|gorro|luva|inverno)/.test(n)) {
    return { categorySlug: "acessorios-inverno", subcategorySlug: null };
  }

  if (/\b(oculos|oculo)\b/.test(n)) {
    return { categorySlug: "oculos", subcategorySlug: "oculos-adulto" };
  }

  if (/\b(bolsa|necessaire|carteira)\b/.test(n)) {
    return { categorySlug: "bolsas-necessaires", subcategorySlug: null };
  }

  if (isAdultProduct(n)) {
    return { categorySlug: "sex-shop", subcategorySlug: inferAdultSubcategory(n) };
  }

  if (/\b(brinco|colar|pulseira|bracelete|broche|anel|biju|missanga)\b/.test(n)) {
    return { categorySlug: "bijuterias", subcategorySlug: null };
  }

  if (/\b(adesivo|bota de chuva)\b/.test(n)) {
    return { categorySlug: "utilidades-domesticas", subcategorySlug: null };
  }

  return { categorySlug: "bijuterias", subcategorySlug: null };
}

function isPhoneAccessoryName(n) {
  return (
    isPhoneCaseName(n) ||
    /\b(pelicula|pelic|carregador|carreg|fonte|fone|headphone|cabos?|usb|tipo c|type c|v8|micro usb|adaptador|conversor|smartwatch|smart watch|suporte p celular|suporte para celular|ventosa p celular|ventosa para celular|pulseira de celular|corda de celular|cordao de celular|fita salva celular|sim card|tag rastreadora|pen drive)\b/.test(n)
  );
}

function isPhoneCaseName(n) {
  return /\b(case|capinha|capa)\b/.test(n) || (/\bsilicone\b/.test(n) && /\b(celular|iphone|ip\s*(?:xr|\d{1,2}\s*(?:pro\s*max|pro|max|plus)?))\b/.test(n));
}

function mapBlingCategory(value) {
  const normalized = normalizeSearch(value);
  const aliases = {
    "sex shop": { categorySlug: "sex-shop", subcategorySlug: null },
    adulto: { categorySlug: "sex-shop", subcategorySlug: null },
    "linha adulto": { categorySlug: "sex-shop", subcategorySlug: null },
    bijuterias: { categorySlug: "bijuterias", subcategorySlug: null },
    bijoux: { categorySlug: "bijuterias", subcategorySlug: null },
    "capinhas e acessorios de celular": { categorySlug: "capinhas-acessorios-celular", subcategorySlug: null },
    capinhas: { categorySlug: "capinhas-acessorios-celular", subcategorySlug: null },
    oculos: { categorySlug: "oculos", subcategorySlug: "oculos-adulto" },
    lingerie: { categorySlug: "lingerie", subcategorySlug: null },
    maquiagem: { categorySlug: "maquiagem", subcategorySlug: null },
    perfumaria: { categorySlug: "perfumaria", subcategorySlug: null },
    papelaria: { categorySlug: "papelaria", subcategorySlug: null },
    brinquedos: { categorySlug: "brinquedos", subcategorySlug: null },
  };

  return aliases[normalized] ?? null;
}

function isAdultProduct(n) {
  if (/\b(sexy|sex|intimo|intima|lubrificante|vibrador|bullet|peniano|masturbador|algema|dedeira|tesao|pocao|garganta profunda|virginite|anosex|egg|pau de cavalo|duramais|dessensibilizante|excitante|anestesico|beijavel)\b/.test(n)) {
    return true;
  }

  if (/\bgel\b/.test(n) && /\b(excitant|sensual|massageador|massagem|comestivel|anestesico|dessensibilizante|esquenta|esfria|beijavel|anal|intimo|sex|sexy|masculino)\b/.test(n)) {
    return true;
  }

  if (/\bpomada\b/.test(n) && /\b(massageadora|canela|tubarao)\b/.test(n)) {
    return true;
  }

  return false;
}

function inferAdultSubcategory(n) {
  if (/\b(desodorante)\b/.test(n)) return "sex-shop-desodorantes";
  if (/\b(vibrador|bullet|sugador|golfinho)\b/.test(n)) return "sex-shop-vibradores";
  if (/\b(anel|peniano|dedeira)\b/.test(n)) return "sex-shop-aneis";
  if (/\b(masturbador|egg)\b/.test(n)) return "sex-shop-masturbadores";
  if (/\b(lub|lubrificante|k med|k-med)\b/.test(n)) return "sex-shop-lubrificantes";
  if (/\b(tesao|pocao|bala)\b/.test(n)) return "sex-shop-balas-liquidas";
  return "sex-shop-geis-e-cremes";
}

function getPublicationStatus({ blingActive, hasImage, hasDescription }) {
  if (!blingActive) return "HIDDEN";
  if (!hasImage) return "MISSING_IMAGE";
  if (!hasDescription) return "MISSING_DESCRIPTION";
  return "PUBLISHED";
}

function buildSearchTags(name, categorySlug, subcategorySlug) {
  const tokens = tokenize(name);
  const aliases = buildSearchAliases(name, categorySlug);
  return Array.from(new Set([...tokens, ...aliases, categorySlug, subcategorySlug].filter(Boolean))).slice(0, 40);
}

function buildSearchAliases(name, categorySlug) {
  const n = normalizeSearch(name);
  const tags = [n];

  if (categorySlug === "capinhas-acessorios-celular" || /\b(celular|iphone|ip\s*(?:xr|\d{1,2})|usb|cabos?|fonte|carreg|fone|smartwatch|smart watch)\b/.test(n)) {
    tags.push("celular", "acessorio celular", "acessorios celular");
  }

  if (isPhoneCaseName(n)) {
    tags.push("capa", "capinha", "case", "capa celular", "case celular");
  }

  if (/\b(corda|cordao|pulseira de celular|fita salva celular)\b/.test(n)) {
    tags.push("cordao", "cordao celular", "alca", "alca celular", "alcas", "lanyard");
  }

  if (/\b(usb c|tipo c|type c|usbc)\b/.test(n)) {
    tags.push("usb c", "tipo c", "type c", "usbc");
  }

  if (/\blightning\b/.test(n)) {
    tags.push("lightning", "iphone", "apple");
  }

  tags.push(...extractPhoneSearchAliases(n));
  return tags.map(normalizeSearch).filter(Boolean);
}

function extractPhoneSearchAliases(normalizedName) {
  const aliases = [];
  if (/\bip\s*xr\b|\biphone\s*xr\b|\bipxr\b|\biphonexr\b/.test(normalizedName)) {
    aliases.push("ip xr", "ipxr", "iphone xr", "iphonexr");
  }

  const match = normalizedName.match(/\b(?:ip|iphone)\s*(\d{1,2})\s*(pro max|pro|plus)?\b/);
  if (match) {
    const number = match[1];
    const suffix = match[2] ?? "";
    const spaced = suffix ? `${number} ${suffix}` : number;
    const compact = `${number}${suffix.replace(/\s+/g, "")}`;
    aliases.push(`ip ${spaced}`, `ip${compact}`, `iphone ${spaced}`, `iphone${compact}`);
  }

  return aliases;
}

function hasTrustedDescription(value) {
  if (!value) return false;
  const normalized = normalizeSearch(value);
  if (normalized.includes(normalizeSearch(TECH_PLACEHOLDER).slice(0, 40))) return false;
  if (normalized.includes("informacoes tecnicas aguardam revisao")) return false;
  return value.trim().length >= 80;
}

function findDuplicates(products) {
  const bySkuMap = new Map();
  const byNameMap = new Map();
  for (const product of products) {
    const row = normalizeBlingRow(product);
    if (row.codigo) pushMap(bySkuMap, row.codigo, row);
    pushMap(byNameMap, normalizeSearch(row.nome), row);
  }

  return {
    bySku: Array.from(bySkuMap.entries())
      .filter(([, items]) => items.length > 1)
      .map(([key, items]) => ({ sku: key, items })),
    byName: Array.from(byNameMap.entries())
      .filter(([, items]) => items.length > 1)
      .map(([key, items]) => ({ nomeNormalizado: key, items })),
  };
}

function buildReportOnly(products, duplicates, imageIndex) {
  const productReport = [];
  const attention = [];

  for (const row of products) {
    const product = normalizeBlingRow(row);
    const imageMatch = findImageForProduct(product, imageIndex);
    const category = inferCategory(product.nome, product.categoria);
    const hasImage = Boolean(product.imageUrl || imageMatch);
    const hasDescription = false;
    const status = hasImage ? "MISSING_DESCRIPTION" : "MISSING_IMAGE";
    const issues = [];

    if (!hasImage) issues.push("sem_imagem");
    if (!hasDescription) issues.push("sem_descricao");
    if (!product.codigo) issues.push("sem_sku");
    if (product.estoque <= 0) issues.push("sem_estoque");
    issues.push("necessita_revisao");

    attention.push({ id: product.id, nome: product.nome, sku: product.codigo, issues });
    productReport.push({
      blingId: product.id,
      nome: product.nome,
      sku: product.codigo || null,
      ean: null,
      marca: null,
      preco: product.preco,
      estoque: product.estoque,
      categoria: category.categorySlug,
      subcategoria: category.subcategorySlug,
      imagem: product.imageUrl || (imageMatch?.item?.nome ? `/uploads/products/${imageMatch.item.nome}` : null),
      semImagem: !hasImage,
      semDescricao: !hasDescription,
      status,
      ativo: product.situacao === "A" && product.estoque > 0 && hasImage,
      origemImagem: product.imageUrl ? "bling_image" : imageMatch?.reason ?? null,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "report-only",
    source: {
      csv: CSV_PATH,
      imageMapping: IMAGE_MAP_PATH,
      imageDirs: BIJOUX_IMAGE_DIRS.filter((dir) => fs.existsSync(dir)),
    },
    totals: {
      totalNaBling: products.length,
      totalImportadoMarketplace: 0,
      totalComImagem: productReport.filter((item) => !item.semImagem).length,
      totalSemImagem: productReport.filter((item) => item.semImagem).length,
      totalComDescricao: 0,
      totalSemDescricao: productReport.length,
      totalPublicado: 0,
      totalPendenteRevisao: attention.length,
      produtosExistentesPreservados: 0,
      produtosAntigosOcultos: 0,
      duplicadosPorSku: duplicates.bySku.length,
      duplicadosPorNome: duplicates.byName.length,
    },
    duplicates,
    attention,
    products: productReport,
  };
}

function writeReport(report) {
  const jsonPath = path.join(REPORT_DIR, "bling-products-report.json");
  const mdPath = path.join(REPORT_DIR, "bling-products-report.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, renderMarkdownReport(report));

  console.log("RAIO-X BLING / KA BIJOUX");
  console.log(JSON.stringify(report.totals, null, 2));
  console.log(`Relatorio JSON: ${jsonPath}`);
  console.log(`Relatorio MD: ${mdPath}`);
}

function pushMap(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function renderMarkdownReport(report) {
  const attentionLines = report.attention
    .slice(0, 180)
    .map((item) => `- ${item.nome} (${item.sku || "sem SKU"}): ${item.issues.join(", ")}`)
    .join("\n");

  const duplicateSkuLines = report.duplicates.bySku
    .slice(0, 80)
    .map((item) => `- SKU ${item.sku}: ${item.items.map((product) => product.nome).join(" | ")}`)
    .join("\n");

  const productsLines = report.products
    .map((item) => `- ${item.nome}; SKU: ${item.sku || "sem SKU"}; preco: R$ ${item.preco.toFixed(2)}; estoque: ${item.estoque}; categoria: ${item.categoria}; imagem: ${item.imagem || "nao"}; status: ${item.status}`)
    .join("\n");

  return `# Raio-X Bling / KA Bijoux

Gerado em: ${report.generatedAt}

## Totais

- Total de produtos na Bling: ${report.totals.totalNaBling}
- Total importado para o marketplace: ${report.totals.totalImportadoMarketplace}
- Total com imagem: ${report.totals.totalComImagem}
- Total sem imagem: ${report.totals.totalSemImagem}
- Total com descricao confiavel: ${report.totals.totalComDescricao}
- Total sem descricao confiavel: ${report.totals.totalSemDescricao}
- Total publicado/ativo: ${report.totals.totalPublicado}
- Total pendente de revisao: ${report.totals.totalPendenteRevisao}
- Produtos existentes preservados: ${report.totals.produtosExistentesPreservados}
- Produtos antigos ocultos: ${report.totals.produtosAntigosOcultos}
- Duplicados por SKU: ${report.totals.duplicadosPorSku}
- Duplicados por nome: ${report.totals.duplicadosPorNome}

## Produtos que precisam de atencao

${attentionLines || "- Nenhum produto pendente."}

## Duplicados por SKU

${duplicateSkuLines || "- Nenhum duplicado por SKU."}

## Lista completa importada

${productsLines}
`;
}

function similarityScore(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  let common = 0;
  for (const token of a) {
    if (b.has(token)) common += 1;
  }
  return common / Math.max(a.size, 3);
}

function tokenize(value) {
  const stopwords = new Set(["de", "da", "do", "das", "dos", "com", "cor", "para", "e", "a", "o", "em", "ml", "g"]);
  return normalizeSearch(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !stopwords.has(token));
}

function slugify(value) {
  return normalizeSearch(value)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSearch(value) {
  return String(value || "")
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
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
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
