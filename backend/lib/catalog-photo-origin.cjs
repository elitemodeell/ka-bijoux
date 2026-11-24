const productionStorage = "https://sxohqngzypmxtmuulfoa.supabase.co";
const storefront = "https://kabijoux.com.br";

/** @param {string} url */
function isKaCatalogAsset(url) {
  if (url !== url.trim() || url.includes("\\") || url.startsWith("//")) return false;
  try {
    const parsed = new URL(url, storefront);
    if (parsed.username || parsed.password) return false;
    if (parsed.origin === storefront && (url.startsWith("/") || url.startsWith("https://"))) {
      return parsed.pathname.startsWith("/uploads/products/") || parsed.pathname.startsWith("/imagens/");
    }
    const configured = process.env.SUPABASE_URL;
    const storageOrigin = configured ? new URL(configured).origin : productionStorage;
    return (parsed.origin === productionStorage || parsed.origin === storageOrigin) &&
      parsed.pathname.startsWith("/storage/v1/object/public/products/");
  } catch {
    return false;
  }
}

module.exports = { isKaCatalogAsset };
