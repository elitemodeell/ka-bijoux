"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Início",    href: "/" },
  { label: "Bijuterias", href: "/produtos?cat=bijuterias" },
  { label: "Óculos",   href: "/produtos?cat=oculos" },
  { label: "Capinhas", href: "/produtos?cat=capinhas" },
  { label: "Ver Tudo", href: "/produtos" },
];

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-pink-50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 h-[70px] flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 group" aria-label="KA Bijoux">
          <StarIcon className="w-5 h-5 text-pink-500 group-hover:rotate-12 transition-transform duration-300" />
          <span className="text-[22px] font-black text-pink-500 leading-none tracking-tight">KA</span>
          <span className="text-[22px] font-light text-gray-700 leading-none tracking-wide">Bijoux</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-gray-600 hover:text-pink-500 transition-colors relative group"
            >
              {label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-[2px] bg-pink-400 rounded-full group-hover:w-full transition-all duration-300" />
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            className="p-2.5 rounded-xl hover:bg-pink-50 transition-colors group"
            aria-label="Buscar"
          >
            <SearchIcon className="w-[18px] h-[18px] text-gray-500 group-hover:text-pink-500 transition-colors" />
          </button>

          <Link
            href="/carrinho"
            className="p-2.5 rounded-xl hover:bg-pink-50 transition-colors group"
            aria-label="Carrinho"
          >
            <BagIcon className="w-[18px] h-[18px] text-gray-500 group-hover:text-pink-500 transition-colors" />
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2.5 rounded-xl hover:bg-pink-50 transition-colors"
            aria-label="Menu"
          >
            {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          menuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-white/97 backdrop-blur-md border-t border-pink-50 px-6 py-5 flex flex-col gap-4">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="text-base font-medium text-gray-700 hover:text-pink-500 transition-colors py-0.5"
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-pink-50">
            <Link
              href="/admin/login"
              onClick={() => setMenuOpen(false)}
              className="text-xs text-gray-400 hover:text-pink-400 transition-colors"
            >
              Área Admin
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.09 6.26H21l-5.47 3.97 2.09 6.26L12 14.52l-5.62 3.97 2.09-6.26L3 8.26h6.91L12 2z" />
    </svg>
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
      <line x1="3" y1="6"  x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6"  y1="6" x2="18" y2="18" />
    </svg>
  );
}
