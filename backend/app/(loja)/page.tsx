import type { Metadata } from "next";
import Link from "next/link";
import AnnouncementBar from "@/components/loja/AnnouncementBar";
import HeroSection from "@/components/loja/HeroSection";
import CategoryGrid from "@/components/loja/CategoryGrid";
import ProductCard from "@/components/loja/ProductCard";
import VideoSection from "@/components/loja/VideoSection";
import GallerySection from "@/components/loja/GallerySection";
import ReelsSection from "@/components/loja/ReelsSection";
import AnimatedSection from "@/components/loja/AnimatedSection";

export const metadata: Metadata = {
  title: "KA Bijoux — Bijuterias, Óculos e Acessórios Femininos",
  description:
    "Descubra bijuterias, óculos de sol, capinhas e acessórios com estilo. Entrega para todo o Brasil. KA Bijoux — elegância que combina com você.",
};

/* ── Demo products (mostrados enquanto o banco não está ativo) ── */
const DEMO_PRODUCTS = [
  {
    id: "1",
    name: "Brinco Argola Dourada Premium",
    price: 49.90,
    promo: 39.90,
    badge: "Novo",
    image: "/imagens/produto-01.jpg",
  },
  {
    id: "2",
    name: "Óculos Round Vintage Retrô",
    price: 89.90,
    promo: null,
    badge: "Destaque",
    image: "/imagens/banner-01.jpg",
  },
  {
    id: "3",
    name: "Capinha Butterfly Dream",
    price: 34.90,
    promo: 29.90,
    badge: "Novo",
    image: "/imagens/produto-03.jpg",
  },
  {
    id: "4",
    name: "Pulseira Aro Dourado",
    price: 29.90,
    promo: null,
    badge: null,
    image: "/imagens/produto-02.jpg",
  },
  {
    id: "5",
    name: "Colar Pingente Coração",
    price: 54.90,
    promo: 44.90,
    badge: "Destaque",
    image: null,
  },
  {
    id: "6",
    name: "Tiara Floral Acetato",
    price: 24.90,
    promo: null,
    badge: "Novo",
    image: null,
  },
  {
    id: "7",
    name: "Kit Anéis Cravejados",
    price: 69.90,
    promo: 54.90,
    badge: null,
    image: null,
  },
  {
    id: "8",
    name: "Bolsa Mini Shoulder Bag",
    price: 119.90,
    promo: 99.90,
    badge: "Destaque",
    image: null,
  },
];

async function getFeaturedProducts() {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/products?featured=true&pageSize=8`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.products ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const liveProducts = await getFeaturedProducts();
  const products = liveProducts ?? DEMO_PRODUCTS;

  return (
    <main className="overflow-x-hidden">

      {/* ── Barra de anúncios ──────────────────────────────── */}
      <AnnouncementBar />

      {/* ── Hero ──────────────────────────────────────────── */}
      <HeroSection />

      {/* ── Categorias ────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-12">
            <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-3 block">
              Explore
            </span>
            <h2 className="font-playfair text-4xl font-bold text-gray-900 mb-4">
              O que você procura?
            </h2>
            <div className="ka-divider mx-auto" />
          </AnimatedSection>
          <CategoryGrid />
        </div>
      </section>

      {/* ── Produtos Em Destaque ───────────────────────────── */}
      <section className="py-20 bg-ka-subtle">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="flex items-end justify-between mb-12">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-3 block">
                Vitrine
              </span>
              <h2 className="font-playfair text-4xl font-bold text-gray-900">
                Em Destaque ✨
              </h2>
            </div>
            <Link
              href="/produtos"
              className="hidden sm:inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200"
            >
              Ver todos →
            </Link>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((product: typeof DEMO_PRODUCTS[0], i: number) => (
              <AnimatedSection key={product.id} delay={i * 70}>
                <ProductCard product={product} />
              </AnimatedSection>
            ))}
          </div>

          <div className="text-center mt-10 sm:hidden">
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
                <p className="font-bold text-lg">Frete Grátis</p>
                <p className="text-white/80 text-sm">Em pedidos acima de R$ 150,00</p>
              </div>
            </div>
            <div className="h-px sm:h-10 w-full sm:w-px bg-white/20" />
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span className="text-3xl">💳</span>
              <div>
                <p className="font-bold text-lg">5% no Pix</p>
                <p className="text-white/80 text-sm">Desconto na hora</p>
              </div>
            </div>
            <div className="h-px sm:h-10 w-full sm:w-px bg-white/20" />
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span className="text-3xl">🚀</span>
              <div>
                <p className="font-bold text-lg">Envio Rápido</p>
                <p className="text-white/80 text-sm">Para todo o Brasil</p>
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

      {/* ── Vídeo da KA Bijoux ─────────────────────────────── */}
      <VideoSection />

      {/* ── Galeria de Fotos ───────────────────────────────── */}
      <GallerySection />

      {/* ── Reels ─────────────────────────────────────────── */}
      <ReelsSection />

      {/* ── Mais Vendidos ─────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="flex items-end justify-between mb-12">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-3 block">
                Top da semana
              </span>
              <h2 className="font-playfair text-4xl font-bold text-gray-900">
                Mais Vendidos 🔥
              </h2>
            </div>
            <Link
              href="/produtos?ordem=mais-vendidos"
              className="hidden sm:inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200"
            >
              Ver todos →
            </Link>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.slice(4, 8).map((product: typeof DEMO_PRODUCTS[0], i: number) => (
              <AnimatedSection key={`best-${product.id}`} delay={i * 70}>
                <ProductCard product={{ ...product, badge: "Destaque" }} />
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Novidades / Segunda vitrine ────────────────────── */}
      <section className="py-20 bg-ka-subtle">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-12">
            <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-3 block">
              Chegando agora
            </span>
            <h2 className="font-playfair text-4xl font-bold text-gray-900 mb-4">
              Novidades 🆕
            </h2>
            <div className="ka-divider mx-auto" />
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.slice(0, 4).map((product: typeof DEMO_PRODUCTS[0], i: number) => (
              <AnimatedSection key={`new-${product.id}`} delay={i * 80}>
                <ProductCard product={{ ...product, badge: "Novo" }} />
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Escolhidos para você ──────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-12">
            <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-3 block">
              Curadoria
            </span>
            <h2 className="font-playfair text-4xl font-bold text-gray-900 mb-4">
              Escolhidos para você 💕
            </h2>
            <div className="ka-divider mx-auto" />
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.slice(2, 6).map((product: typeof DEMO_PRODUCTS[0], i: number) => (
              <AnimatedSection key={`pick-${product.id}`} delay={i * 80}>
                <ProductCard product={product} />
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Detalhes que encantam ─────────────────────────── */}
      <section className="py-20 bg-ka-subtle">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="flex items-end justify-between mb-12">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-3 block">
                Peças únicas
              </span>
              <h2 className="font-playfair text-4xl font-bold text-gray-900">
                Detalhes que encantam ✨
              </h2>
            </div>
            <Link
              href="/produtos"
              className="hidden sm:inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200"
            >
              Ver todos →
            </Link>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...products].reverse().slice(0, 4).map((product: typeof DEMO_PRODUCTS[0], i: number) => (
              <AnimatedSection key={`detail-${product.id}`} delay={i * 90}>
                <ProductCard product={{ ...product, badge: product.badge ?? "Novo" }} />
              </AnimatedSection>
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
              Explore nossa coleção completa e encontre o acessório perfeito para cada momento.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/produtos"
                className="ka-btn ka-pulse-glow bg-gradient-to-r from-pink-500 to-pink-400 text-white font-bold px-10 py-4 rounded-2xl text-base"
              >
                Explorar Tudo ✨
              </Link>
              <a
                href="https://wa.me/5537999999999?text=Olá! Quero conhecer os produtos da KA Bijoux!"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-white/20 text-white/80 hover:text-white hover:border-white/50 font-semibold px-10 py-4 rounded-2xl transition-all duration-300 text-base"
              >
                Fale conosco →
              </a>
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
