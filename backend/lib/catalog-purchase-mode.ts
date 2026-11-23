import { catalogOptionMatrix } from "@shared/catalog-options";

export const catalogPurchaseModes = ["SINGLE", "OPTIONS", "REVIEW"] as const;

export const catalogReviewMessage = "Este produto está em revisão e ainda não pode ser comprado.";

export function catalogPurchaseBlocked(mode: string | null | undefined, optionCount: number) {
  return mode === "REVIEW" || (mode === "OPTIONS" && optionCount === 0) ||
    (mode === "SINGLE" && optionCount > 0);
}

export function catalogGalleryForPurchase<T>(images: T[], purchaseReviewRequired: boolean): T[] {
  return purchaseReviewRequired ? images.slice(0, 1) : images;
}

export function validateCatalogOptions(
  mode: string | null | undefined,
  sharedStock: boolean,
  options: readonly { active: boolean; name: string; value: string; sku?: string | null; imageUrl?: string | null }[],
) {
  const active = options.filter((option) => option.active);
  if (catalogPurchaseBlocked(mode, active.length) && mode !== "REVIEW") {
    return "O modo de compra precisa corresponder às opções ativas.";
  }
  if (mode === "REVIEW" || active.length === 0) return null;
  if (active.some(({ name }) => /\s+\+\s+/.test(name)) && !catalogOptionMatrix(active, (option) => option)) {
    return "Use os mesmos atributos na mesma ordem em todas as opções e cadastre uma única linha por combinação.";
  }
  const names = new Set<string>();
  const skus = new Set<string>();
  for (const option of active) {
    const name = `${option.name.trim()}:${option.value.trim()}`.toLowerCase();
    const sku = option.sku?.trim().toUpperCase();
    if (!sku || !option.name.trim() || !option.value.trim()) {
      return "Cada opção ativa precisa de identificação e SKU.";
    }
    if (names.has(name)) return "Dê uma identificação diferente a cada opção.";
    if (skus.has(sku) && !sharedStock) return "Opções com o mesmo SKU exigem estoque compartilhado.";
    names.add(name);
    skus.add(sku);
  }
  return null;
}
