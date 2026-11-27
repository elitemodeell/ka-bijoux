import { describe, expect, it } from "vitest";
import { catalogSearchAlternatives } from "@/lib/catalog-search";

describe("catalog search", () => {
  it("recognizes wireless headphone terms while retaining the product type", () => {
    const clauses = catalogSearchAlternatives("fones de ouvido sem fio");
    const combined = clauses.at(-1)?.AND;
    expect(combined).toMatchObject([
      { OR: expect.arrayContaining([{ name: { contains: "fone", mode: "insensitive" } }]) },
      { OR: expect.arrayContaining([{ name: { contains: "bluetooth", mode: "insensitive" } }]) },
    ]);
  });

  it("requires both a remote and an air-conditioner term for air-conditioner searches", () => {
    const clauses = catalogSearchAlternatives("controles de ar-condicionado");
    expect(clauses.at(-1)?.AND).toMatchObject([
      { OR: expect.arrayContaining([{ name: { contains: "controle", mode: "insensitive" } }]) },
      { OR: expect.arrayContaining([{ name: { contains: "ar condic", mode: "insensitive" } }]) },
    ]);
  });

  it("understands AC as ar condicionado without weakening the product-type match", () => {
    const combined = catalogSearchAlternatives("controle AC").at(-1)?.AND;
    expect(combined).toMatchObject([
      { OR: expect.arrayContaining([{ name: { contains: "controle", mode: "insensitive" } }]) },
      { OR: expect.arrayContaining([{ name: { contains: "ar condicionado", mode: "insensitive" } }]) },
    ]);
  });

  it("uses bounded prefix matches for short category suggestions", () => {
    const serialized = JSON.stringify(catalogSearchAlternatives("cap"));
    expect(serialized).toContain('"startsWith":"capinha"');
    expect(serialized).toContain('"startsWith":"capa"');
    expect(serialized).not.toContain('"contains":"cap"');
  });

  it("keeps short SKU searches exact while supporting name prefixes", () => {
    const serialized = JSON.stringify(catalogSearchAlternatives("P47"));
    expect(serialized).toContain('"sku":{"equals":"p47"');
  });

  it("matches unaccented Portuguese queries to accented catalog names", () => {
    const serialized = JSON.stringify(catalogSearchAlternatives("coracao"));
    expect(serialized).toContain("cora\u00e7\u00e3o");
  });

  it("corrects common typing errors before querying", () => {
    const serialized = JSON.stringify(catalogSearchAlternatives("carregdor"));
    expect(serialized).toContain("carregador");
  });

  it("normalizes accented queries for slug matching", () => {
    expect(catalogSearchAlternatives("\u00d3culos")).toContainEqual({
      slug: { contains: "oculos", mode: "insensitive" },
    });
  });
});
