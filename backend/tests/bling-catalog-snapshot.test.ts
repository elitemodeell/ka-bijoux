import { createRequire } from "node:module";
import { expect, it, vi } from "vitest";

const { collect, createReader } = createRequire(import.meta.url)("../scripts/snapshot-bling-catalog.cjs");
const { compare } = createRequire(import.meta.url)("../scripts/reconcile-bling-catalog.cjs");
const { buildReviewQueue } = createRequire(import.meta.url)("../scripts/bling-catalog-review.cjs");
const { prepareSync, applyInHomologation } = createRequire(import.meta.url)("../scripts/plan-bling-sync.cjs");

it("keeps parent and child identities and queries stock by individual ID without saving ERP media", async () => {
  const read = vi.fn(async (endpoint: string, _params?: URLSearchParams) => {
    switch (endpoint) {
      case "/produtos": return [{ id: 10, formato: "V" }, { id: 30, formato: "S", midia: { imagens: {} } }];
      case "/produtos/10": return { id: 10, variacoes: [{ id: 20, codigo: "CHILD", imagemURL: "https://example.test/child.jpg" }] };
      case "/estoques/saldos": return [{ produto: { id: 20 }, saldoFisicoTotal: 2 }];
      default: throw new Error("Unexpected endpoint");
    }
  });

  const result = await collect(read);
  expect(result.products).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 20, idProdutoPai: 10, codigo: "CHILD" }),
    { id: 30, formato: "S" },
  ]));
  expect(JSON.stringify(result.products)).not.toMatch(/imagemURL|midia|child\.jpg/);
  expect(read).not.toHaveBeenCalledWith("/produtos/30");
  expect(result.stock).toEqual([{ produto: { id: 20 }, saldoFisicoTotal: 2 }]);
  const params = read.mock.calls.at(-1)?.[1];
  expect(params?.getAll("idsProdutos[]").sort()).toEqual(["10", "20", "30"]);
});

it("keeps authentication on the fixed HTTPS origin", async () => {
  const fetcher = vi.fn(async () => Response.json({ data: [] }));
  await createReader("test-token", fetcher)("/produtos");
  expect(fetcher).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/api\.bling\.com\.br\/Api\/v3\/produtos/),
    expect.objectContaining({ redirect: "error", headers: { Authorization: "Bearer test-token", Accept: "application/json" } }));
});

it("requires the correct parent and uses only matched store photos as visual evidence", () => {
  const image = "/uploads/products/item.jpg";
  const report = compare({
    products: [
      { id: 1, nome: "Produto", codigo: "P", imagemURL: image },
      { id: 2, idProdutoPai: 1, nome: "Produto", codigo: "B", imagemURL: image },
      { id: 3, idProdutoPai: 999, nome: "Outro", codigo: "O" },
    ], stock: [],
  }, [
    { id: "parent", blingId: "1", sku: "P", images: [] },
    { id: "child", parentId: "parent", sku: "B", images: [image] },
    { id: "unrelated", sku: "O", images: [image] },
  ]);
  expect(report.candidates.map((row: { localId: string | null }) => row.localId)).toEqual(["parent", "child", null]);
  expect(report.duplicateNames).toEqual([[1, 2]]);
  expect(report.sharedImages).toEqual([]);
  expect(report.noPhotoEvidence).toEqual([1, 3]);
});

it("consolidates the existing audit by Bling ID without treating a photo reference as verified", () => {
  const baseline = {
    duplicates: { byName: [{ items: [{ id: "1" }] }] },
    sharedImages: [{ products: [{ blingId: "1" }] }],
    products: [{ blingId: "1", sku: "P", semImagem: true }, { blingId: "2", semImagem: true }],
  };
  expect(buildReviewQueue(baseline)[0].photoEvidence).toBe("aguardando-snapshot");
  expect(buildReviewQueue(baseline, { candidates: [{ blingId: 1, blingPhotoCount: 1 }] })).toMatchObject([
    { blingId: "1", reasons: ["nome-repetido", "referencia-de-imagem-compartilhada", "imagem-ausente-no-export"],
      photoEvidence: "referencia-nao-localizada" },
    { blingId: "2", photoEvidence: "ausente-no-snapshot" },
  ]);
});

it("never transfers a parent's quantity to child SKUs or associates children to a lookalike model", async () => {
  const child = { id: 3, idProdutoPai: 2, codigo: "MAX-BLACK", preco: 24,
    situacao: "A", variacao: { nome: "Preto" } };
  const catalog = [
    { id: "pro", blingId: "1", sku: "PRO", price: 24, images: [] },
    { id: "max", blingId: "2", sku: "MAX", price: 24, images: [] },
  ];
  const products = [{ id: 1, codigo: "PRO", situacao: "A", nome: "iPhone 11 Pro", formato: "V", preco: 24 },
    { id: 2, codigo: "MAX", situacao: "A", nome: "iPhone 11 Pro Max", formato: "V", preco: 24, estoque: { saldoVirtualTotal: 10 }, variacoes: [child] },
    child];
  const shared = prepareSync({ products, stock: [] }, catalog).records[2];
  expect(shared).toMatchObject({ stock: null, parentId: "max", action: "review-shared-stock" });
  const verified = prepareSync({ products, stock: [{ produto: { id: 3 }, saldoVirtualTotal: 2 }] }, catalog).records[2];
  expect(verified).toMatchObject({ stock: 2, parentId: "max", action: "stage-variation" });
  const localOnly = { id: "local-only", parentId: "max", sku: "NOT-IN-BLING", active: true, images: [] };
  expect(prepareSync({ products, stock: [], completeCatalog: true }, [...catalog, localOnly]).restrictions)
    .toEqual([{ id: "local-only", parentId: "max" }]);
  expect(prepareSync({ products, stock: [] }, [...catalog, localOnly]).restrictions).toEqual([]);
  const standalone = { id: "standalone", sku: "MAX-BLACK", active: true, images: [] };
  const deposits = [{ produto: { id: 3 }, saldoVirtualTotal: 9, depositos: [{ id: 42, saldoVirtual: 2 }, { id: 43, saldoVirtual: 7 }] }];
  expect(prepareSync({ products, stock: deposits, sellableWarehouseIds: [42] }, [...catalog, standalone]).records[2])
    .toMatchObject({ localId: "standalone", action: "update-product", stock: 2, parentId: null });
  const missingDeposit = prepareSync({ products, stock: deposits, sellableWarehouseIds: [99], completeCatalog: true }, [...catalog, standalone]);
  expect(missingDeposit.records[2]).toMatchObject({ action: "retain-until-stock-confirmed", stock: null });
  expect(missingDeposit.restrictions).toEqual([]);
  await expect(applyInHomologation({}, "postgresql://example.test/ka_bijoux_test")).rejects.toThrow("homologação");
});
