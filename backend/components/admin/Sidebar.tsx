"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard",   href: "/admin/dashboard",     icon: "📊" },
  { label: "Produtos",    href: "/admin/produtos",       icon: "💎" },
  { label: "Produtos Bling", href: "/admin/produtos/bling", icon: "B" },
  { label: "Categorias",  href: "/admin/categorias",     icon: "🏷️" },
  { label: "Stories",     href: "/admin/stories",        icon: "S" },
  { label: "Distribuição Play", href: "/admin/distribuicao-play", icon: "P" },
  { label: "Pedidos",     href: "/admin/pedidos",        icon: "📦" },
  { label: "Clientes",    href: "/admin/clientes",       icon: "👥" },
  { label: "Estoque",     href: "/admin/estoque",        icon: "📋" },
  { label: "Relatórios",  href: "/admin/relatorios",     icon: "📈" },
  { label: "Configurações", href: "/admin/configuracoes", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (media.matches) setOpen(false); };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!open) { if (element.open) element.close(); return; }
    element.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; if (element.open) element.close(); };
  }, [open]);

  const activeHref = navItems.filter(item => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const navigation = (mobile: boolean) => (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-pink-50 px-5 py-5">
        <div>
          <p className="font-bold text-gray-800">KA Bijoux</p>
          <p className="text-xs text-gray-500">Painel administrativo</p>
        </div>
        {mobile && (
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        )}
      </div>
      <nav aria-label="Menu administrativo" className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(item => (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
            aria-current={activeHref === item.href ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${activeHref === item.href ? "bg-pink-50 text-pink-600" : "text-gray-600 hover:bg-gray-50"}`}>
            <span aria-hidden="true" className="w-5 shrink-0 text-center">{item.icon}</span>{item.label}
          </Link>
        ))}
      </nav>
      <form action="/api/auth/admin/logout" method="POST" className="px-3 pb-5">
        <button type="submit" className="min-h-11 w-full rounded-xl px-3 text-left text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600">Sair</button>
      </form>
    </>
  );
  return (
    <>
      <header className="admin-mobile-header sticky top-0 z-40 flex items-center gap-3 border-b border-pink-100 bg-white px-4 py-3 lg:hidden">
        <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open} aria-controls="admin-mobile-menu" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div><p className="text-sm font-bold text-gray-900">KA Bijoux</p><p className="text-xs text-gray-500">Painel administrativo</p></div>
      </header>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-gray-100 bg-white lg:flex">{navigation(false)}</aside>
      <dialog ref={dialog} id="admin-mobile-menu" aria-label="Menu administrativo" className="admin-drawer w-[min(88vw,320px)] max-w-none border-0 bg-white p-0 text-gray-900 shadow-xl"
        onCancel={() => setOpen(false)} onClose={() => { setOpen(false); trigger.current?.focus(); }}
        onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setOpen(false); } }}>
        <div className="flex min-h-full flex-col pb-[env(safe-area-inset-bottom)]">{navigation(true)}</div>
      </dialog>
    </>
  );
}
