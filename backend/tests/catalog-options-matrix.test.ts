import { describe, expect, it } from "vitest";
import { catalogAttributeChoices, catalogOptionLabel, catalogOptionMatrix, chooseCatalogAttribute, resolveCatalogCombination } from "@shared/catalog-options";
import { validateCatalogOptions } from "@/lib/catalog-purchase-mode";

const options = [
  { id: "black-p", name: "Cor + Tamanho", value: "Preto / P", sku: "fixture-black-p", active: true, stock: 2, imageUrl: "/black.webp" },
  { id: "black-g", name: "Cor + Tamanho", value: "PRETO / G", sku: "fixture-black-g", active: true, stock: 1, imageUrl: "/black.webp" },
  { id: "pink-p", name: "Cor + Tamanho", value: "Rosa / P", sku: "fixture-pink-p", active: true, stock: 3, imageUrl: "/pink.webp" },
  { id: "red-p", name: "Cor + Tamanho", value: "Vermelho / P", sku: "fixture-red-p", active: true, stock: 0, imageUrl: null },
];

describe("catalog combination selection", () => {
  it("waits for every required attribute and never substitutes an absent combination", () => {
    const matrix = catalogOptionMatrix(options, (option) => option)!;
    const partial = chooseCatalogAttribute(matrix, [], 0, "Preto");
    expect(resolveCatalogCombination(matrix, partial)).toBeNull();
    const black = chooseCatalogAttribute(matrix, partial, 1, "G");
    expect(resolveCatalogCombination(matrix, black)?.sku).toBe("fixture-black-g");
    const pink = chooseCatalogAttribute(matrix, black, 0, "Rosa");
    expect(pink).toEqual(["Rosa", null]);
    expect(resolveCatalogCombination(matrix, pink)).toBeNull();
    expect(resolveCatalogCombination(matrix, chooseCatalogAttribute(matrix, pink, 1, "P"))?.imageUrl).toBe("/pink.webp");
  });

  it("offers a thumbnail only when every option for a value shares it", () => {
    const matrix = catalogOptionMatrix(options, (option) => option)!;
    expect(catalogAttributeChoices(matrix, 0, (option) => option.stock > 0, (option) => option.imageUrl)).toEqual([
      { value: "Preto", available: true, photo: "/black.webp" },
      { value: "Rosa", available: true, photo: "/pink.webp" },
      { value: "Vermelho", available: false, photo: null },
    ]);
    expect(catalogAttributeChoices(matrix, 1, (option) => option.stock > 0, (option) => option.imageUrl)[0].photo).toBeNull();
  });

  it("validates rows at admin save and keeps each pair recognizable on the order", () => {
    expect(validateCatalogOptions("OPTIONS", false, options)).toBeNull();
    expect(validateCatalogOptions("OPTIONS", false, [...options, { ...options[0], sku: "duplicate" }])).toMatch(/combinação/);
    expect(validateCatalogOptions("OPTIONS", false, [{ ...options[0], value: "Preto" }])).toMatch(/combinação/);
    expect(catalogOptionLabel("Cor + Tamanho", "Preto / G")).toBe("Cor: Preto · Tamanho: G");
    expect(catalogOptionLabel("Tamanho", "38/41")).toBe("Tamanho: 38/41");
  });
});
