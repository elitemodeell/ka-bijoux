import sharp from "sharp";
import { createHash } from "node:crypto";
import quarantinedPhotos from "@/data/catalog-photo-quarantine.json";
import quarantinedLinks from "@/data/catalog-photo-link-quarantine.json";
import type { Prisma } from "@prisma/client";
import { blingCommercialEnforced } from "@/lib/catalog-purchase-mode";
export { isKaCatalogAsset } from "./catalog-photo-origin.cjs";

const allowedFormats = new Set(["jpeg", "png", "webp"]);
const targetSize = 1200;
const managedPrefix = "/storage/v1/object/public/products/catalog/";
const safeId = /^[A-Za-z0-9_-]{1,128}$/;
const quarantine = new Set(quarantinedPhotos);
const byProduct: Readonly<Record<string, readonly string[]>> = quarantinedLinks;
export const visibleCatalogPhotos: Prisma.ProductImageWhereInput = {
  ...(blingCommercialEnforced() ? { approvedForPublication: true } : {}),
  NOT: [
    { url: { contains: "://bling.com.br", mode: "insensitive" } },
    { url: { contains: ".bling.com.br/", mode: "insensitive" } },
    { url: { contains: "://orgbling.", mode: "insensitive" } },
    { url: { contains: "orgbling.s3", mode: "insensitive" } },
    ...quarantinedPhotos.map((file) => ({ url: { endsWith: `/${file}` } })),
    ...Object.entries(byProduct).flatMap(([productId, files]) =>
      files.map((file) => ({ productId, url: { endsWith: `/${file}` } }))),
  ],
};

export function isBlingHostedPhoto(url: string) {
  try {
    const host = new URL(url, "https://catalog.invalid").hostname.toLowerCase();
    return host === "bling.com.br" || host.endsWith(".bling.com.br") || host.includes("orgbling");
  } catch {
    return false;
  }
}

export function isQuarantinedCatalogPhoto(url: string, productId?: string) {
  try {
    const pathname = new URL(url, "https://catalog.invalid").pathname;
    const file = decodeURIComponent(pathname.split("/").at(-1) ?? "").toLowerCase();
    return quarantine.has(file) || Boolean(productId && byProduct[productId]?.includes(file));
  } catch {
    return false;
  }
}

export function isOfficialCatalogPhoto(url: string, productId: string, sku?: string | null, variationId?: string | null) {
  if (!url || !belongsToCatalogGallery(url, productId, variationId)) return false;
  if (!sku || !/^310400\d{7}$/.test(sku)) return true;
  const filename = new URL(url, "https://catalog.invalid").pathname.split("/").at(-1) ?? "";
  const declaredSku = filename.match(/(?:^|[^\d])(310400\d{7})(?!\d)/)?.[1];
  return !declaredSku || declaredSku === sku;
}

export function officialDatabaseGallery(urls: readonly string[], productId: string, sku?: string | null) {
  return urls.filter((url) => isOfficialCatalogPhoto(url, productId, sku));
}

export function catalogCartPhoto(
  selection: string | null | undefined,
  product: { id: string; sku?: string | null; images: readonly { url: string }[] },
  variation?: { id: string; sku?: string | null; imageUrl?: string | null } | null,
) {
  const urls = variation ? [variation.imageUrl] : product.images.map(({ url }) => url);
  return urls.find((url) => url && (!selection || url === selection) &&
    isOfficialCatalogPhoto(url, product.id, variation ? variation.sku : product.sku, variation?.id)) ?? null;
}

export class CatalogPhotoError extends Error {}

export async function normalizeCatalogPhoto(bytes: Buffer) {
  try {
    const image = sharp(bytes, { limitInputPixels: 25_000_000, failOn: "error" });
    const metadata = await image.metadata();
    if (!metadata.format || !allowedFormats.has(metadata.format) || (metadata.pages ?? 1) !== 1) {
      throw new CatalogPhotoError("Envie uma foto estática em JPEG, PNG ou WebP.");
    }
    if (!metadata.width || !metadata.height || Math.min(metadata.width, metadata.height) < 200) {
      throw new CatalogPhotoError("A foto precisa ter pelo menos 200 pixels em cada lado.");
    }
    const pixels = await image.autoOrient()
      .flatten({ background: "#ffffff" })
      .resize(targetSize, targetSize, { fit: "inside", withoutEnlargement: true })
      .toColourspace("srgb")
      .raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = pixels.info;
    const x = targetSize - width;
    const y = targetSize - height;
    const normalized = await sharp(pixels.data, { raw: { width, height, channels } })
      .extend({ left: Math.floor(x / 2), right: Math.ceil(x / 2), top: Math.floor(y / 2), bottom: Math.ceil(y / 2), background: "#ffffff" })
      .webp({ quality: 86 })
      .toBuffer();
    const fingerprint = createHash("sha256").update(normalized).digest("hex");
    return { normalized, fingerprint };
  } catch (error) {
    if (error instanceof CatalogPhotoError) throw error;
    throw new CatalogPhotoError("Não foi possível ler o conteúdo da foto.");
  }
}

export function catalogPhotoPath(productId: string | null, variationId: string | null, fingerprint: string) {
  if ((productId && !safeId.test(productId)) ||
      (variationId && (!productId || !safeId.test(variationId))) ||
      !/^[a-f\d]{64}$/.test(fingerprint)) {
    throw new CatalogPhotoError("Destino da foto inválido.");
  }
  const scope = productId ? `products/${productId}` : "drafts";
  const gallery = variationId ? `variations/${variationId}` : "gallery";
  return `catalog/${scope}/${gallery}/${fingerprint}.webp`;
}

export function belongsToCatalogGallery(url: string, productId: string, variationId?: string | null) {
  let pathname: string;
  try {
    const parsed = new URL(url, "https://catalog.invalid");
    if (!["https:", "http:"].includes(parsed.protocol) || isBlingHostedPhoto(url) || isQuarantinedCatalogPhoto(url, productId)) return false;
    pathname = parsed.pathname;
  } catch {
    return false;
  }
  if (!pathname.startsWith(managedPrefix)) return true;
  const relative = pathname.slice(managedPrefix.length);
  if (relative.startsWith("drafts/gallery/")) return !variationId;
  const expected = variationId && `products/${productId}/variations/${variationId}/`;
  return relative.startsWith(`products/${productId}/gallery/`) ||
    Boolean(expected && relative.startsWith(expected));
}
