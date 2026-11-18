import { createRequire } from "node:module";
import { expect, it, vi } from "vitest";

const { collect, createReader } = createRequire(import.meta.url)("../scripts/snapshot-bling-catalog.cjs");
const { compare } = createRequire(import.meta.url)("../scripts/reconcile-bling-catalog.cjs");
const { buildReviewQueue } = createRequire(import.meta.url)("../scripts/bling-catalog-review.cjs");

it("keeps parent and child identities, consults missing images and queries stock by individual ID", async () => {
  const read = vi.fn(async (endpoint: string, _params?: URLSearchParams) => {
    switch (endpoint) {
      case "/produtos": return [{ id: 10, formato: "V" }, { id: 30, formato: "S" }];
      case "/produtos/10": return { id: 10, variacoes: [{ id: 20, codigo: "CHILD", imagemURL: "https://example.test/child.jpg" }] };
      case "/produtos/30": return { id: 30, midia: { imagens: { internas: [] } } };
      case "/estoques/saldos": return [{ produto: { id: 20 }, saldoFisicoTotal: 2 }];
      default: throw new Error("Unexpected endpoint");
    }
  });

  const result = await collect(read);
  expect(result.products).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 20, idProdutoPai: 10, codigo: "CHILD" }),
    expect.objectContaining({ id: 30, midia: { imagens: { internas: [] } } }),
  ]));
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

it("requires the correct parent before linking a variant by SKU and flags repeated images", () => {
  const image = "https://example.test/item.jpg";
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
  expect(report.sharedImages).toEqual([[1, 2]]);
  expect(report.noPhotoEvidence).toEqual([3]);
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
      photoEvidence: "referencia-localizada-requer-conferencia" },
    { blingId: "2", photoEvidence: "ausente-no-snapshot" },
  ]);
});
