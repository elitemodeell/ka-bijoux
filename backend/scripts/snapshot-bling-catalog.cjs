const fs = require("node:fs/promises");
const path = require("node:path");
const { setTimeout: pause } = require("node:timers/promises");

const origin = "https://api.bling.com.br/Api/v3";
const output = path.resolve(__dirname, "../../tmp/bling-catalog-snapshot.local.json");

function createReader(token, fetcher = fetch) {
  let lastStartedAt = 0;
  return async function read(endpoint, params = new URLSearchParams()) {
    await pause(Math.max(0, lastStartedAt + 400 - Date.now()));
    lastStartedAt = Date.now();
    const response = await fetcher(`${origin}${endpoint}?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`Bling retornou HTTP ${response.status} em ${endpoint}.`);
    const { data } = await response.json();
    if (!data || typeof data !== "object") throw new Error("Resposta do Bling sem dados.");
    return data;
  };
}

async function collect(read) {
  const products = new Map();
  for (let page = 1; ; page++) {
    const entries = await read("/produtos", new URLSearchParams({ pagina: String(page), limite: "100" }));
    if (!Array.isArray(entries)) throw new Error("Lista de produtos inválida.");
    let added = 0;
    for (const entry of entries) {
      if (!Number.isSafeInteger(entry.id) || entry.id < 1) throw new Error("Produto sem ID válido.");
      if (!products.has(entry.id)) added++;
      products.set(entry.id, entry);
    }
    if (entries.length < 100) break;
    if (!added) throw new Error("Paginação do Bling repetiu uma página completa.");
  }

  for (const product of products.values()) {
    if (product.formato !== "V") continue;
    const detail = await read(`/produtos/${product.id}`);
    if (detail.id !== product.id) throw new Error("Detalhe do Bling retornou outro produto.");
    products.set(product.id, { ...product, ...detail });
    for (const child of detail.variacoes ?? []) {
      if (!Number.isSafeInteger(child.id) || child.id < 1 || child.id === product.id) {
        throw new Error("Variação do Bling sem ID próprio válido.");
      }
      products.set(child.id, { ...products.get(child.id), ...child, idProdutoPai: product.id });
    }
  }

  const ids = [...products.keys()];
  const stock = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const params = new URLSearchParams(ids.slice(offset, offset + 100).map((id) => ["idsProdutos[]", String(id)]));
    const result = await read("/estoques/saldos", params);
    if (!Array.isArray(result)) throw new Error("Lista de saldos inválida.");
    stock.push(...result);
  }

  function withoutMedia({ imagemURL, midia, variacoes, ...commercial }) {
    return Array.isArray(variacoes)
      ? { ...commercial, variacoes: variacoes.map(withoutMedia) }
      : commercial;
  }
  return { capturedAt: new Date().toISOString(), completeCatalog: true, products: [...products.values()].map(withoutMedia), stock };
}

async function writeSnapshot(token) {
  const snapshot = await collect(createReader(token));
  await fs.mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(snapshot, null, 2), { mode: 0o600, flag: "wx" });
  await fs.rename(temporary, output);
  console.log(`Bling: ${snapshot.products.length} produtos e ${snapshot.stock.length} registros de saldo. Arquivo local em ${output}.`);
}

async function main() {
  const token = process.env.BLING_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("BLING_ACCESS_TOKEN não está disponível na sessão autorizada.");
  await writeSnapshot(token);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { collect, createReader, writeSnapshot };
