"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { getCategoryGroups, getPublicCategoryName } from "@/lib/catalog";
import { getCartCount, subscribeCart } from "@/lib/client-cart";
import SeasonalAudioControlWeb from "@/components/loja/SeasonalAudioControlWeb";

const FEATURED_LINKS = [
  { label: "Início", href: "/" },
  { label: "Bijuterias", href: "/categoria/bijuterias" },
  { label: "Utilidades", href: "/categoria/utilidades-domesticas" },
  { label: "Capinhas", href: "/categoria/capinhas-acessorios-celular" },
];

const ADULT_LINK = { label: "🔞 Linha Adulto", href: "/categoria/sex-shop" };

const MENU_LINKS = [
  { label: 'Minha conta', href: '/conta' },
  { label: "Início", href: "/" },
  { label: "Novidades", href: "/produtos?new=true" },
  { label: "Promoções", href: "/produtos?promo=true" },
  { label: "Lançamentos", href: "/produtos?new=true" },
  { label: "Todos os produtos", href: "/produtos" },
  { label: "Carrinho", href: "/carrinho" },
  { label: "🔞 Linha Adulto", href: "/categoria/sex-shop" },
];

const HIDDEN_EMPTY_CATEGORY_SLUGS = new Set([
  "relogios",
  "oculos",
  "pijamas",
  "roupa-infantil",
  "acessorios-inverno",
  "brinquedos",
  "cintos",
]);

const groups = getCategoryGroups()
  .map((group) => ({
    ...group,
    categories: group.categories.filter((category) => !HIDDEN_EMPTY_CATEGORY_SLUGS.has(category.slug)),
  }))
  .filter((group) => group.categories.length > 0);

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    setCartCount(getCartCount());
    return subscribeCart((items) => setCartCount(getCartCount(items)));
  }, []);

  function navigateSearch(value: string) {
    const normalizedValue = value.trim();
    setSearch(normalizedValue);
    setMenuOpen(false);
    setMegaOpen(false);
    const isAdultContext = pathname?.startsWith("/categoria/sex-shop");
    router.push(
      normalizedValue
        ? isAdultContext
          ? `/categoria/sex-shop?q=${encodeURIComponent(normalizedValue)}`
          : `/produtos?q=${encodeURIComponent(normalizedValue)}`
        : isAdultContext
          ? "/categoria/sex-shop"
          : "/produtos"
    );
  }

  if (pathname?.startsWith("/categoria/sex-shop")) {
    return (
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#ead4d4]/70 bg-[#fff8f7]/88 shadow-[0_12px_32px_rgba(99,44,63,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex h-[84px] max-w-6xl items-center gap-2 px-3 sm:h-[96px] sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[19px] border border-[#ead4d4] bg-white/72 text-[#8a4b5d] shadow-[0_12px_24px_rgba(99,44,63,0.08)] sm:h-14 sm:w-14 sm:rounded-[22px]"
            aria-label="Abrir menu"
          >
            <HamburgerIcon />
          </button>

          <Link href="/categoria/sex-shop" className="shrink-0 leading-none" aria-label="KA Íntima">
            <span className="block text-[30px] font-black tracking-tight text-[#e24c86] sm:text-[38px]">KA</span>
            <span className="-mt-2 block font-playfair text-[15px] italic text-[#8a4b5d] sm:text-[17px]">Íntima</span>
          </Link>

          <AutocompleteSearch
            value={search}
            onChange={setSearch}
            onChoose={navigateSearch}
            adultMode
            formClassName="relative z-40 min-w-0 flex-1"
            inputClassName="h-12 w-full rounded-[22px] border border-[#ead4d4] bg-white/62 pl-10 pr-3 text-sm font-medium text-[#6f4352] outline-none shadow-[0_14px_30px_rgba(99,44,63,0.06)] transition focus:border-[#d897ad] focus:bg-white focus:ring-2 focus:ring-[#f5dce6] sm:h-14 sm:rounded-[26px] sm:pl-12 sm:pr-4"
            iconClassName="left-3.5 text-[#8a4b5d]/75 sm:left-4"
            placeholder="O que você procura?"
            showSubmitButton={false}
          />

          <Link
            href="/carrinho"
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#ead4d4] bg-white/74 text-[#8a4b5d] shadow-[0_12px_24px_rgba(99,44,63,0.08)] sm:h-14 sm:w-14"
            aria-label={`Carrinho com ${cartCount} itens`}
          >
            <BagIcon className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-1 flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#e24c86] px-1 text-[10px] font-black text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          <SeasonalAudioControlWeb />
          <Link
            href='/conta'
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#ead4d4] bg-white/74 text-[#8a4b5d] shadow-[0_12px_24px_rgba(99,44,63,0.08)] sm:h-14 sm:w-14"
            aria-label='Minha conta'
          >
            <UserIcon className="h-5 w-5" />
          </Link>
        </div>

        {menuOpen && (
          <div className="fixed inset-0 z-[80] md:hidden">
            <button type="button" className="absolute inset-0 bg-[#3b1825]/35 backdrop-blur-sm" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />
            <aside className="ka-mobile-drawer absolute right-0 top-0 flex h-full w-[90vw] max-w-sm flex-col overflow-hidden rounded-l-[28px] bg-[#fffaf9] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#f0dcdf] px-5 py-4">
                <div>
                  <span className="block text-3xl font-black text-[#e24c86]">KA</span>
                  <span className="-mt-1 block font-playfair italic text-[#8a4b5d]">Íntima</span>
                </div>
                <button type="button" onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f9e9ee] text-xl leading-none text-[#8a4b5d]" aria-label="Fechar menu">
                  x
                </button>
              </div>

              <div className="grid gap-2 px-5 py-5">
                {MENU_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-2xl border border-[#f0dcdf] bg-white px-4 py-3 text-sm font-bold text-[#6f4352] shadow-sm"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        )}
      </header>
    );
  }

  return (
    <header
      className={`fixed inset-x-0 top-12 z-40 transition-all duration-300 md:top-0 md:z-50 ${
        scrolled
          ? "border-b border-pink-50 bg-white/96 shadow-sm backdrop-blur-md"
          : "border-b border-pink-50 bg-white/90 backdrop-blur-md md:bg-white/82"
      }`}
      onMouseLeave={() => setMegaOpen(false)}
    >
      <div className="relative isolate mx-auto flex h-[72px] max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-4 md:h-[74px] md:px-5">
        <HeaderSparkles />

        <Link href="/" className="ka-logo-sparkle-wrap relative z-20 flex shrink-0 items-center" aria-label="KA Bijoux">
          <Image
            src="/images/brand/ka-bijoux-logo-header-320.png"
            alt="KA Bijoux"
            width={320}
            height={294}
            sizes="(max-width: 767px) 88px, 150px"
            quality={82}
            priority
            className="h-10 w-auto max-w-[72px] object-contain sm:h-11 sm:max-w-[88px] md:h-12 md:max-w-[150px]"
          />
          <span className="ka-logo-twinkle" style={{ left: "72%", top: "10%", animationDelay: "0.4s" }} />
          <span className="ka-logo-twinkle" style={{ left: "6%", top: "72%", animationDelay: "2.6s" }} />
        </Link>

        <AutocompleteSearch
          value={search}
          onChange={setSearch}
          onChoose={navigateSearch}
          formClassName="relative z-40 min-w-0 flex-1 md:max-w-md lg:max-w-lg"
          inputClassName="h-10 w-full rounded-2xl border border-pink-100 bg-white/88 pl-9 pr-10 text-[13px] font-medium text-gray-700 shadow-[0_8px_24px_rgba(236,72,153,0.06)] outline-none transition focus:border-pink-300 focus:bg-white focus:ring-2 focus:ring-pink-100 sm:h-11 sm:text-sm"
          iconClassName="left-3 text-pink-400"
          placeholder="Buscar produtos, categorias e mais..."
          showSubmitButton
        />

        <nav className="relative z-10 hidden items-center gap-5 xl:flex">
          {FEATURED_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="group relative text-sm font-medium text-gray-600 transition-colors hover:text-pink-500"
            >
              {label}
              <span className="absolute -bottom-0.5 left-0 h-[2px] w-0 rounded-full bg-pink-400 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
          <Link
            href={ADULT_LINK.href}
            className="rounded-full border border-purple-200 bg-gradient-to-r from-purple-900/90 to-pink-900/90 px-4 py-2 text-xs font-bold tracking-wide text-pink-200 shadow-sm transition-all hover:from-purple-800 hover:to-pink-800 hover:text-white"
          >
            {ADULT_LINK.label}
          </Link>
          <button
            type="button"
            onClick={() => setMegaOpen((current) => !current)}
            onMouseEnter={() => setMegaOpen(true)}
            className="rounded-full border border-pink-100 bg-white/80 px-4 py-2 text-sm font-semibold text-pink-500 shadow-sm backdrop-blur transition-colors hover:bg-pink-50"
          >
            Categorias
          </button>
        </nav>

        <div className="relative z-20 flex shrink-0 items-center gap-0.5 self-center">
          <SeasonalAudioControlWeb />
          <Link href='/conta' className='group rounded-xl p-2.5 transition-colors hover:bg-pink-50' aria-label='Minha conta'>
            <UserIcon className='h-[18px] w-[18px] text-gray-500 transition-colors group-hover:text-pink-500' />
          </Link>

          <Link href="/carrinho" className="group relative rounded-xl p-2.5 transition-colors hover:bg-pink-50" aria-label={`Carrinho com ${cartCount} itens`}>
            <BagIcon className="h-[18px] w-[18px] text-gray-500 transition-colors group-hover:text-pink-500" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-black leading-none text-white shadow-[0_6px_14px_rgba(236,72,153,0.35)]">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-xl p-2.5 text-gray-600 transition-colors hover:bg-pink-50 md:hidden"
            aria-label="Menu"
          >
            <HamburgerIcon />
          </button>
        </div>
      </div>

      {megaOpen && (
        <div className="absolute inset-x-0 top-full hidden border-y border-pink-50 bg-white/97 shadow-[0_24px_70px_rgba(255,77,109,0.14)] backdrop-blur-xl xl:block">
          <div className="mx-auto grid max-w-7xl grid-cols-[1.1fr_2.4fr] gap-8 px-6 py-7">
            <div className="rounded-[24px] bg-gradient-to-br from-pink-50 to-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">Categorias KA</p>
              <h2 className="mt-2 text-2xl font-black text-gray-900">Tudo organizado para encontrar rápido.</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                Navegue pelas linhas da loja, filtre por preço e abra a compra rápida sem sair da vitrine.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/produtos" onClick={() => setMegaOpen(false)} className="rounded-full bg-pink-500 px-4 py-2 text-xs font-bold text-white">
                  Ver tudo
                </Link>
                <Link href="/produtos?promo=true" onClick={() => setMegaOpen(false)} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-pink-500 shadow-sm">
                  Promoções
                </Link>
                <Link href="/produtos?new=true" onClick={() => setMegaOpen(false)} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-pink-500 shadow-sm">
                  Novidades
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              {groups.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-400">{group.title}</p>
                  <div className="space-y-1.5">
                    {group.categories.map((category) => (
                      <Link
                        key={category.slug}
                        href={`/categoria/${category.slug}`}
                        onClick={() => setMegaOpen(false)}
                        className="flex items-center gap-2 rounded-2xl px-2 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-pink-50 hover:text-pink-500"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-50 text-[10px] font-black text-pink-500">
                          {category.icon}
                        </span>
                        {getPublicCategoryName(category)}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <button type="button" className="absolute inset-0 bg-black/35 backdrop-blur-sm" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />
          <aside className="ka-mobile-drawer absolute right-0 top-0 flex h-full w-[90vw] max-w-sm flex-col overflow-hidden rounded-l-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-pink-50 px-5 py-4">
              <Image
                src="/images/brand/ka-bijoux-logo-header-320.png"
                alt="KA Bijoux"
                width={320}
                height={294}
                sizes="88px"
                quality={82}
                className="h-11 w-auto object-contain"
              />
              <button type="button" onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-xl leading-none text-pink-500" aria-label="Fechar menu">
                x
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5">
              <AutocompleteSearch
                value={search}
                onChange={setSearch}
                onChoose={navigateSearch}
                formClassName="relative z-40"
                inputClassName="w-full rounded-2xl border border-pink-100 bg-pink-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white"
                iconClassName="left-4 text-pink-400"
                placeholder="Buscar produtos, categorias e mais..."
                showSubmitButton={false}
              />

              <div className="mt-5 grid grid-cols-2 gap-2">
                {MENU_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-2xl border border-pink-100 bg-white px-3 py-3 text-center text-sm font-bold text-gray-800 shadow-sm transition-colors hover:bg-pink-50 hover:text-pink-500"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mt-6 space-y-5">
                {groups.map((group) => (
                  <div key={group.title}>
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-400">{group.title}</p>
                    <div className="space-y-2">
                      {group.categories.map((category) => (
                        <Link
                          key={category.slug}
                          href={`/categoria/${category.slug}`}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between rounded-2xl border border-pink-50 bg-white px-3 py-3 shadow-sm"
                        >
                          <span className="flex items-center gap-3 text-sm font-semibold text-gray-800">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 text-[10px] font-black text-pink-500">
                              {category.icon}
                            </span>
                            {getPublicCategoryName(category)}
                          </span>
                          <span className="text-pink-300">›</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

type SearchSuggestionProduct = {
  id: string;
  slug?: string;
  name: string;
  image?: string | null;
  price: number;
  promotionalPrice?: number | null;
  category?: { name?: string; slug?: string } | null;
};

type SearchPayload = { products?: SearchSuggestionProduct[] };
const RECENT_SEARCHES_KEY = "ka-recent-searches-v1";
const SEARCH_CACHE_TTL_MS = 30_000;
const searchSuggestionsCache = new Map<string, { expiresAt: number; products: SearchSuggestionProduct[] }>();
const SEARCH_CORRECTIONS: Record<string, string> = {
  carregdor: "carregador",
  carergador: "carregador",
  carregadore: "carregador",
};
const RELATED_SEARCH_TERMS = [
  { triggers: ["pul", "pulseira", "bracelete"], labels: ["Pulseiras", "Braceletes"] },
  { triggers: ["cap", "capinha", "capa celular"], labels: ["Capinhas", "Capas para celular"] },
  { triggers: ["perf", "perfume", "fragrancia"], labels: ["Perfumes", "Fragrâncias"] },
  { triggers: ["carreg", "fonte", "cabo"], labels: ["Carregadores", "Fontes", "Cabos"] },
  { triggers: ["fone", "headphone", "headset", "bluetooth"], labels: ["Fones sem fio", "Headphones", "Bluetooth"] },
];

function readRecentSearches() {
  try {
    const value = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const clean = query.trim().slice(0, 100);
  if (clean.length < 2) return;
  const recent = readRecentSearches().filter((item) => normalizeSearchKey(item) !== normalizeSearchKey(clean));
  try { window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([clean, ...recent].slice(0, 8))); } catch {}
}

async function loadSearchSuggestions(query: string, line: "normal" | "adult", signal: AbortSignal) {
  const cacheKey = `${line}:${normalizeSearchKey(query)}`;
  const cached = searchSuggestionsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.products;

  const params = new URLSearchParams({ q: query, page: "1", pageSize: "6", withImage: "true", suggestions: "true", line });
  const response = await fetch(`/api/products?${params.toString()}`, { signal });
  if (!response.ok) throw new Error("Search suggestions request failed");
  const payload = await response.json() as { data?: SearchPayload };
  const products = payload.data?.products ?? [];
  if (searchSuggestionsCache.size >= 100) searchSuggestionsCache.delete(searchSuggestionsCache.keys().next().value ?? cacheKey);
  searchSuggestionsCache.set(cacheKey, { products, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
  return products;
}

function AutocompleteSearch({
  value,
  onChange,
  onChoose,
  formClassName,
  inputClassName,
  iconClassName,
  placeholder,
  showSubmitButton,
  adultMode = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onChoose: (value: string) => void;
  formClassName: string;
  inputClassName: string;
  iconClassName: string;
  placeholder: string;
  showSubmitButton: boolean;
  adultMode?: boolean;
}) {
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  const [products, setProducts] = useState<SearchSuggestionProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const controller = useRef<AbortController | null>(null);
  const normalized = value.trim();
  const searchKey = normalizeSearchKey(normalized);
  const correction = SEARCH_CORRECTIONS[searchKey];
  const relatedTerms = RELATED_SEARCH_TERMS.find((group) => group.triggers.some((term) =>
    searchKey.length >= 2 && (normalizeSearchKey(term).startsWith(searchKey) || searchKey.includes(normalizeSearchKey(term))),
  ))?.labels ?? [];
  const categories = groups.flatMap((group) => group.categories).filter((category) => {
    if (adultMode) return category.slug === "sex-shop";
    if (category.slug === "sex-shop") return false;
    const terms = [category.name, category.publicName, category.slug, getPublicCategoryName(category)]
      .map(normalizeSearchKey).filter(Boolean);
    return terms.some((term) => term.includes(searchKey) || searchKey.includes(term.slice(0, Math.min(term.length, 3))));
  }).slice(0, 4);

  useEffect(() => {
    if (focused && !normalized) setRecent(readRecentSearches());
  }, [focused, normalized]);

  useEffect(() => {
    controller.current?.abort();
    setProducts([]);
    setLoading(false);
    if (!focused || searchKey.length < 3) {
      return;
    }
    const request = new AbortController();
    controller.current = request;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void loadSearchSuggestions(normalized, adultMode ? "adult" : "normal", request.signal)
        .then((items) => { if (!request.signal.aborted) setProducts(items); })
        .catch(() => { if (!request.signal.aborted) setProducts([]); })
        .finally(() => { if (!request.signal.aborted) setLoading(false); });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      request.abort();
    };
  }, [adultMode, focused, normalized, searchKey]);

  useEffect(() => () => controller.current?.abort(), []);

  function chooseSearch(query: string) {
    saveRecentSearch(query);
    setFocused(false);
    onChoose(query);
  }

  function chooseProduct(product: SearchSuggestionProduct) {
    saveRecentSearch(normalized);
    setFocused(false);
    router.push(`/produto/${encodeURIComponent(product.slug ?? product.id)}`);
  }

  const showPanel = focused && (searchKey.length === 0 || searchKey.length >= 3);
  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); chooseSearch(normalized); }}
      className={formClassName}
      role="search"
    >
      <SearchIcon className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 ${iconClassName}`} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 160)}
        placeholder={placeholder}
        autoComplete="off"
        aria-label="Buscar produtos e categorias"
        aria-expanded={showPanel}
        className={inputClassName}
      />
      {showSubmitButton && (
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl bg-pink-500 text-white transition-colors hover:bg-pink-600 sm:h-8 sm:w-8"
          aria-label="Ver resultados da busca"
        >
          <SearchIcon className="h-3.5 w-3.5" />
        </button>
      )}

      {showPanel && (
        <div
          className="absolute inset-x-0 top-full z-[90] mt-2 max-h-[min(72vh,560px)] overflow-y-auto rounded-2xl border border-pink-100 bg-white p-2 shadow-[0_20px_60px_rgba(105,36,62,0.2)]"
          onMouseDown={(event) => event.preventDefault()}
        >
          {searchKey.length === 0 ? (
            <>
              {recent.length > 0 ? (
                <div className="mb-2">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Pesquisas recentes</span>
                    <button type="button" className="text-xs font-semibold text-pink-600" onClick={() => {
                      try { window.localStorage.removeItem(RECENT_SEARCHES_KEY); } catch {}
                      setRecent([]);
                    }}>Limpar</button>
                  </div>
                  {recent.map((item) => (
                    <button key={item} type="button" onClick={() => chooseSearch(item)} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-gray-700 hover:bg-pink-50">
                      <span aria-hidden="true">↻</span>{item}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-2 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">Explore categorias</p>
              )}
              {groups.flatMap((group) => group.categories)
                .filter((category) => adultMode ? category.slug === "sex-shop" : category.slug !== "sex-shop")
                .slice(0, 5)
                .map((category) => (
                  <Link key={category.slug} href={`/categoria/${category.slug}`} onClick={() => setFocused(false)} className="block rounded-xl px-2 py-2 text-sm font-medium text-gray-700 hover:bg-pink-50">
                    {getPublicCategoryName(category)}
                  </Link>
                ))}
            </>
          ) : searchKey.length < 3 ? (
            <p className="px-2 py-3 text-sm text-gray-500">Digite mais {3 - searchKey.length} caractere{searchKey.length === 1 ? "s" : "s"} para ver sugestões.</p>
          ) : (
            <>
              {correction && (
                <button type="button" onClick={() => chooseSearch(correction)} className="mb-1 w-full rounded-xl px-2 py-2 text-left text-sm text-gray-700 hover:bg-pink-50">
                  Você quis dizer <strong className="text-pink-700">{correction}</strong>?
                </button>
              )}
              {relatedTerms.length > 0 && (
                <div className="mb-1 border-b border-pink-50 pb-1">
                  <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Sugestões de busca</p>
                  <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                    {relatedTerms.map((term) => (
                      <button key={term} type="button" onClick={() => chooseSearch(term)} className="rounded-full border border-pink-100 bg-pink-50/70 px-2.5 py-1.5 text-xs font-semibold text-[#7a3049] hover:bg-pink-100">
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {categories.length > 0 && (
                <div className="mb-1 border-b border-pink-50 pb-1">
                  <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Categorias</p>
                  {categories.map((category) => (
                    <Link key={category.slug} href={`/categoria/${category.slug}`} onClick={() => setFocused(false)} className="block rounded-xl px-2 py-2 text-sm font-medium text-gray-700 hover:bg-pink-50">
                      {getPublicCategoryName(category)}
                    </Link>
                  ))}
                </div>
              )}
              <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Produtos</p>
              {loading && products.length === 0 ? <p className="px-2 py-3 text-sm text-gray-500">Buscando…</p> : null}
              {products.map((product) => {
                const price = product.promotionalPrice && product.promotionalPrice < product.price ? product.promotionalPrice : product.price;
                return (
                  <button key={product.id} type="button" onClick={() => chooseProduct(product)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-pink-50">
                    {product.image ? <Image src={product.image} alt="" width={48} height={48} unoptimized className="h-12 w-12 shrink-0 rounded-lg bg-pink-50 object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-400"><SearchIcon className="h-5 w-5" /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-800">{product.name}</span>
                      <span className="block text-sm font-bold text-pink-600">{currency.format(price)}</span>
                    </span>
                  </button>
                );
              })}
              {!loading && products.length === 0 && categories.length === 0 ? <p className="px-2 py-3 text-sm text-gray-500">Ainda não encontramos produtos para esse termo.</p> : null}
              <button type="button" onClick={() => chooseSearch(normalized)} className="mt-1 w-full rounded-xl border-t border-pink-50 px-2 py-3 text-left text-sm font-bold text-pink-600 hover:bg-pink-50">
                Ver todos os resultados para “{normalized}”
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}

function HeaderSparkles() {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-[90px] right-[88px] z-0 overflow-hidden sm:left-[112px] sm:right-[102px] md:left-[158px] md:right-[120px]" aria-hidden="true">
      <span className="ka-header-shimmer" />
      <span className="ka-header-sparkle" style={{ left: "8%", top: "58%", animationDelay: "0s", animationDuration: "6.2s" }} />
      <span className="ka-header-sparkle" style={{ left: "28%", top: "34%", animationDelay: "1.6s", animationDuration: "7s" }} />
      <span className="ka-header-sparkle" style={{ left: "54%", top: "64%", animationDelay: "3.1s", animationDuration: "6.8s" }} />
      <span className="ka-header-sparkle" style={{ left: "78%", top: "32%", animationDelay: "2.2s", animationDuration: "7.6s" }} />
      <span className="ka-header-glint" style={{ left: "40%", top: "24%", animationDelay: "2.8s" }} />
    </div>
  );
}

function normalizeSearchKey(value: string | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function BagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
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

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
