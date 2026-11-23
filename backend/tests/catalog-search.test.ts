import { describe, expect, it } from "vitest";
import { catalogSearchAlternatives } from "@/lib/catalog-search";

describe("catalog search", () => {
  it("recognizes wireless headphone terms while retaining the product type", () => {
    const clauses = catalogSearchAlternatives("fones de ouvido sem fio");
    const combined = clauses.at(-1)?.AND;
    expect(combined).toMatchObject([
      { OR: expect.arrayContaining([{ name: { startsWith: "fone ", mode: "insensitive" } }]) },
      { OR: expect.arrayContaining([{ name: { contains: "bluetooth", mode: "insensitive" } }]) },
    ]);
  });

  it("requires both a remote and an air-conditioner term for air-conditioner searches", () => {
    const clauses = catalogSearchAlternatives("controles de ar-condicionado");
    expect(clauses.at(-1)?.AND).toMatchObject([
      { OR: expect.arrayContaining([{ name: { startsWith: "controle ", mode: "insensitive" } }]) },
      { OR: expect.arrayContaining([{ name: { contains: "ar condic", mode: "insensitive" } }]) },
    ]);
  });

  it("normalizes accented queries for slug matching", () => {
    expect(catalogSearchAlternatives("Óculos")).toContainEqual({
      slug: { contains: "oculos", mode: "insensitive" },
    });
  });
});
