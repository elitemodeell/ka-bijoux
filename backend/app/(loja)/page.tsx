import type { Metadata } from "next";
import Link from "next/link";
import AnnouncementBar from "@/components/loja/AnnouncementBar";
import ProductCard from "@/components/loja/ProductCard";
import AnimatedSection from "@/components/loja/AnimatedSection";
import KABijouxStories from "@/components/loja/KABijouxStories";
import QuickCategoryBar from "@/components/loja/QuickCategoryBar";
import { getBlingProductCards, type ProductCardProduct } from "@/lib/bling-catalog";

export const metadata: Metadata = {
  title: "KA Bijoux — Bijuterias, Óculos e Acessórios Femininos",
  description:
    "Descubra bijuterias, óculos de sol, capinhas e acessórios com estilo. Entrega para todo o Brasil. KA Bijoux — elegância que combina com você.",
};

interface HomeSections {
  ofertasRelampago: ProductCardProduct[];
  achadinhos: ProductCardProduct[];
  novidades: ProductCardProduct[];
  maisVendidos: ProductCardProduct[];
  paraPresentes: ProductCardProduct[];
  belezaAutocuidado: ProductCardProduct[];
}

function pickBadge(id: string, options: string[]): string {
  const n = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return options[n % options.length];
}

async function fetchPool(url: string): Promise<ProductCardProduct[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data?.products) ? json.data.products : [];
  } catch {
    return [];
  }
}

async function getHomeSections(): Promise<HomeSections> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const q = "withImage=true&line=normal";

  const [main, featured, newProds, promo] = await Promise.all([
    fetchPool(`${base}/api/products?pageSize=60&${q}`),
    fetchPool(`${base}/api/products?pageSize=12&${q}&featured=true`),
    fetchPool(`${base}/api/products?pageSize=12&${q}&new=true`),
    fetchPool(`${base}/api/products?pageSize=12&${q}&promo=true`),
  ]);

  if (!main.length && !featured.length && !newProds.length && !promo.length) {
    const fb = getBlingProductCards({ limit: 60, requireImage: true, catalogLine: "normal" });
    return {
      ofertasRelampago: fb.slice(0, 8),
      achadinhos: fb.slice(8, 16),
      novidades: fb.slice(16, 24),
      maisVendidos: fb.slice(24, 34),
      paraPresentes: fb.slice(34, 42),
      belezaAutocuidado: fb.slice(42, 50),
    };
  }

  const used = new Set<string>();

  function takeUnique(priority: ProductCardProduct[], n: number): ProductCardProduct[] {
    const result: ProductCardProduct[] = [];
    for (const p of [...priority, ...main]) {
      if (result.length >= n) break;
      if (!used.has(p.id)) { result.push(p); used.add(p.id); }
    }
    return result;
  }

  const ofertasRelampago  = takeUnique([...promo, ...main],     8);
  const achadinhos        = takeUnique(main,                    8);
  const novidades         = takeUnique([...newProds, ...main],  8);
  const maisVendidos      = takeUnique([...featured, ...main], 10);
  const paraPresentes     = takeUnique(main,                    8);
  const belezaAutocuidado = takeUnique(main,                    8);

  return { ofertasRelampago, achadinhos, novidades, maisVendidos, paraPresentes, belezaAutocuidado };
}

export default async function HomePage() {
  const {
    ofertasRelampago,
    achadinhos,
    novidades,
    maisVendidos,
    paraPresentes,
    belezaAutocuidado,
  } = await getHomeSections();

  return (
    <main className="overflow-x-hidden">

      <AnnouncementBar />

      <section className="bg-white pt-[72px] md:pt-[26px]">
        <KABijouxStories />
      </section>

      <QuickCategoryBar />

      {/* ── Ofertas Relâmpago ─────────────────────────────── */}
      <section className="py-10 bg-ka-subtle sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-6 sm:mb-10">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-2 block">
                Imperdíveis
              </span>
              <h2 className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
                Ofertas Relâmpago 🔥
              </h2>
            </div>
            <Link
              href="/produtos"
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver mais →
            </Link>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-5">
            {ofertasRelampago.map((product, i) => (
              <ProductCard
                key={product.id}
                product={{
                  ...product,
                  badge: pickBadge(product.id, ["Imperdível", "Oferta", "Super Preço", "Corre!", "Aproveite"]),
                }}
                revealDelay={i * 50}
                priority={i < 2}
                badgeSeal
              />
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/produtos"
              className="ka-btn inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-400 text-white font-semibold px-7 py-3.5 rounded-2xl"
            >
              Ver todos os produtos →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Achadinhos KA Bijoux ──────────────────────────── */}
      <section className="py-10 bg-white sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-6 sm:mb-10">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-2 block">
                Achados da semana
              </span>
              <h2 className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
                Achadinhos KA Bijoux 💖
              </h2>
              <p className="text-gray-500 text-sm mt-1">Produtos lindos para comprar sem pensar muito.</p>
            </div>
            <Link
              href="/produtos"
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver mais →
            </Link>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-5">
            {achadinhos.map((product, i) => (
              <ProductCard
                key={`ach-${product.id}`}
                product={{
                  ...product,
                  badge: pickBadge(product.id, ["Achadinho", "Queridinho", "Boa Compra", "Favorito"]),
                }}
                revealDelay={i * 55}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Faixa info ────────────────────────────────────── */}
      <section className="py-6 bg-gradient-to-r from-pink-600 via-pink-500 to-pink-400">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span className="text-3xl">🎁</span>
              <div>
                <p className="font-bold text-lg">Envio e retirada</p>
                <p className="text-white/80 text-sm">Escolha a melhor forma na finalização</p>
              </div>
            </div>
            <div className="h-px sm:h-10 w-full sm:w-px bg-white/20" />
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span className="text-3xl">💳</span>
              <div>
                <p className="font-bold text-lg">Pix e cartão</p>
                <p className="text-white/80 text-sm">Formas de pagamento disponíveis</p>
              </div>
            </div>
            <div className="h-px sm:h-10 w-full sm:w-px bg-white/20" />
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span className="text-3xl">🚀</span>
              <div>
                <p className="font-bold text-lg">Compra segura</p>
                <p className="text-white/80 text-sm">Pedido acompanhado com cuidado</p>
              </div>
            </div>
            <Link
              href="/produtos"
              className="flex-shrink-0 bg-white text-pink-600 font-bold px-6 py-3 rounded-2xl hover:bg-pink-50 transition-colors text-sm"
            >
              Aproveitar →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Novidades ─────────────────────────────────────── */}
      <section className="py-14 bg-ka-subtle sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-8 sm:mb-12">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-2 block">
                Chegando agora
              </span>
              <h2 className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
                Novidades 🆕
              </h2>
            </div>
            <Link
              href="/produtos?new=true"
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver todas →
            </Link>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-5">
            {novidades.map((product, i) => (
              <ProductCard
                key={`new-${product.id}`}
                product={{
                  ...product,
                  badge: pickBadge(product.id, ["Novo", "Lançamento", "Chegou"]),
                }}
                revealDelay={i * 60}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Mais Vendidos ─────────────────────────────────── */}
      <section className="py-14 bg-white sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-8 sm:mb-12">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-2 block">
                Top da semana
              </span>
              <h2 className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
                Mais Vendidos ⭐
              </h2>
            </div>
            <Link
              href="/produtos?ordem=mais-vendidos"
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver todos →
            </Link>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {maisVendidos.map((product, i) => (
              <ProductCard
                key={`mv-${product.id}`}
                product={{
                  ...product,
                  badge: pickBadge(product.id, ["Mais Vendido", "Destaque", "Top"]),
                }}
                revealDelay={i * 45}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Para Presentear ───────────────────────────────── */}
      <section className="py-14 bg-ka-subtle sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-8 sm:mb-12">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-2 block">
                Ideias de presente
              </span>
              <h2 className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
                Para Presentear 🎁
              </h2>
            </div>
            <Link
              href="/produtos"
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver mais →
            </Link>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-5">
            {paraPresentes.map((product, i) => (
              <ProductCard
                key={`gft-${product.id}`}
                product={{
                  ...product,
                  badge: pickBadge(product.id, ["Presente", "Especial", "Mimo", "Encanto"]),
                }}
                revealDelay={i * 60}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Beleza e Autocuidado ──────────────────────────── */}
      <section className="py-14 bg-white sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-8 sm:mb-12">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-2 block">
                Beleza e bem-estar
              </span>
              <h2 className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
                Beleza e Autocuidado ✨
              </h2>
            </div>
            <Link
              href="/produtos"
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver mais →
            </Link>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-5">
            {belezaAutocuidado.map((product, i) => (
              <ProductCard
                key={`bel-${product.id}`}
                product={{
                  ...product,
                  badge: pickBadge(product.id, ["Top Beleza", "Favorita", "Tendência"]),
                }}
                revealDelay={i * 60}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Depoimentos ────────────────────────────────────── */}
      <section className="py-20 bg-ka-subtle">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-14">
            <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-3 block">
              Avaliações
            </span>
            <h2 className="font-playfair text-4xl font-bold text-gray-900 mb-4">
              O que nossas clientes dizem
            </h2>
            <div className="ka-divider mx-auto" />
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <AnimatedSection key={t.name} delay={i * 100}>
                <TestimonialCard {...t} />
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ─────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-[#1A0A0F] via-[#2D0A18] to-[#1A0A0F] relative overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #FF4D6D 0%, transparent 70%)" }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <AnimatedSection>
            <span className="text-pink-400 text-sm font-semibold tracking-widest uppercase mb-4 block">
              Sua loja favorita
            </span>
            <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-white mb-6">
              Pronta para se sentir{" "}
              <span className="ka-gradient-text">ainda mais linda?</span>
            </h2>
            <p className="text-gray-400 text-lg mb-10">
              Veja nossa coleção completa e encontre o acessório perfeito para cada momento.
            </p>
            <div className="flex items-center justify-center">
              <Link
                href="/produtos"
                className="ka-btn ka-pulse-glow bg-gradient-to-r from-pink-500 to-pink-400 text-white font-bold px-10 py-4 rounded-2xl text-base"
              >
                Ver coleção ✨
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

    </main>
  );
}

const TESTIMONIALS = [
  {
    name: "Mariana Costa",
    city: "Itaúna – MG",
    text: "Amei os brincos que comprei! A qualidade é ótima e a entrega foi super rápida. Com certeza vou comprar mais vezes!",
    stars: 5,
    avatar: "MC",
  },
  {
    name: "Julia Fernandes",
    city: "Belo Horizonte – MG",
    text: "Os óculos são lindíssimos e chegaram muito bem embalados. A loja é incrível, atendimento maravilhoso!",
    stars: 5,
    avatar: "JF",
  },
  {
    name: "Ana Beatriz Lima",
    city: "São Paulo – SP",
    text: "Já é a quarta vez que compro na KA Bijoux. Os produtos são exatamente como nas fotos. Super recomendo!",
    stars: 5,
    avatar: "AB",
  },
];

function TestimonialCard({
  name, city, text, stars, avatar,
}: { name: string; city: string; text: string; stars: number; avatar: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 hover:shadow-card-hover transition-shadow duration-300">
      <div className="flex gap-1 mb-4">
        {Array.from({ length: stars }).map((_, i) => (
          <span key={i} className="text-yellow-400 text-base">★</span>
        ))}
      </div>
      <p className="text-gray-600 text-sm leading-relaxed mb-5">&ldquo;{text}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{name}</p>
          <p className="text-xs text-gray-400">{city}</p>
        </div>
      </div>
    </div>
  );
}
