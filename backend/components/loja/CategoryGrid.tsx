import Link from "next/link";
import Image from "next/image";
import { getHomeCategories, getPublicCategoryName } from "@/lib/catalog";
import AnimatedSection from "./AnimatedSection";

export default function CategoryGrid() {
  const categories = getHomeCategories();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {categories.map((cat, i) => (
        <AnimatedSection key={cat.slug} delay={i * 80}>
          <Link
            href={`/categoria/${cat.slug}`}
            className="ka-category-card group flex h-full min-h-[214px] flex-col overflow-hidden rounded-[22px] border border-pink-50 bg-white text-left shadow-[0_12px_34px_rgba(236,72,153,0.08)] hover:shadow-glow-lg"
          >
            <div className="relative aspect-[1.08] overflow-hidden bg-pink-50">
              {cat.image ? (
                <Image
                  src={cat.image}
                  alt={getPublicCategoryName(cat)}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 200px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-50 to-white text-sm font-black text-pink-500">
                  {cat.icon}
                </div>
              )}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pink-950/18 via-transparent to-white/8" />
            </div>
            <div className="flex flex-1 flex-col px-3.5 py-3">
              <p className="text-sm font-bold leading-snug text-gray-900">{getPublicCategoryName(cat)}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{cat.description}</p>
            </div>
          </Link>
        </AnimatedSection>
      ))}

      <AnimatedSection delay={categories.length * 80}>
        <Link
          href="/produtos"
          className="ka-category-card group flex h-full min-h-[214px] flex-col overflow-hidden rounded-[22px] border border-pink-100 bg-pink-50 text-left shadow-[0_12px_34px_rgba(236,72,153,0.10)] hover:shadow-glow-lg"
        >
          <div className="relative aspect-[1.08] overflow-hidden bg-pink-100">
            <Image
              src="/images/home/ka-bijoux-hero-banner.jpg"
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 200px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pink-600/35 via-pink-200/10 to-white/30" />
          </div>
          <div className="flex flex-1 flex-col px-3.5 py-3">
            <p className="text-sm font-bold leading-snug text-gray-900">Ver todas</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">Todas as categorias da KA</p>
          </div>
        </Link>
      </AnimatedSection>
    </div>
  );
}
