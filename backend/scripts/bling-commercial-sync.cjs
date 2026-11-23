const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(__dirname, "../data");
const quarantinedPhotos = new Set(JSON.parse(fs.readFileSync(path.join(dataDir, "catalog-photo-quarantine.json"), "utf8")));
const quarantinedLinks = JSON.parse(fs.readFileSync(path.join(dataDir, "catalog-photo-link-quarantine.json"), "utf8"));
const productFields = ["price", "stock", "sku", "blingId", "description", "importedAt", "active", "publicationStatus", "enrichmentStatus"];
const variationFields = ["name", "value", "sku", "stock", "priceModifier", "active"];

function isBlingHostedPhoto(url) {
  try {
    const host = new URL(url, "https://catalog.invalid").hostname.toLowerCase();
    return host === "bling.com.br" || host.endsWith(".bling.com.br") || host.includes("orgbling");
  } catch {
    return false;
  }
}

function isQuarantinedOwnPhoto(url, productId) {
  try {
    const file = decodeURIComponent(new URL(url, "https://catalog.invalid").pathname.split("/").at(-1) ?? "").toLowerCase();
    return quarantinedPhotos.has(file) || Boolean(productId && quarantinedLinks[productId]?.includes(file));
  } catch {
    return false;
  }
}

function approvedOwnPhotoUrls(images, productId) {
  return (images ?? [])
    .map((image) => (typeof image === "string" ? image : image?.url))
    .filter((url) => Boolean(url) && !isBlingHostedPhoto(url) && !isQuarantinedOwnPhoto(url, productId));
}

function pick(fields, source) {
  const data = {};
  for (const field of fields) {
    if (source[field] !== undefined) data[field] = source[field];
  }
  return data;
}

function commercialProductUpdate(source) {
  return pick(productFields, source ?? {});
}

function commercialVariationWrite(source) {
  return pick(variationFields, source ?? {});
}

function buildBlingImportWrite({ existing, price, stock, sku, blingActive, description }) {
  const images = existing?.images ?? [];
  const approved = approvedOwnPhotoUrls(images, existing?.id);
  const update = commercialProductUpdate({
    price,
    stock,
    sku: sku || undefined,
    importedAt: new Date(),
    ...(blingActive ? {} : { active: false }),
    ...(approved.length ? {} : { publicationStatus: "MISSING_IMAGE", active: false }),
  });
  if (approved.length && (update.publicationStatus === "MISSING_IMAGE" || (update.active === false && blingActive))) {
    throw new Error("Produto com foto própria válida não pode ser desativado por falta de imagem.");
  }
  const create = commercialProductUpdate({
    price,
    stock,
    sku,
    description,
    active: false,
    publicationStatus: "MISSING_IMAGE",
  });
  return { approved, update, create, images };
}

module.exports = {
  approvedOwnPhotoUrls,
  buildBlingImportWrite,
  commercialProductUpdate,
  commercialVariationWrite,
  isBlingHostedPhoto,
};
