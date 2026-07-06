import Link from "next/link";

const QUICK_CATS = [
  { label: "Novidades",  emoji: "✨", href: "/produtos?new=true" },
  { label: "Promoções",  emoji: "🏷️", href: "/produtos?promo=true" },
  { label: "Lançamentos",emoji: "🆕", href: "/produtos?sort=createdAt" },
  { label: "Bijuterias", emoji: "💎", href: "/categoria/bijuterias" },
  { label: "Capinhas",   emoji: "📱", href: "/categoria/capinhas-acessorios-celular" },
  { label: "Bolsas",     emoji: "👜", href: "/categoria/bolsas-necessaires" },
  { label: "Maquiagem",  emoji: "💄", href: "/categoria/maquiagem" },
  { label: "Óculos",     emoji: "🕶️", href: "/categoria/oculos" },
  { label: "Infantil",   emoji: "🎀", href: "/categoria/roupa-infantil" },
  { label: "Mais",       emoji: "☰",  href: "/produtos" },
];

export default function QuickCategoryBar() {
  return (
    <nav
      aria-label="Categorias rápidas"
      className="bg-white border-b border-pink-50"
    >
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-start gap-1 px-3 py-3 min-w-max sm:justify-center sm:min-w-0 sm:gap-2 sm:px-6">
          {QUICK_CATS.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5 sm:w-[76px]"
            >
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-pink-50 to-rose-100 text-2xl ring-2 ring-pink-200 transition-transform duration-200 group-hover:scale-110 group-active:scale-95 sm:h-[58px] sm:w-[58px]">
                {cat.emoji}
              </span>
              <span className="text-center text-[10px] font-semibold leading-tight text-gray-700 sm:text-[11px]">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
