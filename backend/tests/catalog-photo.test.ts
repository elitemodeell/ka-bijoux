import { getBlingProductBySlug } from "@/lib/bling-catalog";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { expect, it } from "vitest";
import { belongsToCatalogGallery, catalogPhotoPath, isQuarantinedCatalogPhoto, normalizeCatalogPhoto, officialDatabaseGallery } from "@/lib/catalog-photo";

it("excludes miscategorizations without suppressing the photo on its own SKU", () => {
  const humidifierGallery = ["milky", "silky", "stepper", "twister", "wavy"].map((model) => `/uploads/products/egg-${model}.png`);
  expect(officialDatabaseGallery(humidifierGallery, "cmr6kdeh6000j76siv8kly4tu", "3104000000627")).toEqual([]);
  const pointed = "/uploads/products/mini-bullet-rosa-ponta-fina.png";
  const rounded = "/uploads/products/mini-bullet-duplo-rosa.png";
  expect(officialDatabaseGallery([pointed, rounded], "cmr6dj6ry002d13u7lpq4ytz5", "3104000004760")).toEqual([pointed]);
  expect(officialDatabaseGallery([rounded], "cmr6dj741002j13u7epq3c6pc", "3104000004759")).toEqual([rounded]);
});

it("excludes a legacy photo that explicitly names a different commercial SKU", () => {
  const wrong = "/uploads/products/modelo-3104000004949.jpg";
  const correct = "/uploads/products/modelo-3104000004955.jpg";
  const unmarked = "/uploads/products/foto-oficial.jpg";
  expect(officialDatabaseGallery([wrong, correct, unmarked], "product", "3104000004955"))
    .toEqual([correct, unmarked]);
});

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

it("uses only the database gallery for a registered product and drops corrected audit photos", () => {
  const p47 = "cmr6i1pu5001drhf8cvq4gl22";
  const correct = "https://sxohqngzypmxtmuulfoa.supabase.co/storage/v1/object/public/products/7-fone-bluetooth-p47-com-opcoes-de-cores-3104000004296-cores-sortidas.png";
  const p9 = "/uploads/products/6-fone-bluetooth-p47-com-opcoes-de-cores-3104000004296-azul.png";
  const cat = "/uploads/products/inferido-fone-bluetooth-p47-3104000004296-03.png";
  expect(officialDatabaseGallery([correct, p9, cat], p47)).toEqual([correct]);
  expect(officialDatabaseGallery([p9, cat], p47)).toEqual([]);

  const otherCases = [
    ["cmr6i1ow1000mrhf80kamcis2", "inferido-mini-robo-aspirador-branco-3104000005812-04.png"],
    ["cmr6i1z26008mrhf80h2fro4g", "oleo-hidratante-de-cuticula-2fro4g-03.png"],
    ["cmr9al49900092np39qiqz3q9", "creme-facial-diurno-iqz3q9-02.png"],
  ] as const;
  for (const [productId, file] of otherCases) {
    const kept = `https://sxohqngzypmxtmuulfoa.supabase.co/storage/v1/object/public/products/capa-${productId}.png`;
    expect(officialDatabaseGallery([kept, `/uploads/products/${file}`], productId)).toEqual([kept]);
  }

  const page = fs.readFileSync(path.resolve(process.cwd(), "app/(loja)/produto/[slug]/page.tsx"), "utf8");
  const databaseBranch = page.slice(page.indexOf("if (dbProduct)"), page.indexOf("if (blingProduct)"));
  expect(databaseBranch).toContain("officialDatabaseGallery");
  expect(databaseBranch).not.toContain("getOverrideGalleryImages");
});
