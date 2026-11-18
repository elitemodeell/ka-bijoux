const fs = require("node:fs/promises");
const path = require("node:path");

const PROJECT_REF = "sxohqngzypmxtmuulfoa";
const confirmedFamilies = new Map([
  [16669028718, "Modelo"],
  [16670012434, "Cor/modelo"],
]);

const suffix = (parent, child) => {
  const value = child.replace(parent, "").replace(/^\s*[|:-]+\s*/, "").trim();
  if (!value || value === child) throw new Error(`Opção sem valor comprovado: ${child}`);
  return value;
};

async function main() {
  const [evidenceFile, catalogFile, outputFile] = process.argv.slice(2);
  if (!evidenceFile || !catalogFile || !outputFile) throw new Error("Use: compile-verified-variations <evidence.json> <catalog.json> <output.json>");
  const evidence = JSON.parse((await fs.readFile(evidenceFile, "utf8")).replace(/^\uFEFF/, ""));
  const catalog = JSON.parse(await fs.readFile(catalogFile, "utf8"));
  if (evidence.projectRef !== PROJECT_REF || catalog.projectRef !== PROJECT_REF) throw new Error("Projeto divergente da KA BIJOUX.");
  const products = new Map(catalog.products.map((product) => [product.id, product]));
  const images = new Map(catalog.images.map((image) => [image.id, image]));
  const families = evidence.families.filter((family) => confirmedFamilies.has(Number(family.blingId))).map((family) => {
    if (family.options.length < 2) throw new Error(`Família sem múltiplas opções: ${family.name}`);
    const prices = new Set(family.options.map((option) => Number(option.price)));
    if (prices.size !== 1 || family.options.some((option) => !option.sku || !Number.isInteger(option.virtualStock))) {
      throw new Error(`Preço ou estoque não comprovado: ${family.name}`);
    }
    const options = family.options.map((option, order) => {
      const product = products.get(option.productId);
      const photo = images.get(option.shopPhotoIds[0]);
      if (!product || product.sku !== option.sku || String(product.blingId) !== String(option.blingId) || !photo) {
        throw new Error(`Identidade local divergente para ${option.sku}`);
      }
      return { productId: option.productId, blingId: String(option.blingId), sku: option.sku,
        value: suffix(family.name, option.name), price: Number(option.price), stock: option.virtualStock,
        imageUrl: photo.url, order, isDefault: order === 0 };
    });
    return { blingParentId: String(family.blingId), name: family.name,
      canonicalProductId: options[0].productId, variationName: confirmedFamilies.get(Number(family.blingId)),
      price: [...prices][0], options, siblingProductIds: options.slice(1).map((option) => option.productId) };
  });
  const plan = { version: 1, projectRef: PROJECT_REF, source: "verified-store-products-and-read-only-bling",
    rules: { preserveHistoricalProducts: true, preserveSkuPriceStock: true, disableSiblingListingsAfterValidation: true }, families };
  await fs.mkdir(path.dirname(path.resolve(outputFile)), { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(plan, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ families: families.length, variations: families.reduce((sum, family) => sum + family.options.length, 0) }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
