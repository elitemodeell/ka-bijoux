import Link from "next/link";
import { HOME_QUICK_CATEGORIES } from "@/lib/home-content";

type CategoryIconName = (typeof HOME_QUICK_CATEGORIES)[number]["icon"];

export default function QuickCategoryBar() {
  return (
    <nav
      aria-label="Categorias rápidas"
      className="mx-3 my-2 overflow-hidden rounded-[22px] border border-pink-100 bg-white/95 px-1.5 py-2 shadow-[0_5px_18px_rgba(166,22,70,0.08)] sm:mx-auto sm:my-5 sm:max-w-5xl sm:px-3 sm:py-3"
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-6 divide-x divide-pink-200/80">
            {HOME_QUICK_CATEGORIES.map((category) => (
              <Link
                key={category.href}
                href={category.href}
                aria-label={`Abrir ${category.label}: ${category.description}`}
                className="group flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-pink-600 transition-colors hover:bg-pink-50 sm:min-h-[72px] sm:gap-1.5"
              >
                <CompactCategoryIcon name={category.icon} />
                <span className="min-w-0 max-w-full text-center text-[8px] font-semibold leading-tight text-[#321522] min-[390px]:text-[9px] sm:text-sm">
                  {category.label}
                </span>
              </Link>
            ))}
        </div>
      </div>
    </nav>
  );
}

function CompactCategoryIcon({ name }: { name: CategoryIconName }) {
  const common = "h-[23px] w-[23px]";
  if (name === "grid") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
  if (name === "tag") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V4h9l8.6 8.6a.6.6 0 0 1 0 .8Z"/><circle cx="7.5" cy="8" r="1.2"/><path d="m15 10 4 4m-3-4h.01M17 14h.01"/></svg>;
  if (name === "new") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/></svg>;
  if (name === "sparkles") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></svg>;
  if (name === "diamond") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M3 8 6 4h12l3 4-9 12L3 8Z"/><path d="M3 8h18M6 4l3 4 3 12 3-12 3-4"/></svg>;
  if (name === "phone") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4m-3 14h2"/></svg>;
  if (name === "heart") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="m12 21-1.5-1.4C5 14.6 2 11.9 2 8.5A5.5 5.5 0 0 1 7.5 3 6 6 0 0 1 12 5a6 6 0 0 1 4.5-2A5.5 5.5 0 0 1 22 8.5c0 3.4-3 6.1-8.5 11.1L12 21Z"/></svg>;
  return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 3v18M3 12h18"/><path d="m5 5 14 14M19 5 5 19"/></svg>;
}

function CategoryIcon({ name }: { name: CategoryIconName }) {
  if (name === "grid") {
    return (
      <svg className="relative h-[56px] w-[56px]" viewBox="0 0 80 80" fill="none" stroke="#E62E71" strokeWidth="5" strokeLinecap="round" aria-hidden="true">
        <rect x="10" y="10" width="24" height="24" rx="4" /><rect x="46" y="10" width="24" height="24" rx="4" />
        <rect x="10" y="46" width="24" height="24" rx="4" /><rect x="46" y="46" width="24" height="24" rx="4" />
      </svg>
    );
  }
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

function ArrowRightIcon() {
  return (
    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
