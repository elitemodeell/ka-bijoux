import { createRequire } from "node:module";
import { expect, it } from "vitest";
import { isBlingHostedPhoto, officialDatabaseGallery } from "@/lib/catalog-photo";

const { approvedOwnPhotoUrls, buildBlingImportWrite, commercialProductUpdate, commercialVariationWrite } =
  createRequire(import.meta.url)("../scripts/bling-commercial-sync.cjs");

const p47 = "cmr6i1pu5001drhf8cvq4gl22";
const ownPhoto = "https://sxohqngzypmxtmuulfoa.supabase.co/storage/v1/object/public/products/7-fone-bluetooth-p47-com-opcoes-de-cores-3104000004296-cores-sortidas.png";
const blingPhoto = "https://orgbling.s3.amazonaws.com/p47.jpg";
const auditedPhoto = "/uploads/products/6-fone-bluetooth-p47-com-opcoes-de-cores-3104000004296-azul.png";

it("keeps stock and description sync from changing any gallery photo", () => {
  const gallery = [{ id: "kept", url: ownPhoto, order: 0 }];
  const write = buildBlingImportWrite({
    existing: { id: p47, images: [...gallery, { url: blingPhoto }, { url: auditedPhoto }] },
    price: 24,
    stock: 3,
    sku: "3104000004296",
    blingActive: true,
    description: "Descricao vinda do Bling",
  });

  expect(write.approved).toEqual([ownPhoto]);
  expect(write.update).toEqual({ price: 24, stock: 3, sku: "3104000004296", importedAt: expect.any(Date) });
  expect(write.update).not.toHaveProperty("images");
  expect(write.update).not.toHaveProperty("imageUrl");
  expect(write.create).not.toHaveProperty("images");
  expect(write.images).toEqual([...gallery, { url: blingPhoto }, { url: auditedPhoto }]);
  expect(commercialProductUpdate({ price: 10, stock: 1, description: "Nova descricao", images: gallery, imageUrl: blingPhoto }))
    .toEqual({ price: 10, stock: 1, description: "Nova descricao" });
  expect(commercialVariationWrite({ sku: "AZUL", stock: 2, imageUrl: blingPhoto, name: "Cor", value: "Azul" }))
    .toEqual({ sku: "AZUL", stock: 2, name: "Cor", value: "Azul" });
});

it("does not deactivate a product that already has a valid KA BIJOUX photo", () => {
  const write = buildBlingImportWrite({
    existing: { id: p47, images: [{ url: ownPhoto }], active: true, publicationStatus: "PUBLISHED" },
    price: 24,
    stock: 8,
    sku: "3104000004296",
    blingActive: true,
    description: "Descricao comercial",
  });
  expect(write.update).not.toHaveProperty("publicationStatus");
  expect(write.update).not.toHaveProperty("active");
  expect(write.update).not.toHaveProperty("images");
  expect(isBlingHostedPhoto(ownPhoto)).toBe(false);
  expect(isBlingHostedPhoto("/uploads/products/capa-aprovada.png")).toBe(false);
  expect(officialDatabaseGallery([ownPhoto, "/uploads/products/capa-aprovada.png"], "outro-produto")).toEqual([
    ownPhoto,
    "/uploads/products/capa-aprovada.png",
  ]);
});

it("does not treat a Bling photo or a visually rejected photo as an approved KA BIJOUX photo", () => {
  expect(isBlingHostedPhoto(blingPhoto)).toBe(true);
  expect(approvedOwnPhotoUrls([{ url: blingPhoto }, { url: auditedPhoto }], p47)).toEqual([]);
  expect(officialDatabaseGallery([ownPhoto, blingPhoto, auditedPhoto], p47)).toEqual([ownPhoto]);
  expect(buildBlingImportWrite({
    existing: { id: p47, images: [{ url: blingPhoto }] },
    price: 24,
    stock: 1,
    sku: "3104000004296",
    blingActive: true,
    description: "pendente",
  }).update).toMatchObject({ publicationStatus: "MISSING_IMAGE", active: false });
});
