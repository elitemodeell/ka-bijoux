import Link from "next/link";

const QUICK_CATS = [
  {
    label: "Novidades",
    description: "Confira o que acabou de chegar.",
    icon: "sparkles",
    href: "/produtos?new=true",
  },
  {
    label: "Promoções",
    description: "Descontos especiais.",
    icon: "tag",
    href: "/produtos?promo=true",
  },
  {
    label: "Lançamentos",
    description: "As tendências do momento.",
    icon: "new",
    href: "/produtos?sort=createdAt",
  },
  {
    label: "Bijuterias",
    description: "Peças para todos os estilos.",
    icon: "diamond",
    href: "/categoria/bijuterias",
  },
  {
    label: "Capinhas",
    description: "Proteção com muito estilo.",
    icon: "phone",
    href: "/categoria/capinhas-acessorios-celular",
  },
  {
    label: "Sex Shop",
    description: "Bem-estar e prazer.",
    icon: "heart",
    href: "/categoria/sex-shop",
  },
] as const;

type CategoryIconName = (typeof QUICK_CATS)[number]["icon"];

export default function QuickCategoryBar() {
  return (
    <nav
      aria-label="Categorias rápidas"
      className="border-b border-pink-100/80 bg-gradient-to-b from-white via-[#fffafd] to-[#fff6fa] px-2.5 py-4 sm:px-6 sm:py-6"
    >
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[30px] border border-pink-100/90 bg-white/95 p-2.5 shadow-[0_18px_48px_rgba(190,24,93,0.10)] ring-1 ring-white sm:rounded-[34px] sm:p-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {QUICK_CATS.map((category) => (
              <Link
                key={category.href}
                href={category.href}
                aria-label={`Abrir categoria ${category.label}`}
                className="group relative flex h-[180px] min-w-0 flex-col items-center overflow-hidden rounded-[25px] border border-pink-100/90 bg-gradient-to-br from-white via-white to-[#fff7fa] px-2 pb-10 pt-3 text-center shadow-[0_10px_24px_rgba(190,24,93,0.08)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-pink-200 hover:shadow-[0_18px_34px_rgba(190,24,93,0.16)] active:scale-[1.025] active:border-pink-300 active:shadow-[0_20px_38px_rgba(236,72,153,0.22)] min-[360px]:h-[170px] sm:h-[210px] sm:rounded-[30px] sm:px-4 sm:pb-14 sm:pt-5"
              >
                <span
                  className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent"
                  aria-hidden="true"
                />
                <span
                  className="pointer-events-none absolute right-2.5 top-2.5 text-[#ff9c83] opacity-80 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 sm:right-4 sm:top-4"
                  aria-hidden="true"
                >
                  <MiniSparkle />
                </span>

                <span className="relative flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full border border-[#ffc5d4] bg-gradient-to-br from-white via-[#fff2f6] to-[#ffe8ef] shadow-[inset_0_2px_5px_rgba(255,255,255,0.95),0_10px_22px_rgba(236,72,153,0.16)] transition-transform duration-300 group-hover:scale-105 group-active:scale-110 sm:h-[92px] sm:w-[92px]">
                  <span
                    className="absolute inset-[5px] rounded-full border border-white/90"
                    aria-hidden="true"
                  />
                  <CategoryIcon name={category.icon} />
                </span>

                <span className="mt-2 block max-w-full text-[10px] font-black leading-tight text-[#192131] min-[360px]:text-[12px] sm:mt-3 sm:text-lg">
                  {category.label}
                </span>
                <span className="mt-1 line-clamp-3 max-w-full text-[9px] font-medium leading-[1.3] text-[#687080] sm:mt-1.5 sm:text-[13px] sm:leading-snug">
                  {category.description}
                </span>

                <span className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#ff5b8d] to-[#f43069] text-white shadow-[0_8px_18px_rgba(244,48,105,0.30)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:shadow-[0_10px_22px_rgba(244,48,105,0.42)] sm:bottom-4 sm:right-4 sm:h-9 sm:w-9">
                  <ArrowRightIcon />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function CategoryIcon({ name }: { name: CategoryIconName }) {
  if (name === "tag") {
    return (
      <svg className="relative h-[52px] w-[52px] drop-shadow-[0_7px_8px_rgba(190,24,93,0.20)] sm:h-[72px] sm:w-[72px]" viewBox="0 0 80 80" aria-hidden="true">
        <defs>
          <linearGradient id="category-tag-fill" x1="19" y1="12" x2="63" y2="68" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF7A9E" />
            <stop offset=".55" stopColor="#F13D78" />
            <stop offset="1" stopColor="#C8195B" />
          </linearGradient>
          <linearGradient id="category-tag-gloss" x1="28" y1="18" x2="46" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity=".86" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M17 13h26l24 24a6 6 0 0 1 0 8.5L46 66.5a6 6 0 0 1-8.5 0L13.5 42.5V17A4 4 0 0 1 17 13Z" fill="url(#category-tag-fill)" stroke="#AF114C" strokeWidth="2" />
        <path d="M20 17h20l20 20" fill="none" stroke="url(#category-tag-gloss)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="27" cy="27" r="6.5" fill="#FFF8FB" stroke="#FFB5C9" strokeWidth="2" />
        <circle cx="27" cy="27" r="2.5" fill="#D51D5D" />
        <text x="43" y="50" fill="white" fontSize="21" fontWeight="900" textAnchor="middle">%</text>
      </svg>
    );
  }

  if (name === "new") {
    return (
      <svg className="relative h-[54px] w-[54px] drop-shadow-[0_7px_8px_rgba(190,24,93,0.20)] sm:h-[74px] sm:w-[74px]" viewBox="0 0 80 80" aria-hidden="true">
        <defs>
          <linearGradient id="category-new-fill" x1="18" y1="12" x2="61" y2="69" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF8EAA" />
            <stop offset=".5" stopColor="#F44579" />
            <stop offset="1" stopColor="#C71858" />
          </linearGradient>
        </defs>
        <path d="m40 7 7 6 9-1 3.5 8.5L68 24l-1 9 6 7-6 7 1 9-8.5 3.5L56 68l-9-1-7 6-7-6-9 1-3.5-8.5L12 56l1-9-6-7 6-7-1-9 8.5-3.5L24 12l9 1 7-6Z" fill="url(#category-new-fill)" stroke="#B6114E" strokeWidth="2" />
        <path d="M23 24c7-8 21-10 33-3" fill="none" stroke="white" strokeOpacity=".52" strokeWidth="4" strokeLinecap="round" />
        <rect x="17" y="29" width="46" height="24" rx="8" fill="white" fillOpacity=".94" />
        <text x="40" y="46" fill="#E52B69" fontSize="15" fontWeight="900" textAnchor="middle">NEW</text>
      </svg>
    );
  }

  if (name === "diamond") {
    return (
      <svg className="relative h-[56px] w-[56px] drop-shadow-[0_7px_8px_rgba(190,24,93,0.20)] sm:h-[76px] sm:w-[76px]" viewBox="0 0 80 80" aria-hidden="true">
        <defs>
          <linearGradient id="category-gem-fill" x1="21" y1="31" x2="58" y2="67" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF9CB8" />
            <stop offset=".45" stopColor="#F53F7A" />
            <stop offset="1" stopColor="#B71051" />
          </linearGradient>
          <linearGradient id="category-gold-fill" x1="15" y1="12" x2="63" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF1A8" />
            <stop offset=".5" stopColor="#E5A42B" />
            <stop offset="1" stopColor="#B86B0B" />
          </linearGradient>
        </defs>
        <path d="M12 15c8 13 18 18 28 18s20-5 28-18" fill="none" stroke="url(#category-gold-fill)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="16" cy="20" r="2.5" fill="#EAB33F" />
        <circle cx="64" cy="20" r="2.5" fill="#EAB33F" />
        <path d="m40 25 7 7-7 8-7-8 7-7Z" fill="#FFD766" stroke="#B97012" strokeWidth="1.5" />
        <path d="m19 44 9-12h24l9 12-21 25-21-25Z" fill="url(#category-gem-fill)" stroke="#A90E49" strokeWidth="2" />
        <path d="M19 44h42M28 32l12 37M52 32 40 69M28 32l12 12 12-12" fill="none" stroke="#FFD4DF" strokeWidth="2" strokeLinejoin="round" />
        <path d="m30 41 8-7" stroke="white" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg className="relative h-[54px] w-[54px] drop-shadow-[0_8px_8px_rgba(190,24,93,0.20)] sm:h-[74px] sm:w-[74px]" viewBox="0 0 80 80" aria-hidden="true">
        <defs>
          <linearGradient id="category-phone-fill" x1="23" y1="10" x2="59" y2="72" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF95B3" />
            <stop offset=".52" stopColor="#F34A7D" />
            <stop offset="1" stopColor="#C51A59" />
          </linearGradient>
          <pattern id="category-phone-quilt" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M0 7 7 0l7 7-7 7L0 7Z" fill="none" stroke="white" strokeOpacity=".28" strokeWidth="1.2" />
          </pattern>
        </defs>
        <rect x="21" y="6" width="40" height="68" rx="12" fill="url(#category-phone-fill)" stroke="#A90E49" strokeWidth="2" />
        <rect x="24" y="9" width="34" height="62" rx="9" fill="url(#category-phone-quilt)" />
        <rect x="27" y="12" width="18" height="22" rx="7" fill="#202534" stroke="#FFD7E1" strokeWidth="2" />
        <circle cx="33" cy="19" r="3.5" fill="#91C8F2" stroke="white" strokeWidth="1.5" />
        <circle cx="40" cy="27" r="3.5" fill="#91C8F2" stroke="white" strokeWidth="1.5" />
        <path d="M41 47c-5-6-14 1-5 9l5 4 5-4c9-8 0-15-5-9Z" fill="#FFD466" stroke="#A96712" strokeWidth="1.5" />
        <path d="M49 12c4 2 6 5 7 9" fill="none" stroke="white" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg className="relative h-[55px] w-[55px] drop-shadow-[0_8px_8px_rgba(190,24,93,0.24)] sm:h-[75px] sm:w-[75px]" viewBox="0 0 80 80" aria-hidden="true">
        <defs>
          <radialGradient id="category-heart-fill" cx="0" cy="0" r="1" gradientTransform="translate(29 24) rotate(52) scale(54)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFB5C9" />
            <stop offset=".34" stopColor="#FA4D88" />
            <stop offset=".72" stopColor="#D41963" />
            <stop offset="1" stopColor="#950638" />
          </radialGradient>
        </defs>
        <path d="M40 70S10 53 10 29.5C10 17 20 10 29 10c5.8 0 9.2 3.3 11 6.2C41.8 13.3 45.2 10 51 10c9 0 19 7 19 19.5C70 53 40 70 40 70Z" fill="url(#category-heart-fill)" stroke="#8F0737" strokeWidth="2.5" />
        <path d="M23 21c5-5 12-4 15 1" fill="none" stroke="white" strokeOpacity=".75" strokeWidth="5" strokeLinecap="round" />
        <path d="M58 42v14M51 49h14" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="58" cy="49" r="11" fill="none" stroke="white" strokeOpacity=".25" strokeWidth="2" />
      </svg>
    );
  }

  return (
    <svg className="relative h-[56px] w-[56px] drop-shadow-[0_8px_8px_rgba(190,24,93,0.22)] sm:h-[76px] sm:w-[76px]" viewBox="0 0 80 80" aria-hidden="true">
      <defs>
        <linearGradient id="category-star-fill" x1="18" y1="10" x2="61" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFAFBF" />
          <stop offset=".42" stopColor="#F54A81" />
          <stop offset="1" stopColor="#B80E4F" />
        </linearGradient>
        <linearGradient id="category-star-facet" x1="30" y1="19" x2="48" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity=".8" />
          <stop offset="1" stopColor="#7F002F" stopOpacity=".28" />
        </linearGradient>
      </defs>
      <path d="m40 7 8.5 20.5L70 30l-16 14 5 22-19-11.5L21 66l5-22-16-14 21.5-2.5L40 7Z" fill="url(#category-star-fill)" stroke="#A70A45" strokeWidth="2" strokeLinejoin="round" />
      <path d="m40 7 .5 47.5L26 44l5.5-16.5L40 7Z" fill="url(#category-star-facet)" opacity=".72" />
      <path d="M27 27c5-8 13-11 21-8" fill="none" stroke="white" strokeOpacity=".72" strokeWidth="4" strokeLinecap="round" />
      <path d="m65 8 2.1 5.9L73 16l-5.9 2.1L65 24l-2.1-5.9L57 16l5.9-2.1L65 8Z" fill="#FF7A61" />
    </svg>
  );
}

function MiniSparkle() {
  return (
    <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 1.5 2.1 7.1 7.1 2.1-7.1 2.1L12 20l-2.1-7.2-7.1-2.1 7.1-2.1L12 1.5Z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
