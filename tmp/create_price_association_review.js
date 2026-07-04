const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REVIEW_DIR = path.join(ROOT, "reports", "product-image-review");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(file, rows, headers) {
  const lines = [
    headers.join(";"),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(";")),
  ];
  fs.writeFileSync(file, "\uFEFF" + lines.join("\n"), "utf8");
}

const inventory = readJson(path.join(REVIEW_DIR, "downloads-image-inventory.json"));
const queue = readJson(path.join(ROOT, "reports", "image-generation-queue.json"));

const rows = inventory.map((img, index) => {
  const q = queue[index] || {};
  return {
    imageId: img.id,
    sourceFilename: img.name,
    blingId: q.productId || "",
    sku: q.sku || "",
    productName: q.productName || "",
    category: q.categoryName || q.category || "",
    subcategory: q.subcategoryName || q.subcategory || "",
    color: q.color || "",
    flavor: q.flavor || "",
    price: q.price ?? "",
    stock: q.stock ?? "",
    desiredFileName: q.desiredFileName || "",
    queueStatus: q.status || "",
    matchStatus: "DUVIDA_ORDEM_NAO_CONFIRMADA",
    action: "NAO_APLICAR_SEM_CONFIRMACAO_VISUAL",
  };
});

const headers = [
  "imageId",
  "sourceFilename",
  "blingId",
  "sku",
  "productName",
  "category",
  "subcategory",
  "color",
  "flavor",
  "price",
  "stock",
  "desiredFileName",
  "queueStatus",
  "matchStatus",
  "action",
];

writeCsv(path.join(REVIEW_DIR, "bling-price-association-candidates.csv"), rows, headers);
writeCsv(path.join(REVIEW_DIR, "test-5-bling-price-candidates.csv"), rows.slice(0, 5), headers);

console.log(`created=${path.join(REVIEW_DIR, "bling-price-association-candidates.csv")}`);
console.log(`created=${path.join(REVIEW_DIR, "test-5-bling-price-candidates.csv")}`);
