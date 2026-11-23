import { describe, expect, it } from "vitest";
import { catalogGalleryForPurchase, catalogPurchaseBlocked, validateCatalogOptions } from "@/lib/catalog-purchase-mode";

const option = { name: "Cor", value: "Preto", sku: "123", imageUrl: "/uploads/products/preto.webp", active: true };

describe("catalog purchase classification", () => {
  it("preserves additional photos for unclassified products and limits only a product in review", () => {
    const images = ["cover.webp", "back.webp"];
    expect(catalogGalleryForPurchase(images, catalogPurchaseBlocked(null, 0))).toEqual(images);
    expect(catalogGalleryForPurchase(images, catalogPurchaseBlocked("REVIEW", 0))).toEqual(["cover.webp"]);
    expect(images).toHaveLength(2);
  });
  it("preserves simple items and reserves a hold for review or contradictory modes", () => {
    expect(catalogPurchaseBlocked(null, 0)).toBe(false);
    expect(catalogPurchaseBlocked("SINGLE", 0)).toBe(false);
    expect(catalogPurchaseBlocked("SINGLE", 1)).toBe(true);
    expect(catalogPurchaseBlocked("OPTIONS", 0)).toBe(true);
    expect(catalogPurchaseBlocked("REVIEW", 1)).toBe(true);
  });

  it("supports distinct options with a confirmed shared SKU and shared balance", () => {
    const options = [option, { ...option, value: "Branco", imageUrl: "/uploads/products/branco.webp" }];
    expect(validateCatalogOptions("OPTIONS", true, options)).toBeNull();
    expect(validateCatalogOptions("OPTIONS", false, options)).toMatch(/estoque compartilhado/);
  });

  it("blocks activation without real identity and preserves incomplete drafts", () => {
    const options = [{ ...option, sku: null, imageUrl: null }];
    expect(validateCatalogOptions("OPTIONS", false, options)).toMatch(/SKU/);
    expect(validateCatalogOptions(null, false, options)).toMatch(/SKU/);
    expect(validateCatalogOptions("REVIEW", false, options)).toBeNull();
  });

  it("allows a clearly named and identified option without assigning an unrelated image", () => {
    expect(validateCatalogOptions("OPTIONS", false, [{ ...option, imageUrl: null }])).toBeNull();
  });
});
