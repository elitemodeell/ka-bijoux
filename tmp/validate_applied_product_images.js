const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REVIEW_DIR = path.join(ROOT, "reports", "product-image-review");
const UPLOADS = path.join(ROOT, "backend", "public", "uploads", "products");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

const applied = fs
  .readFileSync(path.join(REVIEW_DIR, "applied-platform-images.csv"), "utf8")
  .replace(/^\uFEFF/, "")
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => {
    const parts = line.split(";");
    return {
      imageId: parts[0],
      finalFileName: parts[3],
      blingId: parts[5],
      sku: parts[6],
      productName: parts[7],
    };
  });

const mapping = readJson(path.join(ROOT, "backend", "data", "mapeamento-imagens-produtos.json"));
const imageFiles = new Set(readJson(path.join(ROOT, "backend", "data", "bling-image-files.json")).map(String));

const results = applied.map((row) => {
  const match = mapping.find((item) => {
    const idMatches = row.blingId && String(item.id || "") === String(row.blingId);
    const skuMatches = row.sku && String(item.sku || "") === String(row.sku);
    return idMatches || skuMatches;
  });
  const fileExists = fs.existsSync(path.join(UPLOADS, row.finalFileName));
  const listed = imageFiles.has(row.finalFileName);
  const mappedToExpected = match && match.nome === row.finalFileName;
  return {
    ...row,
    fileExists,
    listedInBlingImageFiles: listed,
    mappedToExpected,
    mappingName: match?.nome || "",
    status: fileExists && listed && mappedToExpected ? "OK" : "ERRO",
  };
});

const summary = {
  validatedAt: new Date().toISOString(),
  total: results.length,
  ok: results.filter((row) => row.status === "OK").length,
  errors: results.filter((row) => row.status !== "OK").length,
  errorsList: results.filter((row) => row.status !== "OK"),
};

writeJson(path.join(REVIEW_DIR, "platform-image-validation.json"), { summary, results });
console.log(JSON.stringify(summary, null, 2));
