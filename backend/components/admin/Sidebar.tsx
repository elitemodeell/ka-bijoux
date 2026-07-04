"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard",   href: "/admin/dashboard",     icon: "📊" },
  { label: "Produtos",    href: "/admin/produtos",       icon: "💎" },
  { label: "Produtos Bling", href: "/admin/produtos/bling", icon: "B" },
  { label: "Categorias",  href: "/admin/categorias",     icon: "🏷️" },
  { label: "Stories",     href: "/admin/stories",        icon: "S" },
  { label: "Pedidos",     href: "/admin/pedidos",        icon: "📦" },
  { label: "Clientes",    href: "/admin/clientes",       icon: "👥" },
  { label: "Estoque",     href: "/admin/estoque",        icon: "📋" },
  { label: "Relatórios",  href: "/admin/relatorios",     icon: "📈" },
  { label: "Configurações", href: "/admin/configuracoes", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-pink-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pink-500 rounded-2xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">KA</span>
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm leading-tight">KA Bijoux</p>
            <p className="text-xs text-gray-400">Painel Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-pink-50 text-pink-600 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5">
        <form action="/api/auth/admin/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <span>🚪</span>
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
