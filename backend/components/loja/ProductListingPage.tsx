import Link from "next/link";
import { Prisma } from "@prisma/client";
import ProductCard from "@/components/loja/ProductCard";
import { prisma } from "@/lib/prisma";
import { ensureCatalogCategories } from "@/lib/catalog-db";
import {
  CATALOG_CATEGORIES,
  MOCK_PRODUCTS,
  PRICE_PRESETS,
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
  const query = getParam(searchParams.q);
  const category = categorySlug ? getCategoryBySlug(categorySlug) : null;

  const liveProducts = await getLiveProducts({ categorySlug, subcategorySlug, selectedPrice, sort, promo, query });
  const products = liveProducts.length > 0
    ? liveProducts
    : getMockProducts({ categorySlug, subcategorySlug, selectedPrice, promo, query });

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

        <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-4">
            <FilterPanel title="Preços únicos">
              <FilterLink href={buildHref(basePath, searchParams, { price: undefined, promo: undefined })} active={!selectedPrice && !promo}>
                Todos
              </FilterLink>
              {PRICE_PRESETS.map((price) => (
                <FilterLink key={price} href={buildHref(basePath, searchParams, { price: String(price), promo: undefined })} active={selectedPrice === String(price)}>
                  R${price}
                </FilterLink>
              ))}
              <FilterLink href={buildHref(basePath, searchParams, { promo: "true", price: undefined })} active={promo}>
                Promoções
              </FilterLink>
            </FilterPanel>

            {category?.subcategories?.length ? (
              <FilterPanel title="Subcategorias">
                <FilterLink href={`/categoria/${category.slug}`} active={!subcategorySlug}>
                  Todas
                </FilterLink>
                {category.subcategories.map((subcategory) => (
                  <FilterLink
                    key={subcategory.slug}
                    href={`/categoria/${category.slug}/${subcategory.pathSlug}`}
                    active={subcategorySlug === subcategory.slug}
                  >
                    {subcategory.name}
                  </FilterLink>
                ))}
              </FilterPanel>
            ) : (
              <FilterPanel title="Categorias">
                {CATALOG_CATEGORIES.slice(0, 8).map((item) => (
                  <FilterLink key={item.slug} href={`/categoria/${item.slug}`} active={categorySlug === item.slug}>
                    {getPublicCategoryName(item)}
                  </FilterLink>
                ))}
              </FilterPanel>
            )}
          </aside>

          <div>
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-gray-600">
                {products.length > 0 ? `${products.length} produto(s) encontrados` : "Categoria preparada"}
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterLink href={buildHref(basePath, searchParams, { sort: undefined })} active={sort === "createdAt"}>
                  Mais recentes
                </FilterLink>
                <FilterLink href={buildHref(basePath, searchParams, { sort: "price_asc" })} active={sort === "price_asc"}>
                  Menor preço
                </FilterLink>
                <FilterLink href={buildHref(basePath, searchParams, { sort: "price_desc" })} active={sort === "price_desc"}>
                  Maior preço
                </FilterLink>
              </div>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
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
    </section>
  );
}

function FilterPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs font-black uppercase tracking-wide text-gray-400">{title}</p>
      <div className="flex flex-wrap gap-2 lg:flex-col">{children}</div>
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-2 text-xs font-bold transition-colors ${
        active ? "bg-pink-500 text-white" : "bg-pink-50 text-pink-500 hover:bg-pink-100"
      }`}
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
  query,
}: {
  categorySlug?: string;
  subcategorySlug?: string;
  selectedPrice?: string;
  sort: string;
  promo: boolean;
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
        if (query) {
          where.OR = [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
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
  query,
}: {
  categorySlug?: string;
  subcategorySlug?: string;
  selectedPrice?: string;
  promo: boolean;
  query?: string;
}) {
  if (promo) return [];

  return MOCK_PRODUCTS.filter((product) => {
    if (categorySlug && product.category.slug !== categorySlug) return false;
    if (subcategorySlug && product.subcategory?.slug !== subcategorySlug) return false;
    if (selectedPrice && product.price !== Number(selectedPrice)) return false;
    if (query && !product.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
