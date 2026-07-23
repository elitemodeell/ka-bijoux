import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPublicCategoryName } from "@/lib/catalog";
import { findBlingProductForSource, type ProductCardProduct } from "@/lib/bling-catalog";
import { getProductCatalogLine, matchesCatalogLine } from "@/lib/product-line";
import { getDiscountPercentage, getInstallmentInfo, getValidPromotionalPrice } from "@/lib/store-rules";
import ProductVariantImage from "@/components/loja/ProductVariantImage";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const metadata: Metadata = {
  title: "Linha Adulto - KA Bijoux",
  description: "Produtos adultos com discrição, qualidade e entrega sigilosa.",
};

export const revalidate = 60;

type SearchParams = Record<string, string | string[] | undefined>;
const ADULT_PAGE_SIZE = 20;
const ADULT_DB_TIMEOUT_MS = 5000;

const adultProductSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  promotionalPrice: true,
  stock: true,
  featured: true,
  isNew: true,
  sku: true,
  blingId: true,
  category: { select: { name: true, slug: true } },
  subcategory: { select: { name: true, slug: true } },
  images: {
    orderBy: { order: "asc" as const },
    take: 1,
    select: { url: true, alt: true },
  },
};

const CATEGORY_CARDS = [
  {
    slug: "geis-e-cremes",
    title: "Géis & Cremes",
    subtitle: "Massagem e prazer",
    image: "/uploads/products/k-med-gel-intimo.png",
    gradient: "from-[#fff0ef] via-[#fde1e5] to-[#fff8f5]",
  },
  {
    slug: "vibradores",
    title: "Vibradores",
    subtitle: "Controle & intensidade",
    image: "/uploads/products/vibrador-golfinho-rosa.png",
    gradient: "from-[#f7e9ff] via-[#ead9f8] to-[#fff3f7]",
  },
  {
    slug: "aneis-penianos",
    title: "Anéis Penianos",
    subtitle: "Diversas cores",
    image: "/uploads/products/anel-peniano-bolinha-cores.png",
    gradient: "from-[#f5e8ff] via-[#eadff7] to-[#fff3f1]",
  },
  {
    slug: "masturbadores",
    title: "Masturbadores",
    subtitle: "EGGs & mini bullets",
    image: "/uploads/products/egg-wavy.png",
    gradient: "from-[#eee4ff] via-[#eadcf6] to-[#fff4f4]",
  },
  {
    slug: "lubrificantes",
    title: "Lubrificantes",
    subtitle: "Íntimo & suave",
    image: "/uploads/products/lub-plus-100ml.png",
    gradient: "from-[#eee9ff] via-[#e6dff5] to-[#fff7f0]",
  },
  {
    slug: "balas-liquidas",
    title: "Balas Líquidas",
    subtitle: "Sabores especiais",
    image: "/uploads/products/pocao-do-amor.png",
    gradient: "from-[#ffe9ee] via-[#ffdce6] to-[#fff7f1]",
  },
  {
    slug: "desodorantes-intimos",
    title: "Desodorantes íntimos",
    subtitle: "Frescor & delicadeza",
    image: "/uploads/products/desodorante-intimo-morango.png",
    gradient: "from-[#fff0f6] via-[#f4e0f4] to-[#fff8f4]",
    wide: true,
  },
];

const bottomNav = [
  { label: "Início", href: "/", icon: HomeIcon },
  { label: "Categorias", href: "/produtos", icon: GridIcon },
  { label: "Favoritos", href: "/produtos?favoritos=true", icon: HeartIcon },
  { label: "Conta", href: "/admin/login", icon: UserIcon },
  { label: "Pedidos", href: "/carrinho", icon: BoxIcon },
];

export default async function SexShopPage({ searchParams = {} }: { searchParams?: SearchParams }) {
  const promo = getParam(searchParams.promo) === "true";
  const onlyNew = getParam(searchParams.new) === "true";
  const sort = getParam(searchParams.sort) ?? getParam(searchParams.ordem) ?? "createdAt";
  const query = getParam(searchParams.q);
  const requestedPage = Math.max(1, Number.parseInt(getParam(searchParams.page) ?? "1", 10) || 1);
  const { products, total, totalPages, page } = await getAdultProducts({
    promo,
    onlyNew,
    sort,
    query,
    page: requestedPage,
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fff7f5] pb-28 pt-[112px] text-[#5b2638]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,#ffe4ec_0,transparent_34%),radial-gradient(circle_at_88%_18%,#efe1ff_0,transparent_32%),linear-gradient(180deg,#fff8f7_0%,#fff4f2_48%,#fffaf8_100%)]" />

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          className="relative min-h-[420px] overflow-hidden rounded-[30px] border border-[#ead3d7] bg-[#f8e1df] shadow-[0_22px_60px_rgba(116,62,80,0.16)] sm:min-h-[480px]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(255,246,244,0.96) 0%, rgba(255,246,244,0.78) 38%, rgba(255,246,244,0.18) 68%), url('/banners/ka-intima-hero-premium.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f8dede]/80 to-transparent" />
          <div className="relative z-10 flex min-h-[420px] max-w-[660px] flex-col justify-center px-6 py-8 sm:min-h-[480px] sm:px-10">
            <div className="flex w-fit items-center gap-3 rounded-full border border-[#d5a56f]/80 bg-white/55 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a76b34] shadow-[0_10px_24px_rgba(167,107,52,0.10)] backdrop-blur">
              <span className="rounded-full border border-[#d5a56f] px-2 py-1 text-xs">18+</span>
              <span>Acesso restrito</span>
              <span>+18</span>
            </div>

            <h1 className="mt-7 font-playfair text-[52px] font-bold leading-none tracking-normal text-[#5d2038] sm:text-[76px]">
              Linha <span className="text-[#df5b8d]">Adulto</span>
            </h1>
            <p className="mt-5 max-w-md text-xl leading-relaxed text-[#3d3042] sm:text-2xl">
              Produtos com discrição, qualidade e entrega sigilosa.
            </p>

            <div className="mt-7 grid max-w-xl grid-cols-3 overflow-hidden rounded-[24px] border border-[#e8cfd2] bg-white/56 text-[#6e3b4e] shadow-[0_14px_34px_rgba(116,62,80,0.10)] backdrop-blur">
              <HeroBenefit icon={BoxIcon} title="Discrição" text="total" />
              <HeroBenefit icon={ShieldIcon} title="Compra" text="segura" />
              <HeroBenefit icon={TruckIcon} title="Entrega" text="sigilosa" />
            </div>
          </div>

          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            <span className="h-2.5 w-8 rounded-full bg-[#8e4c91]" />
            <span className="h-2.5 w-6 rounded-full bg-white/76" />
            <span className="h-2.5 w-6 rounded-full bg-white/76" />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-playfair text-2xl font-bold text-[#5d2038]">Explorar por categoria</h2>
          <Link href="/categoria/sex-shop" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6e3b4e]">
            Ver todas <ChevronIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {CATEGORY_CARDS.map((card) => (
            <Link
              key={card.slug}
              href={`/categoria/sex-shop/${card.slug}`}
              className={`group relative min-h-[112px] overflow-hidden rounded-[24px] border border-[#dfbdc5] bg-gradient-to-br ${card.gradient} px-4 py-4 shadow-[0_12px_28px_rgba(116,62,80,0.08)] transition-transform hover:-translate-y-0.5 ${card.wide ? "col-span-2" : ""}`}
            >
              <div className="absolute inset-y-0 left-0 w-[45%] opacity-95">
                <Image src={card.image} alt="" width={160} height={160} loading="lazy" className="h-full w-full object-contain p-3" />
              </div>
              <div className="relative ml-[43%] pr-10">
                <h3 className="font-playfair text-lg font-bold leading-tight text-[#654067] sm:text-2xl">{card.title}</h3>
                <p className="mt-2 text-sm leading-tight text-[#6f4f75]">{card.subtitle}</p>
              </div>
              <span className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#e4c6c7] bg-white/76 text-[#7d4b5d] shadow-[0_10px_20px_rgba(116,62,80,0.10)] transition-transform group-hover:translate-x-0.5">
                <ChevronIcon className="h-5 w-5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
        <div className="rounded-[28px] border border-[#ead3d7] bg-white/64 p-4 shadow-[0_16px_48px_rgba(116,62,80,0.10)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <div className="mr-auto flex items-center gap-3">
              <SlidersIcon className="h-5 w-5 text-[#b8794e]" />
              <h2 className="font-playfair text-2xl font-bold text-[#5d2038]">Filtros</h2>
            </div>

            <div className="grid min-w-[260px] flex-1 grid-cols-3 rounded-full bg-[#fdf1f2] p-1">
              <FilterTab href={buildSexShopHref(searchParams, { promo: undefined, new: undefined })} active={!promo && !onlyNew}>Todos</FilterTab>
              <FilterTab href={buildSexShopHref(searchParams, { promo: "true", new: undefined })} active={promo}>Promoções</FilterTab>
              <FilterTab href={buildSexShopHref(searchParams, { new: "true", promo: undefined })} active={onlyNew}>Novidades</FilterTab>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_1fr_58px] gap-3">
            <FilterBox label="Categoria: Linha Adulto" />
            <FilterBox label="Ordenar: Mais relevantes" />
            <button className="flex h-14 items-center justify-center rounded-[20px] border border-[#edd8da] bg-white/78 text-[#8a4b5d]" aria-label="Visualizacao em grade">
              <GridIcon className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-5 text-base font-bold text-[#5d2038]">
            {total} produto(s) <span className="font-medium text-[#7d4b5d]">encontrados</span>
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <AdultProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 ? (
            <nav className="mt-7 flex items-center justify-center gap-3" aria-label="Paginacao da Linha Adulto">
              {page > 1 ? (
                <Link
                  href={buildSexShopHref(searchParams, { page: String(page - 1) })}
                  className="rounded-full border border-[#dfbdc5] bg-white/80 px-4 py-2.5 text-sm font-bold text-[#8a4b5d]"
                >
                  Anterior
                </Link>
              ) : null}
              <span className="text-sm font-semibold text-[#7d4b5d]">Pagina {page} de {totalPages}</span>
              {page < totalPages ? (
                <Link
                  href={buildSexShopHref(searchParams, { page: String(page + 1) })}
                  className="rounded-full bg-[#df5b8d] px-4 py-2.5 text-sm font-bold text-white"
                >
                  Proxima
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}

function AdultProductCard({ product }: { product: ProductCardProduct }) {
  const price = Number(product.price);
  const promotionalPrice = getValidPromotionalPrice(price, product.promo ?? product.promotionalPrice);
  const currentPrice = promotionalPrice ?? price;
  const discount = getDiscountPercentage({ originalPrice: price, currentPrice: promotionalPrice });
  const installment = getInstallmentInfo(currentPrice);
  const image = product.image || product.images?.[0]?.url || null;

  return (
    <Link
      href={product.slug ? `/produto/${product.slug}` : "/produtos"}
      className="group flex flex-col overflow-hidden rounded-xl border border-[#ead7d7] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-[#fff6f7]">
        {image ? (
          <ProductVariantImage
            src={image}
            alt={product.name}
            productName={product.name}
            sku={product.sku}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            frameClassName="h-full w-full"
            imageClassName="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-[#d4a7b5]">
            <span className="text-3xl font-black">KA</span>
          </div>
        )}
        <span className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
          <span className="rounded-md bg-[#df5b8d] px-2 py-0.5 text-[10px] font-bold text-white">Novo</span>
          {discount ? (
            <span className="rounded-full bg-gradient-to-r from-pink-700 to-pink-500 px-2 py-0.5 text-[10px] font-bold text-white">
              -{discount}%
            </span>
          ) : null}
        </span>
        <span className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#c3a1a2] shadow-sm">
          <HeartIcon className="h-4 w-4" />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="line-clamp-2 text-[12px] font-semibold leading-snug text-[#4d2938]">{product.name}</h3>
        <div className="mt-auto pt-2">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <p className="text-[14px] font-bold text-[#df5b8d]">{formatCurrency(currentPrice)}</p>
            {promotionalPrice ? <p className="text-[10px] font-semibold text-[#aa8b94] line-through">{formatCurrency(price)}</p> : null}
          </div>
          <p className="mt-0.5 text-[10px] text-[#8a6671]">
            {installment.eligible && installment.installmentValue
              ? `${installment.label} de ${formatCurrency(installment.installmentValue)}`
              : installment.label}
          </p>
          <div className="mt-2 rounded-lg bg-gradient-to-r from-[#df5b8d] to-pink-400 py-2 text-center text-[12px] font-bold text-white">
            Comprar
          </div>
        </div>
      </div>
    </Link>
  );
}

type AdultProductParams = {
  promo: boolean;
  onlyNew: boolean;
  sort: string;
  query?: string;
  page: number;
};

async function getAdultProducts(params: AdultProductParams) {
  try {
    return await withTimeout(fetchAdultProducts(params), ADULT_DB_TIMEOUT_MS);
  } catch {
    return { products: [] as ProductCardProduct[], total: 0, page: 1, totalPages: 1 };
  }
}

async function fetchAdultProducts({ promo, onlyNew, sort, query, page: requestedPage }: AdultProductParams) {
  const where: Prisma.ProductWhereInput = {
    active: true,
    category: { slug: "sex-shop" },
    images: { some: {} },
  };

  if (promo) where.promotionalPrice = { not: null };
  if (onlyNew) where.isNew = true;
  if (query) {
    const searchTerms = buildSearchTerms(query);
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
      { searchTags: { hasSome: searchTerms } },
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

  const [total, firstProducts] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: adultProductSelect,
      orderBy: [orderBy, { createdAt: "desc" }, { id: "asc" }],
      skip: (requestedPage - 1) * ADULT_PAGE_SIZE,
      take: ADULT_PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / ADULT_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const products = page === requestedPage
    ? firstProducts
    : await prisma.product.findMany({
        where,
        select: adultProductSelect,
        orderBy: [orderBy, { createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * ADULT_PAGE_SIZE,
        take: ADULT_PAGE_SIZE,
      });

  const dbProducts = products
    .map((product) => mapDbAdultProductToCard(product))
    .filter((product): product is ProductCardProduct => Boolean(product))
    .filter((product) => Boolean(product.image))
    .filter((product) => matchesCatalogLine(toProductLineSource(product), "adult"));

  return { products: dbProducts, total, page, totalPages };
}

function mapDbAdultProductToCard(
  product: Prisma.ProductGetPayload<{ select: typeof adultProductSelect }>
): ProductCardProduct | null {
  const bling = findBlingProductForSource({
    blingId: product.blingId,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
  });
  const images = product.images.map((image) => ({ url: image.url, alt: image.alt ?? product.name }));
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
  const promotionalPrice = bling
    ? null
    : product.promotionalPrice
      ? Number(product.promotionalPrice)
      : null;

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
    imageSource: images.length ? "DATABASE" : "NONE",
    catalogLine,
    isAdult: catalogLine === "adult",
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

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

function buildSearchTerms(value: string) {
  const original = value.trim();
  const normalized = normalizeSearchQuery(original);
  const tokens = normalized.includes(" ") ? [] : normalized.split(/\s+/).filter((token) => token.length >= 2);
  return Array.from(new Set([original, normalized, ...tokens].filter(Boolean)));
}

function normalizeSearchQuery(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function HeroBenefit({ icon: Icon, title, text }: { icon: IconComponent; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 border-r border-[#e4cfd0] px-3 py-4 last:border-r-0 sm:px-5">
      <Icon className="h-7 w-7 shrink-0 text-[#a05a69]" />
      <p className="text-sm font-semibold leading-tight">
        {title}
        <span className="block font-medium">{text}</span>
      </p>
    </div>
  );
}

function FilterTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex min-h-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors ${
        active ? "bg-[#bd6b8f] text-white shadow-[0_10px_22px_rgba(189,107,143,0.24)]" : "text-[#734356]"
      }`}
    >
      {children}
    </Link>
  );
}

function FilterBox({ label }: { label: string }) {
  return (
    <button className="flex h-14 min-w-0 items-center justify-between gap-3 rounded-[20px] border border-[#edd8da] bg-white/78 px-4 text-left text-sm font-semibold text-[#6b3d4d]">
      <span className="truncate">{label}</span>
      <ChevronDownIcon className="h-4 w-4 shrink-0" />
    </button>
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-4 bottom-3 z-40 mx-auto max-w-4xl rounded-[28px] border border-[#ead3d7] bg-white/88 px-3 py-3 shadow-[0_-12px_36px_rgba(116,62,80,0.13)] backdrop-blur-xl">
      <div className="grid grid-cols-5 gap-1">
        {bottomNav.map((item) => (
          <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 text-[11px] font-medium text-[#8a5b69]">
            <item.icon className="h-6 w-6" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildSexShopHref(current: SearchParams, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(current).forEach(([key, value]) => {
    const currentValue = getParam(value);
    if (currentValue) params.set(key, currentValue);
  });
  if (!("page" in updates)) params.delete("page");
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const query = params.toString();
  return query ? `/categoria/sex-shop?${query}` : "/categoria/sex-shop";
}


type IconComponent = ({ className }: { className?: string }) => JSX.Element;

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="11" cy="18" r="2" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}
