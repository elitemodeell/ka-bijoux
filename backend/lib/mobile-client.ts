import type { NextRequest } from "next/server";
import { isAdultCatalogProduct } from "@/lib/product-line";

const CLIENT_PLATFORM_HEADER = "x-ka-client-platform";

export function isIosAppRequest(req: NextRequest) {
  return req.headers.get(CLIENT_PLATFORM_HEADER)?.trim().toLowerCase() === "ios";
}

export function isAdultCatalogSlug(value?: string | null) {
  return value === "sex-shop" || Boolean(value?.startsWith("sex-shop-"));
}

type CatalogProduct = {
  name?: string | null;
  category?: { slug?: string | null; name?: string | null } | null;
  subcategory?: { slug?: string | null; name?: string | null } | null;
};

export function isRestrictedIosProduct(product?: CatalogProduct | null) {
  if (!product) return false;
  return isAdultCatalogProduct({
    name: product.name,
    categorySlug: product.category?.slug,
    categoryName: product.category?.name,
    subcategorySlug: product.subcategory?.slug,
    subcategoryName: product.subcategory?.name,
  });
}
