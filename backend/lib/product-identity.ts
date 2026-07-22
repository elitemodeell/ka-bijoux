import { Prisma } from "@prisma/client";
import {
  findBlingProductForSource,
  getBlingProductBySlug,
} from "@/lib/bling-catalog";

function pushUniqueFilter(
  filters: Prisma.ProductWhereInput[],
  seen: Set<string>,
  key: string,
  value?: string | null
) {
  const normalized = value?.trim();
  if (!normalized) return;
  const identity = `${key}:${normalized}`;
  if (seen.has(identity)) return;
  seen.add(identity);
  filters.push({ [key]: normalized } as Prisma.ProductWhereInput);
}

export function buildProductIdentityFilters(identifier: string) {
  const value = identifier.trim();
  const filters: Prisma.ProductWhereInput[] = [];
  const seen = new Set<string>();
  if (!value) return filters;

  pushUniqueFilter(filters, seen, "id", value);
  pushUniqueFilter(filters, seen, "slug", value);
  pushUniqueFilter(filters, seen, "sku", value);
  pushUniqueFilter(filters, seen, "blingId", value);

  const blingId = value.startsWith("bling-") ? value.slice("bling-".length) : value;
  if (blingId !== value) pushUniqueFilter(filters, seen, "blingId", blingId);

  const blingProduct =
    (value.startsWith("bling-")
      ? findBlingProductForSource({ blingId })
      : getBlingProductBySlug(value)) ??
    findBlingProductForSource({
      blingId,
      sku: value,
      slug: value,
      name: value,
    });

  if (blingProduct) {
    pushUniqueFilter(filters, seen, "blingId", blingProduct.blingId);
    pushUniqueFilter(filters, seen, "sku", blingProduct.sku);
    pushUniqueFilter(filters, seen, "slug", blingProduct.slug);
  }

  return filters;
}
