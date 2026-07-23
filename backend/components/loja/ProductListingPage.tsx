import Link from "next/link";
import { Prisma } from "@prisma/client";
import ProductCard from "@/components/loja/ProductCard";
import { prisma } from "@/lib/prisma";
import {
  CATALOG_CATEGORIES,
  MOCK_PRODUCTS,
  getCategoryBySlug,
  getPublicCategoryName,
  type CatalogCategory,
} from "@/lib/catalog";
import {
  findBlingProductForSource,
  isAdultImageUrl,
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


const LISTING_PAGE_SIZE = 50;
const LISTING_DB_LIMIT = 1000;
const LISTING_DB_TIMEOUT_MS = 5000;

type PremiumCategoryKind = "novidades" | "promocoes" | "lancamentos" | "bijuterias" | "capinhas";
type HighlightIconName = "sparkles" | "tag" | "trend" | "diamond" | "shield" | "gift";

type PremiumCategoryExperience = {
  kind: PremiumCategoryKind;
  title: string;
  description: string;
  heroImage: string;
  heroWidth: number;
  heroHeight: number;
};

const PREMIUM_CATEGORY_EXPERIENCES: Record<PremiumCategoryKind, PremiumCategoryExperience> = {
  novidades: {
    kind: "novidades",
    title: "Novidades",
    description: "Descubra os produtos que acabaram de chegar e encontre novos favoritos para completar sua rotina com estilo.",
    heroImage: "/images/category-heroes/categoria-novidades.png",
    heroWidth: 1448,
    heroHeight: 1086,
  },
  promocoes: {
    kind: "promocoes",
    title: "Promoções",
    description: "Os melhores descontos, achadinhos e ofertas especiais da KA Bijoux reunidos em uma vitrine elegante.",
    heroImage: "/images/category-heroes/categoria-promocoes.png",
    heroWidth: 1536,
    heroHeight: 1024,
  },
  lancamentos: {
    kind: "lancamentos",
    title: "Lançamentos",
    description: "Peças e acessórios que acabaram de chegar para renovar sua seleção e destacar seu estilo.",
    heroImage: "/images/category-heroes/categoria-lancamentos.png",
    heroWidth: 1448,
    heroHeight: 1086,
  },
  bijuterias: {
    kind: "bijuterias",
    title: "Bijuterias",
    description: "Peças delicadas e estilosas para compor seu visual em qualquer ocasião, do básico ao marcante.",
    heroImage: "/images/category-heroes/categoria-bijuterias.png",
    heroWidth: 1448,
    heroHeight: 1086,
  },
  capinhas: {
    kind: "capinhas",
    title: "Capinhas e acessórios de celular",
    description: "Proteção, estilo e praticidade para seu celular, com capinhas e acessórios que combinam com você.",
    heroImage: "/images/category-heroes/categoria-capinhas.png",
    heroWidth: 1448,
    heroHeight: 1086,
  },
};

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
  const requestedSort = getParam(searchParams.sort);
  const sort = requestedSort ?? "createdAt";
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
  const premiumExperience = embedded
    ? null
    : getPremiumCategoryExperience({
        categorySlug,
        basePath,
        promo,
        onlyNew,
        requestedSort,
        selectedSubcategoryName: selectedSubcategory?.name,
        selectedSubcategoryDescription: selectedSubcategory?.description,
      });

  return (
    <section className={embedded ? "" : "bg-white pt-28 md:pt-28"}>
      <div className={embedded ? "" : "mx-auto max-w-7xl px-4 pb-16"}>
        {!embedded &&
          (premiumExperience ? (
            <>
              <PremiumBreadcrumb title={premiumExperience.title} />
              <PremiumCategoryHero experience={premiumExperience} />
            </>
          ) : (
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
          ))}

        <div className={`${premiumExperience ? "mt-5" : "mt-6"} space-y-5`}>
          {premiumExperience ? (
            <PremiumCategoryFilters
              basePath={basePath}
              searchParams={searchParams}
              category={category}
              categoryLabel={categoryLabel}
              currentCategoryLabel={category ? currentCategoryLabel : premiumExperience.title}
              subcategorySlug={subcategorySlug}
              visibleCategories={visibleCategories}
              promo={promo}
              onlyNew={onlyNew}
              sort={sort}
              total={total}
            />
          ) : (
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
          )}

          <div>
            {products.length > 0 ? (
              <div
                key={productListKey}
                className={`grid animate-[kaProductsFade_260ms_ease-out] grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${
                  premiumExperience ? "gap-3 sm:gap-5" : "gap-5"
                }`}
              >
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} revealDelay={index * 70} priority={index < 4} />
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] border border-pink-100 bg-pink-50 px-6 py-16 text-center">
                <p className="font-playfair text-2xl font-bold text-gray-900">
                  {premiumExperience?.kind === "promocoes"
                    ? "Nenhuma promoção ativa no momento."
                    : "Em breve teremos novidades nessa categoria."}
                </p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-500">
                  {premiumExperience?.kind === "promocoes"
                    ? "Assim que uma oferta real for cadastrada, ela aparecerá automaticamente nesta vitrine."
                    : "Estamos preparando os produtos reais da KA Bijoux para esta vitrine."}
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

function getPremiumCategoryExperience({
  categorySlug,
  basePath,
  promo,
  onlyNew,
  requestedSort,
  selectedSubcategoryName,
  selectedSubcategoryDescription,
}: {
  categorySlug?: string;
  basePath: string;
  promo: boolean;
  onlyNew: boolean;
  requestedSort?: string;
  selectedSubcategoryName?: string;
  selectedSubcategoryDescription?: string;
}) {
  let experience: PremiumCategoryExperience | null = null;

  if (categorySlug === "capinhas-acessorios-celular") {
    experience = PREMIUM_CATEGORY_EXPERIENCES.capinhas;
  } else if (categorySlug === "bijuterias") {
    experience = PREMIUM_CATEGORY_EXPERIENCES.bijuterias;
  } else if (basePath === "/produtos" && promo) {
    experience = PREMIUM_CATEGORY_EXPERIENCES.promocoes;
  } else if (basePath === "/produtos" && onlyNew) {
    experience = PREMIUM_CATEGORY_EXPERIENCES.novidades;
  } else if (basePath === "/produtos" && requestedSort === "createdAt") {
    experience = PREMIUM_CATEGORY_EXPERIENCES.lancamentos;
  }

  if (!experience) return null;
  if (!selectedSubcategoryName) return experience;

  return {
    ...experience,
    title: `${experience.title}: ${selectedSubcategoryName}`,
    description: selectedSubcategoryDescription || experience.description,
  };
}

function PremiumBreadcrumb({ title }: { title: string }) {
  return (
    <nav className="mb-4 flex min-w-0 items-start gap-2 text-[11px] font-semibold text-gray-400 sm:items-center sm:text-sm" aria-label="Navegação estrutural">
      <Link href="/" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-pink-50 hover:text-pink-500" aria-label="Ir para a página inicial">
        <HomeIcon />
      </Link>
      <span className="mt-2 sm:mt-0"><ChevronRightSmall /></span>
      <Link href="/produtos" className="mt-1.5 shrink-0 transition-colors hover:text-pink-500 sm:mt-0">
        Categorias
      </Link>
      <span className="mt-2 sm:mt-0"><ChevronRightSmall /></span>
      <span className="mt-1.5 min-w-0 break-words font-black leading-tight text-pink-500 sm:mt-0">{title}</span>
    </nav>
  );
}

function PremiumCategoryHero({ experience }: { experience: PremiumCategoryExperience }) {
  return (
    <section
      className="mx-auto w-full"
      style={{ maxWidth: experience.heroWidth }}
      aria-label={`Apresentação de ${experience.title}`}
    >
      <img
        src={experience.heroImage}
        alt={`KA Bijoux - ${experience.title}`}
        width={experience.heroWidth}
        height={experience.heroHeight}
        className="block h-auto w-full object-contain"
        loading="eager"
        decoding="async"
      />
    </section>
  );
}

type PremiumCategoryFiltersProps = {
  basePath: string;
  searchParams: SearchParams;
  category: CatalogCategory | null;
  categoryLabel: string;
  currentCategoryLabel: string;
  subcategorySlug?: string;
  visibleCategories: CatalogCategory[];
  promo: boolean;
  onlyNew: boolean;
  sort: string;
  total: number;
};

function PremiumCategoryFilters({
  basePath,
  searchParams,
  category,
  categoryLabel,
  currentCategoryLabel,
  subcategorySlug,
  visibleCategories,
  promo,
  onlyNew,
  sort,
  total,
}: PremiumCategoryFiltersProps) {
  const bestSellers = sort === "best_sellers" || sort === "mais-vendidos";

  return (
    <section className="rounded-[28px] border border-pink-100 bg-white/96 p-3 shadow-[0_18px_48px_rgba(122,35,75,0.09)] sm:p-6" aria-label="Filtros de produtos">
      <p className="px-1 text-[11px] font-black uppercase tracking-[0.22em] text-pink-500 sm:text-xs">Filtros</p>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-[22px] bg-gradient-to-r from-[#fff0f5] via-[#fff7fa] to-[#f7f0ff] p-1 min-[380px]:grid-cols-4">
        <PremiumFilterLink
          href={buildHref(basePath, searchParams, { price: undefined, promo: undefined, new: undefined, sort: undefined, page: undefined })}
          active={!promo && !onlyNew && !bestSellers}
          icon="grid"
        >
          Todos
        </PremiumFilterLink>
        <PremiumFilterLink
          href={buildHref(basePath, searchParams, { promo: "true", price: undefined, new: undefined, sort: undefined, page: undefined })}
          active={promo}
          icon="tag"
        >
          Promoções
        </PremiumFilterLink>
        <PremiumFilterLink
          href={buildHref(basePath, searchParams, { new: "true", price: undefined, promo: undefined, sort: undefined, page: undefined })}
          active={onlyNew}
          icon="star"
        >
          Novidades
        </PremiumFilterLink>
        <PremiumFilterLink
          href={buildHref(basePath, searchParams, { sort: "mais-vendidos", promo: undefined, new: undefined, page: undefined })}
          active={bestSellers}
          icon="trend"
        >
          Mais vendidos
        </PremiumFilterLink>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(118px,.56fr)] gap-2">
        <details className="group min-w-0 rounded-2xl border border-[#eadfe7] bg-[#fffafd] open:col-span-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-1.5 px-2.5 text-[10px] font-bold text-[#555d69] [&::-webkit-details-marker]:hidden sm:gap-2 sm:px-3 sm:text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <FilterSlidersIcon />
              <span>Filtros avançados</span>
            </span>
            <ChevronDownIcon />
          </summary>
          <div className="ka-category-drawer border-t border-pink-100 px-3 pb-3 pt-3">
            <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-gray-400">Escolha a categoria</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <CategoryChip href={buildHref("/produtos", searchParams, { price: undefined, page: undefined })} active={!category} compact>
                Todos
              </CategoryChip>
              {visibleCategories.map((item) => (
                <CategoryChip
                  key={item.slug}
                  href={buildHref(`/categoria/${item.slug}`, searchParams, { price: undefined, page: undefined })}
                  active={category?.slug === item.slug}
                  compact
                >
                  {getPublicCategoryName(item)}
                </CategoryChip>
              ))}
            </div>

            {category?.subcategories?.length ? (
              <div className="mt-3 border-t border-pink-100 pt-3">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-gray-400">Refinar em {categoryLabel}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <CategoryChip href={buildHref(`/categoria/${category.slug}`, searchParams, { price: undefined, page: undefined })} active={!subcategorySlug} compact>
                    Todas
                  </CategoryChip>
                  {category.subcategories.map((subcategory) => (
                    <CategoryChip
                      key={subcategory.slug}
                      href={buildHref(`/categoria/${category.slug}/${subcategory.pathSlug}`, searchParams, { price: undefined, page: undefined })}
                      active={subcategorySlug === subcategory.slug}
                      compact
                    >
                      {subcategory.name}
                    </CategoryChip>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </details>

        <details className="group min-w-0 rounded-2xl border border-[#eadfe7] bg-[#fffafd] open:col-span-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-1.5 px-3 text-[11px] font-bold text-[#555d69] [&::-webkit-details-marker]:hidden sm:text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <SortIcon />
              <span className="truncate">Ordenar</span>
            </span>
            <ChevronDownIcon />
          </summary>
          <div className="ka-category-drawer border-t border-pink-100 p-2">
            {[
              { label: "Mais recentes", value: "createdAt" },
              { label: "Menor preço", value: "menor-preco" },
              { label: "Maior preço", value: "maior-preco" },
              { label: "Mais vendidos", value: "mais-vendidos" },
            ].map((option) => (
              <Link
                key={option.value}
                href={buildHref(basePath, searchParams, { sort: option.value, page: undefined })}
                className={`block rounded-xl px-3 py-2 text-[11px] font-bold transition-colors ${
                  sort === option.value ? "bg-pink-500 text-white" : "text-gray-600 hover:bg-pink-50 hover:text-pink-500"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </details>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-pink-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col items-start gap-2 min-[380px]:flex-row min-[380px]:items-center">
          <span className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffe8f0] to-[#fff0f6] px-3 py-2 text-[10px] font-black leading-tight text-pink-600 sm:rounded-full sm:text-xs">
            <span className="min-w-0 break-words">Categoria: {currentCategoryLabel}</span>
            {category ? (
              <Link href="/produtos" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sm leading-none hover:bg-white/80" aria-label="Remover categoria">
                ×
              </Link>
            ) : null}
          </span>
          <Link href={basePath} className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-pink-500 hover:text-pink-600 sm:text-xs">
            <TrashIcon />
            Limpar
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="text-xs font-bold text-[#555d69] sm:text-sm">
            {total > 0 ? `${total} produto(s) encontrados` : "Nenhum produto encontrado"}
          </p>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-pink-200 bg-pink-50 text-pink-500" aria-label="Visualização em grade">
            <GridIcon />
          </span>
        </div>
      </div>
    </section>
  );
}

function PremiumFilterLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: "grid" | "tag" | "star" | "trend";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-[18px] px-1 text-[9px] font-black leading-tight transition-all duration-200 sm:gap-1.5 sm:px-2 sm:text-xs ${
        active
          ? "bg-gradient-to-r from-[#ff5b84] to-[#f43f72] text-white shadow-[0_8px_18px_rgba(244,63,114,0.25)]"
          : "text-[#3f4552] hover:bg-white hover:text-pink-500"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <FilterTabIcon name={icon} />
      <span className="text-center leading-[1.05]">{children}</span>
    </Link>
  );
}

function HighlightIcon({ name }: { name: HighlightIconName }) {
  const className = "h-4 w-4 sm:h-5 sm:w-5";

  if (name === "shield") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </svg>
    );
  }

  if (name === "diamond") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m4 9 4-5h8l4 5-8 11L4 9Z" />
        <path d="M4 9h16M8 4l4 16 4-16" />
      </svg>
    );
  }

  if (name === "gift") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M12 8v13M3 12h18M12 8H7.5a2.5 2.5 0 1 1 2.2-3.7L12 8Zm0 0h4.5a2.5 2.5 0 1 0-2.2-3.7L12 8Z" />
      </svg>
    );
  }

  if (name === "tag") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 4v7l9 9 8-8-9-9H4a1 1 0 0 0-1 1Z" />
        <circle cx="8" cy="8" r="1.3" />
      </svg>
    );
  }

  if (name === "trend") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m4 16 5-5 4 4 7-8" />
        <path d="M15 7h5v5" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
      <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
    </svg>
  );
}

function FilterTabIcon({ name }: { name: "grid" | "tag" | "star" | "trend" }) {
  const className = "h-4 w-4 shrink-0";
  if (name === "grid") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    );
  }
  if (name === "tag") return <HighlightIcon name="tag" />;
  if (name === "trend") return <HighlightIcon name="trend" />;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </svg>
  );
}

function ChevronRightSmall() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function FilterSlidersIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" fill="white" />
      <circle cx="15" cy="12" r="2" fill="white" />
      <circle cx="7" cy="18" r="2" fill="white" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 5v14M5 8l3-3 3 3M16 19V5M13 16l3 3 3-3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
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

function CategoryChip({
  href,
  active,
  children,
  compact = false,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-9 min-w-0 items-center justify-center rounded-full border py-1.5 text-center font-bold leading-tight transition-colors ${
        active
          ? "border-pink-500 bg-pink-500 text-white"
          : "border-pink-100 bg-white text-gray-700 hover:bg-pink-50 hover:text-pink-500"
      } ${compact ? "break-words px-1.5 text-[9px] sm:px-3 sm:text-xs" : "px-3 text-xs sm:px-4 sm:py-2"}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

type LiveProductParams = {
  categorySlug?: string;
  subcategorySlug?: string;
  selectedPrice?: string;
  sort: string;
  promo: boolean;
  onlyNew: boolean;
  query?: string;
  catalogLine: CatalogLine;
};

// Busca os produtos editados no banco; a Bling entra apenas como apoio de preco.
async function fetchMergedProducts(params: LiveProductParams): Promise<ProductCardProduct[]> {
    const { categorySlug, subcategorySlug, selectedPrice, sort, promo, onlyNew, query, catalogLine } = params;
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
        { searchTags: { hasSome: buildSearchTerms(query) } },
        ...searchMatches.categorySlugs.map((slug) => ({ category: { slug } })),
        ...searchMatches.subcategorySlugs.map((slug) => ({ subcategory: { slug } })),
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price_asc" || sort === "menor-preco"
        ? { price: "asc" }
        : sort === "price_desc" || sort === "maior-preco"
          ? { price: "desc" }
          : sort === "best_sellers" || sort === "mais-vendidos"
            ? { soldCount: "desc" }
            : { createdAt: "desc" };

    const products = await prisma.product.findMany({ where, include: productInclude, orderBy, take: LISTING_DB_LIMIT });
    const dbProducts = products
      .map((product) => mapDbProductToCard(product))
      .filter((product): product is ProductCardProduct => Boolean(product))
      .filter((product) => Boolean(product.image))
      .filter((product) => matchesCatalogLine(toProductLineSource(product), catalogLine));
    return sortProducts(dbProducts, sort);
}

async function getLiveProducts(params: LiveProductParams & { page: number }) {
  const { page, ...filterParams } = params;

  try {
    const allProducts = await withTimeout(fetchMergedProducts(filterParams), LISTING_DB_TIMEOUT_MS);
    return paginateProducts(allProducts, page);
  } catch {
    return paginateProducts([], page);
  }
}

function mapDbProductToCard(product: Prisma.ProductGetPayload<{ include: typeof productInclude }>): ProductCardProduct | null {
  const bling = findBlingProductForSource({
    blingId: product.blingId,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
  });

  const isAdultCategory = product.category?.slug === "sex-shop";
  const rawDbImages = product.images.map((image) => ({ url: image.url, alt: image.alt ?? product.name }));
  const dbImages = isAdultCategory ? rawDbImages : rawDbImages.filter((i) => !isAdultImageUrl(i.url));
  const images = dbImages;
  const promotionalPrice = bling
    ? null
    : product.promotionalPrice
      ? Number(product.promotionalPrice)
      : null;
  const category = product.category
    ? { name: getPublicCategoryName(product.category), slug: product.category.slug }
    : null;
  const subcategory = product.subcategory
    ? { name: product.subcategory.name, slug: product.subcategory.slug }
    : null;
  const catalogLine = getProductCatalogLine({
    name: product.name,
    categorySlug: category?.slug,
    categoryName: category?.name,
    subcategorySlug: subcategory?.slug,
    subcategoryName: subcategory?.name,
  });

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: bling?.price ?? Number(product.price),
    promotionalPrice,
    promo: promotionalPrice,
    badge: product.isNew ? "Novo" : product.featured ? "Destaque" : null,
    stock: product.stock,
    sku: product.sku,
    blingId: bling?.blingId ?? product.blingId,
    category,
    subcategory,
    images,
    image: images[0]?.url ?? null,
    sourceOrder: 100000,
    priceSource: bling ? "BLING" : "DATABASE",
    imageSource: dbImages.length ? "DATABASE" : "NONE",
    catalogLine,
    isAdult: catalogLine === "adult",
  } satisfies ProductCardProduct;
}

function buildSearchTerms(value: string) {
  const original = value.trim();
  const normalized = normalizeSearch(original);
  const tokens = normalized.includes(" ") ? [] : normalized.split(/\s+/).filter((token) => token.length >= 2);
  return Array.from(new Set([original, normalized, ...tokens].filter(Boolean)));
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
