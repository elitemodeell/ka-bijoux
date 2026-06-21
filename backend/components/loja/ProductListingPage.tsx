import Link from "next/link";
import { Prisma } from "@prisma/client";
import ProductCard from "@/components/loja/ProductCard";
import { prisma } from "@/lib/prisma";
import {
  CATALOG_CATEGORIES,
  MOCK_PRODUCTS,
  getCategoryBySlug,
  getPublicCategoryName,
} from "@/lib/catalog";
import {
  dedupeProductCards,
  findBlingProductForSource,
  getCanonicalProductSlug,
  getBlingProductCards,
  getProductIdentityKeys,
  type CatalogFilters,
  type ProductCardProduct,
} from "@/lib/bling-catalog";
import {
  getProductCatalogLine,
  matchesCatalogLine,
  type CatalogLine,
} from "@/lib/product-line";

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  title: string;
  description: string;
  basePath: string;
  searchParams?: SearchParams;
  categorySlug?: string;
  subcategorySlug?: string;
  adultNotice?: boolean;
  embedded?: boolean;
  catalogLine?: CatalogLine;
};

const productInclude = {
  category: true,
  subcategory: true,
  images: { orderBy: { order: "asc" as const }, take: 1 },
};

const LISTING_PAGE_SIZE = 20;
const LISTING_DB_LIMIT = 60;

export default async function ProductListingPage({
  title,
  description,
  basePath,
  searchParams = {},
  categorySlug,
  subcategorySlug,
  adultNotice,
  embedded,
  catalogLine: requestedCatalogLine,
}: Props) {
  const selectedPrice = getParam(searchParams.price);
  const sort = getParam(searchParams.sort) ?? "createdAt";
  const promo = getParam(searchParams.promo) === "true";
  const onlyNew = getParam(searchParams.new) === "true";
  const query = getParam(searchParams.q);
  const requestedPage = Math.max(1, Number.parseInt(getParam(searchParams.page) ?? "1", 10) || 1);
  const category = categorySlug ? getCategoryBySlug(categorySlug) : null;
  const catalogLine = requestedCatalogLine ?? (category?.adult || adultNotice ? "adult" : "normal");
  const selectedSubcategory = category?.subcategories?.find((item) => item.slug === subcategorySlug) ?? null;
  const categoryLabel = category ? getPublicCategoryName(category) : "Todos os produtos";
  const currentCategoryLabel = selectedSubcategory ? `${categoryLabel} / ${selectedSubcategory.name}` : categoryLabel;
  const productListKey = `${categorySlug ?? "todos"}-${subcategorySlug ?? "todas"}-${promo ? "promo" : onlyNew ? "new" : "all"}-${sort}-${query ?? ""}-${requestedPage}`;

  const listing = await getLiveProducts({
    categorySlug,
    subcategorySlug,
    selectedPrice,
    sort,
    promo,
    onlyNew,
    query,
    catalogLine,
    page: requestedPage,
  });
  const { products, total, page, totalPages } = listing;
  const visibleCategories = CATALOG_CATEGORIES.filter((item) =>
    catalogLine === "adult" ? item.adult : !item.adult
  );

  return (
    <section className={embedded ? "" : "bg-white pt-28 md:pt-28"}>
      <div className={embedded ? "" : "mx-auto max-w-7xl px-4 pb-16"}>
        {!embedded && (
          <div className="rounded-[28px] bg-gradient-to-br from-pink-50 via-white to-white px-5 py-8 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">KA Bijoux</p>
            <h1 className="mt-2 font-playfair text-4xl font-bold text-gray-950">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-500">{description}</p>
            {adultNotice && (
              <p className="mt-4 inline-flex rounded-full border border-pink-100 bg-white px-4 py-2 text-xs font-semibold text-gray-500">
                Produtos destinados ao público adulto.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 space-y-5">
          <div className="rounded-[24px] border border-pink-100 bg-white/95 p-3 shadow-[0_14px_40px_rgba(236,72,153,0.08)] sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-pink-400">Filtros</p>
                <div className="mt-3 grid grid-cols-3 rounded-2xl bg-pink-50 p-1">
                  <FilterLink
                    href={buildHref(basePath, searchParams, { price: undefined, promo: undefined, new: undefined })}
                    active={!promo && !onlyNew}
                    className="flex min-h-9 items-center justify-center text-center"
                  >
                    Todos
                  </FilterLink>
                  <FilterLink
                    href={buildHref(basePath, searchParams, { promo: "true", price: undefined, new: undefined })}
                    active={promo}
                    className="flex min-h-9 items-center justify-center text-center"
                  >
                    Promoções
                  </FilterLink>
                  <FilterLink
                    href={buildHref(basePath, searchParams, { new: "true", price: undefined, promo: undefined })}
                    active={onlyNew}
                    className="flex min-h-9 items-center justify-center text-center"
                  >
                    Novidades
                  </FilterLink>
                </div>
              </div>

              <details className="group rounded-2xl border border-pink-100 bg-pink-50/55 p-2.5 lg:min-w-[280px]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-pink-500 [&::-webkit-details-marker]:hidden">
                  <span>Trocar categoria</span>
                  <span className="transition-transform duration-200 group-open:rotate-180">v</span>
                </summary>
                <div className="ka-category-drawer mt-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                    <CategoryChip href={buildHref("/produtos", searchParams, { price: undefined })} active={!categorySlug}>
                      Todos
                    </CategoryChip>
                    {visibleCategories.map((item) => (
                      <CategoryChip
                        key={item.slug}
                        href={buildHref(`/categoria/${item.slug}`, searchParams, { price: undefined })}
                        active={categorySlug === item.slug}
                      >
                        {getPublicCategoryName(item)}
                      </CategoryChip>
                    ))}
                  </div>
                </div>
              </details>
            </div>

            <div className="mt-3 rounded-2xl border border-gray-100 bg-white px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-pink-500 px-3.5 py-2 text-xs font-black text-white">
                    Categoria: {currentCategoryLabel}
                  </span>
                  {category && (
                    <Link
                      href={buildHref("/produtos", searchParams, { price: undefined })}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-pink-100 text-xs font-bold text-pink-500 transition-colors hover:bg-pink-50"
                      aria-label="Limpar categoria selecionada"
                    >
                      x
                    </Link>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-600 sm:text-sm">
                  {total > 0 ? `${total} produto(s) encontrados` : "Nenhum produto encontrado"}
                </p>
              </div>

              {category?.subcategories?.length ? (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Refinar em {categoryLabel}</p>
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                    <CategoryChip href={buildHref(`/categoria/${category.slug}`, searchParams, { price: undefined })} active={!subcategorySlug}>
                      Todas
                    </CategoryChip>
                    {category.subcategories.map((subcategory) => (
                      <CategoryChip
                        key={subcategory.slug}
                        href={buildHref(`/categoria/${category.slug}/${subcategory.pathSlug}`, searchParams, { price: undefined })}
                        active={subcategorySlug === subcategory.slug}
                      >
                        {subcategory.name}
                      </CategoryChip>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div>
            {products.length > 0 ? (
              <div key={productListKey} className="grid animate-[kaProductsFade_260ms_ease-out] grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} revealDelay={index * 70} />
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] border border-pink-100 bg-pink-50 px-6 py-16 text-center">
                <p className="font-playfair text-2xl font-bold text-gray-900">Em breve teremos novidades nessa categoria.</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-500">
                  Estamos preparando os produtos reais da KA Bijoux para esta vitrine.
                </p>
                <Link href="/produtos" className="mt-6 inline-flex rounded-full bg-pink-500 px-6 py-3 text-sm font-bold text-white">
                  Ver todos os produtos
                </Link>
              </div>
            )}

            {totalPages > 1 ? (
              <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Paginacao de produtos">
                {page > 1 ? (
                  <Link
                    href={buildHref(basePath, searchParams, { page: String(page - 1) })}
                    className="rounded-full border border-pink-200 bg-white px-4 py-2.5 text-sm font-bold text-pink-600 transition-colors hover:bg-pink-50"
                  >
                    Anterior
                  </Link>
                ) : null}
                <span className="text-sm font-semibold text-gray-600">
                  Pagina {page} de {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={buildHref(basePath, searchParams, { page: String(page + 1) })}
                    className="rounded-full bg-pink-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-pink-600"
                  >
                    Proxima
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes kaProductsFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes kaCategoryDrawer {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        details[open] .ka-category-drawer {
          animation: kaCategoryDrawer 180ms ease-out both;
        }
      `}</style>
    </section>
  );
}

function FilterLink({
  href,
  active,
  children,
  className = "",
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors sm:px-3 sm:py-2 ${
        active ? "bg-pink-500 text-white" : "bg-pink-50 text-pink-500 hover:bg-pink-100"
      } ${className}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function CategoryChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex min-h-9 min-w-0 items-center justify-center rounded-full border px-3 py-1.5 text-center text-xs font-bold leading-tight transition-colors sm:px-4 sm:py-2 ${
        active
          ? "border-pink-500 bg-pink-500 text-white"
          : "border-pink-100 bg-white text-gray-700 hover:bg-pink-50 hover:text-pink-500"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

async function getLiveProducts({
  categorySlug,
  subcategorySlug,
  selectedPrice,
  sort,
  promo,
  onlyNew,
  query,
  catalogLine,
  page,
}: {
  categorySlug?: string;
  subcategorySlug?: string;
  selectedPrice?: string;
  sort: string;
  promo: boolean;
  onlyNew: boolean;
  query?: string;
  catalogLine: CatalogLine;
  page: number;
}) {
  const filters: CatalogFilters = {
    categorySlug,
    subcategorySlug,
    selectedPrice,
    sort,
    promo,
    onlyNew,
    query,
    catalogLine,
  };

  try {
    return await withTimeout(
      (async () => {
        const where: Prisma.ProductWhereInput = { active: true };
        if (categorySlug) where.category = { slug: categorySlug };
        if (subcategorySlug) where.subcategory = { slug: subcategorySlug };
        if (selectedPrice) where.price = { equals: Number(selectedPrice) };
        if (promo) where.promotionalPrice = { not: null };
        if (onlyNew) where.isNew = true;
        if (query) {
          const searchMatches = getSearchMatches(query);
          where.OR = [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            ...searchMatches.categorySlugs.map((slug) => ({ category: { slug } })),
            ...searchMatches.subcategorySlugs.map((slug) => ({ subcategory: { slug } })),
          ];
        }

        const orderBy: Prisma.ProductOrderByWithRelationInput =
          sort === "price_asc" ? { price: "asc" } : sort === "price_desc" ? { price: "desc" } : { createdAt: "desc" };

        const products = await prisma.product.findMany({ where, include: productInclude, orderBy, take: LISTING_DB_LIMIT });
        const dbProducts = products
          .map((product) => mapDbProductToCard(product))
          .filter((product): product is ProductCardProduct => Boolean(product))
          .filter((product) => matchesCatalogLine(toProductLineSource(product), catalogLine));

        return paginateProducts(mergeWithBlingCatalog(dbProducts, filters), page);
      })(),
      1000
    );
  } catch {
    return paginateProducts(getBlingProductCards(filters), page);
  }
}

function mapDbProductToCard(product: Prisma.ProductGetPayload<{ include: typeof productInclude }>): ProductCardProduct | null {
  const bling = findBlingProductForSource({
    blingId: product.blingId,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
  });

  if (bling && (!bling.active || bling.stock <= 0)) return null;

  const dbImages = product.images.map((image) => ({ url: image.url, alt: image.alt ?? product.name }));
  const images = dbImages.length ? dbImages : bling?.images ?? [];
  const priceFromBling = Boolean(bling);
  const promotionalPrice = priceFromBling
    ? null
    : product.promotionalPrice
      ? Number(product.promotionalPrice)
      : null;
  const category = product.category
    ? { name: getPublicCategoryName(product.category), slug: product.category.slug }
    : bling?.category ?? null;
  const subcategory = product.subcategory
    ? { name: product.subcategory.name, slug: product.subcategory.slug }
    : bling?.subcategory ?? null;
  const catalogLine = bling?.catalogLine ?? getProductCatalogLine({
    name: bling?.name ?? product.name,
    categorySlug: category?.slug,
    categoryName: category?.name,
    subcategorySlug: subcategory?.slug,
    subcategoryName: subcategory?.name,
  });

  return {
    id: product.id,
    name: bling?.name ?? product.name,
    slug: getCanonicalProductSlug({
      blingId: bling?.blingId ?? product.blingId,
      sku: bling?.sku ?? product.sku,
      slug: product.slug,
      name: bling?.name ?? product.name,
    }) ?? product.slug,
    description: product.description || bling?.description,
    price: bling?.price ?? Number(product.price),
    promotionalPrice,
    promo: promotionalPrice,
    badge: product.isNew ? "Novo" : product.featured ? "Destaque" : bling?.badge ?? null,
    stock: bling?.stock ?? product.stock,
    sku: bling?.sku ?? product.sku,
    blingId: bling?.blingId ?? product.blingId,
    category,
    subcategory,
    images,
    image: images[0]?.url ?? null,
    sourceOrder: bling?.sourceOrder ?? 100000,
    priceSource: bling ? "BLING" : "DATABASE",
    imageSource: dbImages.length ? "DATABASE" : bling?.imageSource ?? "NONE",
    catalogLine,
    isAdult: catalogLine === "adult",
  } satisfies ProductCardProduct;
}

function mergeWithBlingCatalog(dbProducts: ProductCardProduct[], filters: CatalogFilters) {
  const canonicalDbProducts = dedupeProductCards(dbProducts).filter((product) =>
    matchesCatalogLine(toProductLineSource(product), filters.catalogLine)
  );
  const seen = new Set<string>();
  for (const product of canonicalDbProducts) {
    getProductIdentityKeys(product).forEach((key) => seen.add(key));
  }

  const blingProducts = getBlingProductCards(filters).filter((product) => {
    const keys = getProductIdentityKeys(product);
    return !keys.some((key) => seen.has(key));
  });

  return sortProducts(dedupeProductCards([...canonicalDbProducts, ...blingProducts]), filters.sort).filter((product) =>
    matchesCatalogLine(toProductLineSource(product), filters.catalogLine)
  );
}

function paginateProducts(products: ProductCardProduct[], requestedPage: number) {
  const total = products.length;
  const totalPages = Math.max(1, Math.ceil(total / LISTING_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * LISTING_PAGE_SIZE;

  return {
    products: products.slice(start, start + LISTING_PAGE_SIZE),
    total,
    page,
    totalPages,
  };
}

function toProductLineSource(product: ProductCardProduct) {
  return {
    name: product.name,
    categorySlug: product.category?.slug,
    categoryName: product.category?.name,
    subcategorySlug: product.subcategory?.slug,
    subcategoryName: product.subcategory?.name,
  };
}

function sortProducts(products: ProductCardProduct[], sort?: string | null) {
  if (sort === "price_asc" || sort === "menor-preco") {
    return [...products].sort((a, b) => Number(a.price) - Number(b.price));
  }

  if (sort === "price_desc" || sort === "maior-preco") {
    return [...products].sort((a, b) => Number(b.price) - Number(a.price));
  }

  if (sort === "best_sellers" || sort === "mais-vendidos") {
    return [...products].sort((a, b) => Number(b.stock ?? 0) - Number(a.stock ?? 0));
  }

  return [...products].sort((a, b) => (a.sourceOrder ?? 100000) - (b.sourceOrder ?? 100000));
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

function getMockProducts({
  categorySlug,
  subcategorySlug,
  selectedPrice,
  promo,
  onlyNew,
  query,
}: {
  categorySlug?: string;
  subcategorySlug?: string;
  selectedPrice?: string;
  promo: boolean;
  onlyNew: boolean;
  query?: string;
}) {
  if (promo) return [];

  const searchMatches = getSearchMatches(query);

  return MOCK_PRODUCTS.filter((product) => {
    if (categorySlug && product.category.slug !== categorySlug) return false;
    if (subcategorySlug && product.subcategory?.slug !== subcategorySlug) return false;
    if (selectedPrice && product.price !== Number(selectedPrice)) return false;
    if (onlyNew && product.badge !== "Novo") return false;
    if (query && !matchesProductSearch(product, query, searchMatches)) return false;
    return true;
  });
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearch(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getSearchMatches(query?: string) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return { categorySlugs: [] as string[], subcategorySlugs: [] as string[] };

  const categorySlugs: string[] = [];
  const subcategorySlugs: string[] = [];

  CATALOG_CATEGORIES.forEach((category) => {
    const categoryTerms = [
      category.name,
      category.publicName,
      category.slug,
      category.description,
      category.group,
    ].map(normalizeSearch).filter(Boolean);

    if (categoryTerms.some((term) => term.includes(normalizedQuery) || normalizedQuery.includes(term))) {
      categorySlugs.push(category.slug);
    }

    category.subcategories?.forEach((subcategory) => {
      const subcategoryTerms = [
        subcategory.name,
        subcategory.slug,
        subcategory.pathSlug,
        subcategory.description,
      ].map(normalizeSearch).filter(Boolean);

      if (subcategoryTerms.some((term) => term.includes(normalizedQuery) || normalizedQuery.includes(term))) {
        subcategorySlugs.push(subcategory.slug);
        categorySlugs.push(category.slug);
      }
    });
  });

  return {
    categorySlugs: Array.from(new Set(categorySlugs)),
    subcategorySlugs: Array.from(new Set(subcategorySlugs)),
  };
}

function matchesProductSearch(
  product: (typeof MOCK_PRODUCTS)[number],
  query: string,
  matches = getSearchMatches(query)
) {
  const normalizedQuery = normalizeSearch(query);
  const fields = [
    product.name,
    product.description,
    product.slug,
    product.category.name,
    product.category.slug,
    product.subcategory?.name,
    product.subcategory?.slug,
  ].map(normalizeSearch);

  return (
    fields.some((field) => field.includes(normalizedQuery)) ||
    matches.categorySlugs.includes(product.category.slug) ||
    Boolean(product.subcategory?.slug && matches.subcategorySlugs.includes(product.subcategory.slug))
  );
}

function buildHref(basePath: string, current: SearchParams, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  Object.entries(current).forEach(([key, value]) => {
    const currentValue = getParam(value);
    if (currentValue) params.set(key, currentValue);
  });

  if (!("page" in updates)) params.delete("page");

  Object.entries(updates).forEach(([key, value]) => {
    if (!value) params.delete(key);
    else params.set(key, value);
  });

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
