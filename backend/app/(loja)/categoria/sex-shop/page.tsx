import type { Metadata } from "next";
import Link from "next/link";
import ProductListingPage from "@/components/loja/ProductListingPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Linha Adulto — KA Bijoux",
  description: "Produtos adultos com discrição e qualidade. Entrega sigilosa.",
};

const SUBCATEGORIES = [
  {
    slug: "geis-e-cremes",
    label: "Géis & Cremes",
    emoji: "💜",
    desc: "Massagem e prazer",
    color: "from-purple-900 to-purple-700",
  },
  {
    slug: "vibradores",
    label: "Vibradores",
    emoji: "⚡",
    desc: "Controle & intensidade",
    color: "from-rose-900 to-rose-700",
  },
  {
    slug: "aneis-penianos",
    label: "Anéis Penianos",
    emoji: "💍",
    desc: "Diversas cores",
    color: "from-fuchsia-900 to-fuchsia-700",
  },
  {
    slug: "masturbadores",
    label: "Masturbadores",
    emoji: "🥚",
    desc: "EGGs & mini bullets",
    color: "from-indigo-900 to-indigo-700",
  },
  {
    slug: "lubrificantes",
    label: "Lubrificantes",
    emoji: "💧",
    desc: "Íntimo & suave",
    color: "from-blue-900 to-blue-700",
  },
  {
    slug: "balas-liquidas",
    label: "Balas Líquidas",
    emoji: "🍬",
    desc: "Sabores especiais",
    color: "from-pink-900 to-pink-700",
  },
  {
    slug: "desodorantes-intimos",
    label: "Desodorantes Íntimos",
    emoji: "🌸",
    desc: "Frescor & delicadeza",
    color: "from-violet-900 to-violet-700",
  },
];

export default function SexShopPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <div className="bg-[#0d0d0d] min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0a1f] via-[#2d0a2e] to-[#1a0a1f] pt-28 pb-12">
        <div className="pointer-events-none absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #ff4d6d 0%, transparent 50%), radial-gradient(circle at 80% 50%, #9b59b6 0%, transparent 50%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 text-center">
          <span className="inline-block rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-pink-400 mb-4">
            🔞 Acesso restrito — +18
          </span>
          <h1 className="font-playfair text-4xl font-bold text-white sm:text-5xl">
            Linha <span className="text-pink-400">Adulto</span>
          </h1>
          <p className="mt-3 text-sm text-white/50">
            Produtos com discrição, qualidade e entrega sigilosa
          </p>
        </div>
      </div>

      {/* Subcategorias */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/40">
          Explorar por categoria
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {SUBCATEGORIES.map((sub) => (
            <Link
              key={sub.slug}
              href={`/categoria/sex-shop/${sub.slug}`}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${sub.color} p-4 transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:shadow-pink-900/30`}
            >
              <div className="text-2xl mb-2">{sub.emoji}</div>
              <p className="text-sm font-bold text-white leading-tight">{sub.label}</p>
              <p className="text-[11px] text-white/50 mt-0.5">{sub.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Produtos */}
      <div className="mx-auto max-w-7xl px-4 pb-16">
        <div className="rounded-3xl bg-[#161616] p-6">
          <ProductListingPage
            title="Todos os produtos"
            description=""
            basePath="/categoria/sex-shop"
            searchParams={searchParams}
            categorySlug="sex-shop"
            adultNotice={true}
            embedded
          />
        </div>
      </div>
    </div>
  );
}
