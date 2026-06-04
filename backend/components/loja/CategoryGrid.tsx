import Link from "next/link";
import { getHomeCategories, getPublicCategoryName } from "@/lib/catalog";
import AnimatedSection from "./AnimatedSection";

const accentColors = ["#FFF0F5", "#FFF5F0", "#F5F0FF", "#F0F5FF", "#F0FFF5", "#FFF0F8"];

export default function CategoryGrid() {
  const categories = getHomeCategories();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
      {categories.map((cat, i) => (
        <AnimatedSection key={cat.slug} delay={i * 80}>
          <Link
            href={`/categoria/${cat.slug}`}
            className="ka-category-card group flex h-full flex-col items-center rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-card hover:shadow-glow-lg"
          >
            <div
              className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl text-sm font-black text-pink-500 transition-transform duration-300 group-hover:scale-110"
              style={{ backgroundColor: accentColors[i % accentColors.length] }}
            >
              {cat.icon}
            </div>
            <p className="mb-0.5 text-sm font-semibold text-gray-800">{getPublicCategoryName(cat)}</p>
            <p className="line-clamp-2 text-xs text-gray-400">{cat.description}</p>
          </Link>
        </AnimatedSection>
      ))}

      <AnimatedSection delay={categories.length * 80}>
        <Link
          href="/produtos"
          className="ka-category-card group flex h-full flex-col items-center rounded-2xl border border-pink-100 bg-pink-50 p-5 text-center shadow-card hover:shadow-glow-lg"
        >
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white text-sm font-black text-pink-500 transition-transform duration-300 group-hover:scale-110">
            ALL
          </div>
          <p className="mb-0.5 text-sm font-semibold text-gray-800">Ver todas</p>
          <p className="text-xs text-gray-400">Todas as categorias da KA</p>
        </Link>
      </AnimatedSection>
    </div>
  );
}
