// Products reported with potentially different items in the same gallery.
// Remove a hold after the KA Bijoux team approves the corrected catalog entry.
const pendingReview = new Set(["3104000000421", "3104000000178", "3104000003603"]);

export const catalogPurchaseReviewMessage = "Compra temporariamente indisponível. Estamos verificando as opções deste produto.";

export function requiresCatalogPurchaseReview(sku: string | null | undefined) {
  return Boolean(sku && pendingReview.has(sku));
}
