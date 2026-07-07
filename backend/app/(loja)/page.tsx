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

/* ── Demo products (mostrados enquanto o banco não está ativo) ── */
const DEMO_PRODUCTS = [
  {
    id: "1",
    name: "Brinco Laço Dourado",
    price: 39.90,
    promo: null,
    badge: "Novo",
    image: "/imagens/foto-03.jpeg",
  },
  {
    id: "2",
    name: "Kit de Bijuterias no Porta-Joias",
    price: 79.90,
    promo: null,
    badge: "Destaque",
    image: "/imagens/foto-05.jpeg",
  },
  {
    id: "3",
    name: "Conjunto Colar e Brincos Dourados",
    price: 89.90,
    promo: null,
    badge: "Novo",
    image: "/imagens/foto-06.jpeg",
  },
  {
    id: "4",
    name: "Óculos de Sol Retangular",
    price: 69.90,
    promo: null,
    badge: null,
    image: "/imagens/foto-08.jpeg",
  },
  {
    id: "5",
    name: "Capinha Butterfly Rosa",
    price: 34.90,
    promo: 29.90,
    badge: "Destaque",
    image: "/imagens/produto-01.jpg",
  },
  {
    id: "6",
    name: "Óculos Round Vintage",
    price: 89.90,
    promo: null,
    badge: "Novo",
    image: "/imagens/produto-03.jpg",
  },
  {
    id: "7",
    name: "Kit Shampoo e Condicionador Studio Hair",
    price: 49.90,
    promo: null,
    badge: null,
    image: "/imagens/banner-01.jpg",
  },
  {
    id: "8",
    name: "Perfume D-One Eau de Parfum",
    price: 64.90,
    promo: null,
    badge: "Destaque",
    image: "/imagens/foto-07.jpeg",
  },
  {
    id: "9",
    name: "Esfoliante Hidratante Baba Soul",
    price: 29.90,
    promo: null,
    badge: "Novo",
    image: "/imagens/foto-10.jpeg",
  },
  {
    id: "10",
    name: "Kit Esfoliante Hidratante Kiwi",
    price: 34.90,
    promo: null,
    badge: null,
    image: "/imagens/foto-11.jpeg",
  },
  {
    id: "11",
    name: "Kit Escovas de Cabelo",
    price: 39.90,
    promo: null,
    badge: "Destaque",
    image: "/imagens/foto-12.jpeg",
  },
  {
    id: "12",
    name: "Kit Skincare Facial",
    price: 54.90,
    promo: null,
    badge: "Novo",
    image: "/imagens/foto-13.jpeg",
  },
];

async function getFeaturedProducts(): Promise<ProductCardProduct[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/products?pageSize=8&withImage=true&line=normal`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(1000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data?.products) ? json.data.products : [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const liveProducts = await getFeaturedProducts();
  const products = liveProducts.length
    ? liveProducts
    : getBlingProductCards({ limit: 8, requireImage: true, catalogLine: "normal" });

  return (
    <main className="overflow-x-hidden">

      {/* ── Barra de anúncios ──────────────────────────────── */}
      <AnnouncementBar />

      <section className="bg-white pt-[84px] sm:pt-24">
        <KABijouxStories />
      </section>

      {/* ── Categorias rápidas ────────────────────────────── */}
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
              href="/produtos?promo=true"
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver mais →
            </Link>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {products.slice(0, 8).map((product: ProductCardProduct, i: number) => (
              <ProductCard key={product.id} product={product} revealDelay={i * 60} />
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

      {/* ── Promoção Banner ────────────────────────────────── */}
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

      {/* ── Principais Produtos ───────────────────────────── */}
      <section className="py-14 bg-white sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-8 sm:mb-12">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-2 block">
                Top da semana
              </span>
              <h2 className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
                Principais Produtos ⭐
              </h2>
            </div>
            <Link
              href="/produtos?ordem=mais-vendidos"
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver todos →
            </Link>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {products.slice(4, 8).map((product: ProductCardProduct, i: number) => (
              <ProductCard
                key={`best-${product.id}`}
                product={{ ...product, badge: "Destaque" }}
                revealDelay={i * 70}
              />
            ))}
          </div>
        </div>
      </section>

{/* ── Novidades ─────────────────────────────────────── */}
      <section className="py-14 bg-ka-subtle sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-10">
            <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-3 block">
              Chegando agora
            </span>
            <h2 className="font-playfair text-3xl font-bold text-gray-900 mb-4 sm:text-4xl">
              Novidades 🆕
            </h2>
            <div className="ka-divider mx-auto" />
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {products.slice(0, 4).map((product: ProductCardProduct, i: number) => (
              <ProductCard
                key={`new-${product.id}`}
                product={{ ...product, badge: "Novo" }}
                revealDelay={i * 80}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Depoimentos ────────────────────────────────────── */}
      <section className="py-20 bg-white">
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
        {/* Background decoration */}
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

/* ── Testimonials data ─────────────────────────────────────────── */

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
