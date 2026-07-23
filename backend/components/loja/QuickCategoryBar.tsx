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
      className="bg-white border-b border-pink-100 px-3 py-3 sm:py-4 sm:px-6"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-6 items-start justify-items-center gap-x-1 sm:gap-x-6 lg:gap-x-12">
        {QUICK_CATS.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="group flex min-w-0 flex-col items-center gap-1.5"
          >
            <span className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-gradient-to-br from-pink-50 to-rose-100 text-pink-500 ring-2 ring-pink-200 transition-transform duration-200 group-hover:scale-110 group-active:scale-95 sm:h-[64px] sm:w-[64px]">
              <CategoryIcon name={cat.icon} />
            </span>
            <span className="max-w-full text-center text-[9px] font-bold leading-tight text-gray-800 sm:text-[12px]">
              {cat.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function CategoryIcon({ name }: { name: string }) {
  const iconClass = "h-7 w-7 sm:h-9 sm:w-9";

  if (name === "new") {
    return (
      <span className="flex h-6 w-9 items-center justify-center rounded-[5px] border-2 border-current text-[10px] font-black leading-none sm:h-8 sm:w-12 sm:text-sm">
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
