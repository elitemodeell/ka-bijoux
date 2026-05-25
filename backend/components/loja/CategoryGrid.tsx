import Link from "next/link";
import AnimatedSection from "./AnimatedSection";

const CATEGORIES = [
  { name: "Bijuterias",    slug: "bijuterias", emoji: "💍", desc: "Anéis, brincos, colares",   bg: "#FFF0F5" },
  { name: "Óculos de Sol", slug: "oculos",     emoji: "🕶️", desc: "Estilos e proteção",         bg: "#FFF5F0" },
  { name: "Capinhas",      slug: "capinhas",   emoji: "📱", desc: "Para todos os modelos",      bg: "#F5F0FF" },
  { name: "Bolsas",        slug: "bolsas",     emoji: "👜", desc: "Elegantes e práticas",       bg: "#F0F5FF" },
  { name: "Cabelos",       slug: "cabelos",    emoji: "✨", desc: "Tiaras, presilhas e mais",   bg: "#F0FFF5" },
  { name: "Perfumes",      slug: "perfumes",   emoji: "🌸", desc: "Fragrâncias delicadas",      bg: "#FFF0F8" },
];

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {CATEGORIES.map((cat, i) => (
        <AnimatedSection key={cat.slug} delay={i * 80}>
          <Link
            href={`/produtos?cat=${cat.slug}`}
            className="ka-category-card group flex flex-col items-center text-center p-5 bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-glow-lg cursor-pointer"
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform duration-300"
              style={{ backgroundColor: cat.bg }}
            >
              {cat.emoji}
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-0.5">{cat.name}</p>
            <p className="text-xs text-gray-400">{cat.desc}</p>
          </Link>
        </AnimatedSection>
      ))}
    </div>
  );
}
