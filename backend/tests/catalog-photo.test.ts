import { getBlingProductBySlug } from "@/lib/bling-catalog";
import sharp from "sharp";
import { expect, it } from "vitest";
import { belongsToCatalogGallery, catalogPhotoPath, isQuarantinedCatalogPhoto, normalizeCatalogPhoto } from "@/lib/catalog-photo";

it("standardizes actual pixels deterministically without cropping the product", async () => {
  const image = (background: string) => sharp({ create: { width: 400, height: 200, channels: 3, background } }).png().toBuffer();
  const original = await image("#00ff00");
  const first = await normalizeCatalogPhoto(original);
  const second = await normalizeCatalogPhoto(original);
  expect(await sharp(first.normalized).metadata()).toMatchObject({ width: 1200, height: 1200, format: "webp" });
  expect(first.fingerprint).toBe(second.fingerprint);
  expect((await normalizeCatalogPhoto(await image("#ff0000"))).fingerprint).not.toBe(first.fingerprint);
  await expect(normalizeCatalogPhoto(Buffer.from("not an image"))).rejects.toThrow("conteúdo da foto");
});

it("uses the owning product when excluding a verified wrong link", () => {
  const file = "/uploads/products/creme-facial-diurno-iqz3q9-02.png";
  expect(isQuarantinedCatalogPhoto(file, "cmr9al49900092np39qiqz3q9")).toBe(true);
  expect(isQuarantinedCatalogPhoto(file, "cmr6i1r72002grhf80yqybagb")).toBe(false);
});

it("rejects cross-product, cross-variant and visually disproved gallery assignments", () => {
  const path = catalogPhotoPath("first", "white", "a".repeat(64));
  const url = `https://store.example/storage/v1/object/public/products/${path}`;
  expect(belongsToCatalogGallery(url, "first", "white")).toBe(true);
  expect(belongsToCatalogGallery(url, "first", "black")).toBe(false);
  expect(belongsToCatalogGallery(url, "second", "white")).toBe(false);
  expect(belongsToCatalogGallery("/uploads/products/inferido-mini-balanca-3104000004300-02.png", "first")).toBe(false);
});

it("keeps the verified P47 fallback and rejects the P9 and cat photos for its gallery", () => {
  const productId = "cmr6i1pu5001drhf8cvq4gl22";
  const correct = "7-fone-bluetooth-p47-com-opcoes-de-cores-3104000004296-cores-sortidas.png";
  const p9 = "6-fone-bluetooth-p47-com-opcoes-de-cores-3104000004296-azul.png";
  const cat = "inferido-fone-bluetooth-p47-3104000004296-03.png";
  expect(getBlingProductBySlug("fone-bluetooth-p47")?.images[0]?.url).toBe(`/uploads/products/${correct}`);
  expect(belongsToCatalogGallery(`/uploads/products/${correct}`, productId)).toBe(true);
  for (const file of [p9, cat]) {
    expect(belongsToCatalogGallery(`/uploads/products/${file}`, productId)).toBe(false);
  }
});
