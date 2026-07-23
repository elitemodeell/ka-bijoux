import Link from "next/link";

const QUICK_CATS = [
  { label: "Novidades", icon: "sparkles", href: "/produtos?new=true" },
  { label: "Promoções", icon: "tag", href: "/produtos?promo=true" },
  { label: "Lançamentos", icon: "new", href: "/produtos?sort=createdAt" },
  { label: "Bijuterias", icon: "diamond", href: "/categoria/bijuterias" },
  { label: "Capinhas", icon: "phone", href: "/categoria/capinhas-acessorios-celular" },
  { label: "Sex Shop", icon: "heart-plus", href: "/categoria/sex-shop" },
];

export default function QuickCategoryBar() {
  return (
    <nav
      aria-label="Categorias rápidas"
      className="border-b border-pink-100/80 bg-gradient-to-b from-white to-[#fff8fb] px-3 py-3 sm:px-6 sm:py-4"
    >
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[24px] border border-pink-100 bg-white/95 p-2.5 shadow-[0_12px_28px_rgba(236,72,153,0.10)] sm:rounded-[28px] sm:p-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3 lg:gap-4">
            {QUICK_CATS.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group flex min-h-[82px] min-w-0 flex-col items-center justify-center gap-2 rounded-[20px] bg-gradient-to-br from-[#fff7fb] via-white to-[#fff1f6] px-1.5 py-2 text-center ring-1 ring-pink-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(236,72,153,0.14)] active:scale-95 sm:min-h-[92px] sm:rounded-[22px]"
              >
                <span className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white text-pink-500 shadow-[0_8px_18px_rgba(236,72,153,0.12)] ring-2 ring-pink-200 transition-transform duration-200 group-hover:scale-105 sm:h-[52px] sm:w-[52px]">
                  <CategoryIcon name={cat.icon} />
                </span>
                <span className="max-w-full text-center text-[11px] font-black leading-tight text-gray-800 sm:text-[12px]">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function CategoryIcon({ name }: { name: string }) {
  const iconClass = "h-6 w-6 sm:h-7 sm:w-7";

  if (name === "new") {
    return (
      <span className="flex h-5 w-8 items-center justify-center rounded-[5px] border-2 border-current text-[9px] font-black leading-none sm:h-6 sm:w-10 sm:text-xs">
        NEW
      </span>
    );
  }

  if (name === "tag") {
    return (
      <svg className={iconClass} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 10v14.5L25.5 43 43 25.5 24.5 7H10a3 3 0 0 0-3 3Z" />
        <circle cx="17" cy="17" r="3.5" />
      </svg>
    );
  }

  if (name === "diamond") {
    return (
      <svg className={iconClass} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18 16 8h16l7 10-15 22L9 18Z" />
        <path d="M9 18h30M16 8l8 32M32 8 24 40M16 8l-1 10M32 8l1 10" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg className={iconClass} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="14" y="6" width="20" height="36" rx="4" />
        <path d="M21 11h6M20 37h.1" />
      </svg>
    );
  }

  if (name === "heart-plus") {
    return (
      <svg className={iconClass} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M24 40S8 31 8 17.5C8 11.5 12.5 8 17.5 8c3.1 0 5.1 1.5 6.5 3.2C25.4 9.5 27.4 8 30.5 8c5 0 9.5 3.5 9.5 9.5C40 31 24 40 24 40Z" />
        <path d="M37 30v10M32 35h10" />
      </svg>
    );
  }

  return (
    <svg className={iconClass} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 22.6 17.4 34 20l-11.4 2.6L20 34l-2.6-11.4L6 20l11.4-2.6L20 6Z" />
      <path d="M36 27 37.5 33.5 44 35l-6.5 1.5L36 43l-1.5-6.5L28 35l6.5-1.5L36 27Z" />
    </svg>
  );
}
