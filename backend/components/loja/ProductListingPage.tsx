import Link from "next/link";
import { Prisma } from "@prisma/client";
import ProductCard from "@/components/loja/ProductCard";
import { prisma } from "@/lib/prisma";
import { ensureCatalogCategories } from "@/lib/catalog-db";
import {
  CATALOG_CATEGORIES,
  MOCK_PRODUCTS,
  getCategoryBySlug,
  getPublicCategoryName,
} from "@/lib/catalog";

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  title: string;
  description: string;
  basePath: string;
  searchParams?: SearchParams;
  categorySlug?: string;
  subcategorySlug?: string;
  adultNotice?: boolean;
};

const productInclude = {
  category: true,
  subcategory: true,
  images: { orderBy: { order: "asc" as const } },
  variations: { where: { active: true } },
};

export default async function ProductListingPage({
  title,
  description,
  basePath,
  searchParams = {},
  categorySlug,
  subcategorySlug,
  adultNotice,
}: Props) {
  const selectedPrice = getParam(searchParams.price);
  const sort = getParam(searchParams.sort) ?? "createdAt";
  const promo = getParam(searchParams.promo) === "true";
  const onlyNew = getParam(searchParams.new) === "true";
  const query = getParam(searchParams.q);
  const category = categorySlug ? getCategoryBySlug(categorySlug) : null;
  const selectedSubcategory = category?.subcategories?.find((item) => item.slug === subcategorySlug) ?? null;
  const categoryLabel = category ? getPublicCategoryName(category) : "Todos os produtos";
  const currentCategoryLabel = selectedSubcategory ? `${categoryLabel} / ${selectedSubcategory.name}` : categoryLabel;
  const productListKey = `${categorySlug ?? "todos"}-${subcategorySlug ?? "todas"}-${promo ? "promo" : onlyNew ? "new" : "all"}-${sort}-${query ?? ""}`;

  const liveProducts = await getLiveProducts({ categorySlug, subcategorySlug, selectedPrice, sort, promo, onlyNew, query });
  const products = liveProducts.length > 0
    ? liveProducts
    : getMockProducts({ categorySlug, subcategorySlug, selectedPrice, promo, onlyNew, query });

  return (
    <section className="bg-white pt-28 md:pt-28">
      <div className="mx-auto max-w-7xl px-4 pb-16">
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
                    {CATALOG_CATEGORIES.map((item) => (
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
                  {products.length > 0 ? `${products.length} produto(s) encontrados` : "Categoria preparada"}
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
                  A estrutura já está pronta para receber os produtos reais da cliente.
                </p>
                <Link href="/produtos" className="mt-6 inline-flex rounded-full bg-pink-500 px-6 py-3 text-sm font-bold text-white">
                  Ver todos os produtos
                </Link>
              </div>
            )}
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
}: {
  categorySlug?: string;
  subcategorySlug?: string;
  selectedPrice?: string;
  sort: string;
  promo: boolean;
  onlyNew: boolean;
  query?: string;
}) {
  try {
    return await withTimeout(
      (async () => {
        await ensureCatalogCategories(prisma);

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

        const products = await prisma.product.findMany({ where, include: productInclude, orderBy, take: 48 });

        return products.map((product) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: Number(product.price),
          promotionalPrice: product.promotionalPrice ? Number(product.promotionalPrice) : null,
          promo: product.promotionalPrice ? Number(product.promotionalPrice) : null,
          badge: product.isNew ? "Novo" : product.featured ? "Destaque" : null,
          stock: product.stock,
          sku: product.sku,
          category: product.category,
          subcategory: product.subcategory,
          images: product.images.map((image) => ({ url: image.url, alt: image.alt })),
          image: product.images[0]?.url ?? null,
        }));
      })(),
      2500
    );
  } catch {
    return [];
  }
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

  Object.entries(updates).forEach(([key, value]) => {
    if (!value) params.delete(key);
    else params.set(key, value);
  });

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
