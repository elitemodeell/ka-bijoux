import Link from "next/link";

const QUICK_CATS = [
  { label: "Novidades",  emoji: "✨", href: "/produtos?new=true" },
  { label: "Promoções",  emoji: "🏷️", href: "/produtos?promo=true" },
  { label: "Lançamentos",emoji: "🆕", href: "/produtos?sort=createdAt" },
  { label: "Bijuterias", emoji: "💎", href: "/categoria/bijuterias" },
  { label: "Capinhas",   emoji: "📱", href: "/categoria/capinhas-acessorios-celular" },
  { label: "Bolsas",     emoji: "👜", href: "/categoria/bolsas-necessaires" },
  { label: "Maquiagem",  emoji: "💄", href: "/categoria/maquiagem" },
  { label: "Utilidades", emoji: "🏡", href: "/categoria/utilidades-domesticas" },
  { label: "Perfumes",   emoji: "🌸", href: "/categoria/perfumaria" },
  { label: "Ver Mais",   emoji: "☰",  href: "/produtos" },
];

export default function QuickCategoryBar() {
  return (
    <nav
      aria-label="Categorias rápidas"
      className="bg-white border-b border-pink-100 px-3 py-3 sm:py-4 sm:px-6"
    >
      {/* Mobile: 5×2 grid | Desktop: 1 row */}
      <div className="grid grid-cols-5 gap-y-3 gap-x-1 sm:flex sm:justify-center sm:gap-3">
        {QUICK_CATS.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="group flex flex-col items-center gap-1"
          >
            <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-gradient-to-br from-pink-50 to-rose-100 text-xl ring-2 ring-pink-200 transition-transform duration-200 group-hover:scale-110 group-active:scale-95 sm:h-[54px] sm:w-[54px] sm:text-2xl">
              {cat.emoji}
            </span>
            <span className="text-center text-[10px] font-semibold leading-tight text-gray-700 sm:text-[11px]">
              {cat.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
