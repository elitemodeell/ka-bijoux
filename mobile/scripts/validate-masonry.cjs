const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const productCard = read("components/product/ProductCard.tsx");
const image = read("components/product/ResilientProductImage.tsx");
const columns = read("components/product/MasonryColumns.tsx");
const home = read("app/(tabs)/index.tsx");
const productListing = read("app/produtos/index.tsx");
const search = read("app/(tabs)/busca.tsx");
const favorites = read("app/favoritos/index.tsx");
const details = read("app/produto/[id].tsx");
const android = read("android/gradle.properties");
const packageJson = JSON.parse(read("package.json"));
const appConfig = JSON.parse(read("app.json")).expo;

assert.equal(packageJson.dependencies["@shopify/flash-list"], "2.3.3");
for (const [name, source] of [["products", productListing], ["search", search], ["favorites", favorites]]) {
  assert.match(source, /<FlashList[\s\S]*?masonry[\s\S]*?numColumns=\{2\}/, `${name} must use a virtualized two-column masonry list`);
}
assert.match(home, /<MasonryColumns[\s\S]*?section\.products/, "Home showcases must use independent masonry columns");
assert.match(details, /<MasonryColumns[\s\S]*?data=\{products\}/, "Related products must use independent masonry columns");
assert.match(columns, /flexDirection: "row"[\s\S]*alignItems: "flex-start"/, "Short showcases must not align product heights");
assert.match(productCard, /contentFit="cover"/, "Card photos must fill their natural-ratio image area");
assert.match(productCard, /onImageDimensions=\{updateImageDimensions\}/, "Photo dimensions must determine the card's natural ratio");
assert.match(productCard, /styles\.priceRow[\s\S]*styles\.floatingCart/, "Circular add-to-cart action must sit beside the price");
assert.match(productCard, /color: Colors\.primary/, "Card prices must use the KA Bijoux pink accent");
assert.ok(!productCard.includes("addButtonText") && !productCard.includes("Comprar agora"), "Product cards must not show the wide buy CTA");
assert.match(image, /cachePolicy="memory-disk"/, "Product photos must use the native image cache");
assert.match(android, /newArchEnabled=true/, "FlashList v2 requires the app's enabled new architecture");
assert.equal(appConfig.newArchEnabled, true, "New architecture must be explicit for both iOS and Android builds");
assert.equal(appConfig.android.versionCode, 13, "Android versionCode must advance beyond the latest EAS build (12)");

console.log("Mobile masonry: vitrines virtuais, proporções naturais, favoritos e ação compacta aprovados.");
