const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OVERRIDES = path.join(ROOT, "backend/data/product-content-overrides.json");
const BLING_ROWS = path.join(ROOT, "backend/data/produtos-bling.json");
const PUBLIC_PRODUCTS = path.join(ROOT, "backend/public/uploads/products");
const JSON_REPORT = path.join(ROOT, "reports/product-image-review/mass-local-validation.json");
const CSV_REPORT = path.join(ROOT, "reports/product-image-review/mass-local-validation.csv");
const BASE_URL = process.env.KA_LOCAL_URL || "http://localhost:3000";
const STATIC_SLUG_BY_SKU = new Map([
  ["3104000004747", "anel-peniano-bolinha-cores"],
  ["3104000004742", "anel-peniano-orelha-rosa"],
  ["3104000004741", "anel-peniano-orelha-roxo"],
]);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return normalize(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCell(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function buildSlugIndex() {
  const rows = JSON.parse(fs.readFileSync(BLING_ROWS, "utf8").replace(/^\uFEFF/, ""));
  const used = new Set();
  const byBlingId = new Map();
  const bySku = new Map();
  const byName = new Map();

  for (const row of rows) {
    const id = normalizeCell(row.id);
    const name = normalizeCell(row.nome || row.name || row.descricao || "");
    const sku = normalizeCell(row.codigo || row.sku || row.code || "");
    if (!id || !name) continue;

    const base = slugify(name) || `produto-${id}`;
    let slug = base;
    if (used.has(slug)) slug = `${base}-${id}`;
    used.add(slug);

    byBlingId.set(id, slug);
    if (sku) bySku.set(sku, slug);
    byName.set(normalize(name), slug);
  }

  return { byBlingId, bySku, byName };
}

function containsText(html, value) {
  const text = String(value || "").trim();
  if (!text) return true;
  if (html.includes(text)) return true;
  const probe = text.length > 80 ? text.slice(0, 80) : text;
  return html.includes(probe);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(45000),
  });
  const text = await response.text();
  return { response, text };
}

async function main() {
  const overrides = JSON.parse(fs.readFileSync(OVERRIDES, "utf8"));
  const slugIndex = buildSlugIndex();
  const results = [];

  for (const item of overrides) {
    const slug =
      (item.sku ? STATIC_SLUG_BY_SKU.get(String(item.sku)) : null) ??
      (item.blingId ? slugIndex.byBlingId.get(String(item.blingId)) : null) ??
      (item.sku ? slugIndex.bySku.get(String(item.sku)) : null) ??
      slugIndex.byName.get(normalize(item.name)) ??
      slugify(item.name);
    const productUrl = `${BASE_URL}/produto/${slug}`;
    const imagePath = item.imageFile ? path.join(PUBLIC_PRODUCTS, item.imageFile) : "";
    const imageExists = Boolean(imagePath && fs.existsSync(imagePath));
    const checks = {
      status: false,
      name: false,
      image: false,
      description: false,
      usage: false,
      care: false,
    };
    const errors = [];
    let finalUrl = productUrl;

    try {
      const { response, text } = await fetchText(productUrl);
      finalUrl = response.url || productUrl;
      checks.status = response.ok;
      checks.name = containsText(text, item.displayName);
      checks.image = imageExists && text.includes(item.imageFile);
      checks.description = containsText(text, item.longDescription || item.shortDescription);
      checks.usage = text.includes("Modo de uso") && containsText(text, item.howToUse);
      checks.care = text.includes("Cuidados") && containsText(text, item.careInstructions);

      for (const [key, value] of Object.entries(checks)) {
        if (!value) errors.push(key);
      }
    } catch (error) {
      errors.push(error.message);
    }

    results.push({
      blingId: item.blingId,
      sku: item.sku,
      originalName: item.name,
      displayName: item.displayName,
      slug,
      url: finalUrl,
      imageFile: item.imageFile,
      imageExists,
      checks,
      status: errors.length ? "ERRO" : "OK",
      errors,
    });
    console.log(`${results.length}/${overrides.length} ${errors.length ? "ERRO" : "OK"} ${item.displayName}`);
  }

  const summary = {
    total: results.length,
    ok: results.filter((item) => item.status === "OK").length,
    errors: results.filter((item) => item.status !== "OK").length,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(JSON_REPORT, `${JSON.stringify({ summary, results }, null, 2)}\n`, "utf8");
  const header = ["status", "blingId", "sku", "nomeRevisado", "url", "imagem", "erros"];
  const rows = results.map((item) => [
    item.status,
    item.blingId ?? "",
    item.sku ?? "",
    item.displayName,
    item.url,
    item.imageFile,
    item.errors.join(", "),
  ]);
  fs.writeFileSync(CSV_REPORT, [header, ...rows].map((row) => row.map(csvEscape).join(";")).join("\n"), "utf8");
  console.log(JSON.stringify(summary, null, 2));

  if (summary.errors) process.exitCode = 1;
}

main();
