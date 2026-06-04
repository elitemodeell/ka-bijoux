"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCategoryGroups, getPublicCategoryName } from "@/lib/catalog";

const FEATURED_LINKS = [
  { label: "Início", href: "/" },
  { label: "Bijuterias", href: "/categoria/bijuterias" },
  { label: "Óculos", href: "/categoria/oculos" },
  { label: "Capinhas", href: "/categoria/capinhas-acessorios-celular" },
];

const groups = getCategoryGroups();

export default function Navbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [search, setSearch] = useState("");

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

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = search.trim();
    setMenuOpen(false);
    setMegaOpen(false);
    router.push(value ? `/produtos?q=${encodeURIComponent(value)}` : "/produtos");
  }

  return (
    <header
      className={`fixed inset-x-0 top-12 z-40 transition-all duration-300 md:top-0 md:z-50 ${
        scrolled
          ? "border-b border-pink-50 bg-white/95 shadow-sm backdrop-blur-md"
          : "border-b border-pink-50 bg-white/85 backdrop-blur-md md:border-transparent md:bg-transparent md:backdrop-blur-0"
      }`}
      onMouseLeave={() => setMegaOpen(false)}
    >
      <div className="relative isolate mx-auto flex h-[66px] max-w-7xl items-center justify-between overflow-hidden px-4 md:h-[70px] md:px-5">
        <HeaderSparkles />

        <Link href="/" className="relative z-10 flex shrink-0 items-center" aria-label="KA Bijoux">
          <picture>
            <source srcSet="/images/brand/ka-bijoux-logo-header-640.webp" type="image/webp" />
            <img
              src="/images/brand/ka-bijoux-logo-header-320.png"
              alt="KA Bijoux"
              className="h-11 w-auto max-w-[150px] object-contain md:h-12 md:max-w-[170px]"
            />
          </picture>
        </Link>

        <nav className="relative z-10 hidden items-center gap-6 md:flex">
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
          <button
            type="button"
            onClick={() => setMegaOpen((current) => !current)}
            onMouseEnter={() => setMegaOpen(true)}
            className="rounded-full border border-pink-100 bg-white/75 px-4 py-2 text-sm font-semibold text-pink-500 shadow-sm backdrop-blur transition-colors hover:bg-pink-50"
          >
            Categorias
          </button>
        </nav>

        <div className="relative z-10 flex items-center gap-1 self-center">
          <button
            type="button"
            onClick={() => router.push("/produtos")}
            className="rounded-xl p-2.5 transition-colors hover:bg-pink-50 group"
            aria-label="Buscar"
          >
            <SearchIcon className="h-[18px] w-[18px] text-gray-500 transition-colors group-hover:text-pink-500" />
          </button>

          <Link href="/carrinho" className="rounded-xl p-2.5 transition-colors hover:bg-pink-50 group" aria-label="Carrinho">
            <BagIcon className="h-[18px] w-[18px] text-gray-500 transition-colors group-hover:text-pink-500" />
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-xl p-2.5 transition-colors hover:bg-pink-50 md:hidden"
            aria-label="Menu"
          >
            <HamburgerIcon />
          </button>
        </div>
      </div>

      {megaOpen && (
        <div className="absolute inset-x-0 top-full hidden border-y border-pink-50 bg-white/97 shadow-[0_24px_70px_rgba(255,77,109,0.14)] backdrop-blur-xl md:block">
          <div className="mx-auto grid max-w-7xl grid-cols-[1.1fr_2.4fr] gap-8 px-6 py-7">
            <div className="rounded-[24px] bg-gradient-to-br from-pink-50 to-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">Categorias KA</p>
              <h2 className="mt-2 text-2xl font-black text-gray-900">Tudo organizado para encontrar rápido.</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                Navegue pelas linhas da loja, filtre por preço único e abra a compra rápida sem sair da home.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/produtos" onClick={() => setMegaOpen(false)} className="rounded-full bg-pink-500 px-4 py-2 text-xs font-bold text-white">
                  Ver tudo
                </Link>
                <Link href="/produtos?promo=true" onClick={() => setMegaOpen(false)} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-pink-500 shadow-sm">
                  Promoções
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
          <aside className="absolute right-0 top-0 flex h-full w-[88vw] max-w-sm flex-col overflow-hidden rounded-l-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-pink-50 px-5 py-4">
              <img src="/images/brand/ka-bijoux-logo-header-320.png" alt="KA Bijoux" className="h-11 w-auto object-contain" />
              <button type="button" onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-xl text-pink-500">
                x
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5">
              <form onSubmit={submitSearch} className="relative">
                <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar produtos"
                  className="w-full rounded-2xl border border-pink-100 bg-pink-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white"
                />
              </form>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/produtos" onClick={() => setMenuOpen(false)} className="rounded-2xl bg-pink-500 px-4 py-3 text-center text-sm font-bold text-white">
                  Ver tudo
                </Link>
                <Link href="/produtos?promo=true" onClick={() => setMenuOpen(false)} className="rounded-2xl border border-pink-100 bg-white px-4 py-3 text-center text-sm font-bold text-pink-500">
                  Promoções
                </Link>
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

              <a
                href="https://wa.me/5537999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex items-center justify-center rounded-2xl bg-green-500 px-5 py-3 text-sm font-bold text-white"
              >
                Falar no WhatsApp
              </a>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

function HeaderSparkles() {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-[34%] right-[104px] z-0 overflow-hidden sm:left-[26%] sm:right-[128px] md:left-[185px] md:right-[148px]" aria-hidden="true">
      <span className="ka-header-shimmer" />
      <span className="ka-header-sparkle" style={{ left: "8%", top: "58%", animationDelay: "0s", animationDuration: "6.2s" }} />
      <span className="ka-header-sparkle" style={{ left: "24%", top: "38%", animationDelay: "1.6s", animationDuration: "7s" }} />
      <span className="ka-header-sparkle" style={{ left: "46%", top: "62%", animationDelay: "3.1s", animationDuration: "6.8s" }} />
      <span className="ka-header-sparkle" style={{ left: "68%", top: "32%", animationDelay: "2.2s", animationDuration: "7.6s" }} />
      <span className="ka-header-sparkle" style={{ left: "86%", top: "52%", animationDelay: "4s", animationDuration: "6.5s" }} />
      <span className="ka-header-glint" style={{ left: "36%", top: "24%", animationDelay: "2.8s" }} />
    </div>
  );
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

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
