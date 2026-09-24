import type { Metadata } from "next";
import Link from "next/link";
import AnnouncementBar from "@/components/loja/AnnouncementBar";
import ProductCard from "@/components/loja/ProductCard";
import AnimatedSection from "@/components/loja/AnimatedSection";
import KABijouxStories from "@/components/loja/KABijouxStories";
import QuickCategoryBar from "@/components/loja/QuickCategoryBar";
import type { ProductCardProduct } from "@/lib/bling-catalog";
import { HOME_SECTION_DEFINITIONS, pickHomeBadge } from "@/lib/home-content";
import { getHomeSections } from "@/lib/home-sections";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "KA Bijoux — Bijuterias, Óculos e Acessórios Femininos",
  description:
    "Descubra bijuterias, óculos de sol, capinhas e acessórios com estilo. Retirada e opções de entrega disponíveis no checkout. KA Bijoux — elegância que combina com você.",
};

const [offersConfig, findsConfig, newConfig, bestConfig, giftsConfig, beautyConfig] =
  HOME_SECTION_DEFINITIONS;

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
      <section className="ka-deferred-section py-10 bg-ka-subtle sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-6 sm:mb-10">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-2 block">
                {offersConfig.label}
              </span>
              <h2 className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
                {offersConfig.title}
              </h2>
            </div>
            <Link
              href={offersConfig.route}
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver mais →
            </Link>
          </AnimatedSection>

          <SectionGrid
            products={ofertasRelampago}
            badgeOptions={offersConfig.badges}
            keyPrefix="offer"
            badgeSeal
            moreHref={offersConfig.route}
            moreLabel={offersConfig.moreLabel}
          />
        </div>
      </section>

      {/* ── Achadinhos KA Bijoux ──────────────────────────── */}
      <section className="ka-deferred-section py-10 bg-white sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-6 sm:mb-10">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-2 block">
                {findsConfig.label}
              </span>
              <h2 className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
                {findsConfig.title}
              </h2>
              <p className="text-gray-500 text-sm mt-1">{findsConfig.subtitle}</p>
            </div>
            <Link
              href={findsConfig.route}
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver mais →
            </Link>
          </AnimatedSection>

          <SectionGrid
            products={achadinhos}
            badgeOptions={findsConfig.badges}
            keyPrefix="ach"
            revealStep={55}
            moreHref={findsConfig.route}
            moreLabel={findsConfig.moreLabel}
          />
        </div>
      </section>

      {/* ── Faixa info ────────────────────────────────────── */}
      <section className="ka-deferred-section py-6 bg-gradient-to-r from-pink-600 via-pink-500 to-pink-400">
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
                <p className="font-bold text-lg">Pix via Asaas</p>
                <p className="text-white/80 text-sm">Pagamento seguro e confirmado</p>
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
      <section className="ka-deferred-section py-14 bg-ka-subtle sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-8 sm:mb-12">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-2 block">
                {newConfig.label}
              </span>
              <h2 className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
                {newConfig.title}
              </h2>
            </div>
            <Link
              href={newConfig.route}
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver todas →
            </Link>
          </AnimatedSection>

          <SectionGrid
            products={novidades}
            badgeOptions={newConfig.badges}
            keyPrefix="new"
            revealStep={60}
            moreHref={newConfig.route}
            moreLabel={newConfig.moreLabel}
          />
        </div>
      </section>

      {/* ── Mais Vendidos ─────────────────────────────────── */}
      <section className="ka-deferred-section py-14 bg-white sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-8 sm:mb-12">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-2 block">
                {bestConfig.label}
              </span>
              <h2 className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
                {bestConfig.title}
              </h2>
            </div>
            <Link
              href={bestConfig.route}
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver todos →
            </Link>
          </AnimatedSection>

          <SectionGrid
            products={maisVendidos}
            badgeOptions={bestConfig.badges}
            keyPrefix="mv"
            revealStep={45}
            moreHref={bestConfig.route}
            moreLabel={bestConfig.moreLabel}
          />
        </div>
      </section>

      {/* ── Para Presentear ───────────────────────────────── */}
      <section className="ka-deferred-section py-14 bg-ka-subtle sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-8 sm:mb-12">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-2 block">
                {giftsConfig.label}
              </span>
              <h2 className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
                {giftsConfig.title}
              </h2>
            </div>
            <Link
              href={giftsConfig.route}
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver mais →
            </Link>
          </AnimatedSection>

          <SectionGrid
            products={paraPresentes}
            badgeOptions={giftsConfig.badges}
            keyPrefix="gft"
            revealStep={60}
            moreHref={giftsConfig.route}
            moreLabel={giftsConfig.moreLabel}
          />
        </div>
      </section>

      {/* ── Beleza e Autocuidado ──────────────────────────── */}
      <section className="ka-deferred-section py-14 bg-white sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-8 sm:mb-12">
            <div>
              <span className="text-pink-500 text-sm font-semibold tracking-widest uppercase mb-2 block">
                {beautyConfig.label}
              </span>
              <h2 className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
                {beautyConfig.title}
              </h2>
            </div>
            <Link
              href={beautyConfig.route}
              className="inline-flex items-center gap-1 text-pink-500 font-semibold text-sm hover:gap-2 transition-all duration-200 flex-shrink-0"
            >
              Ver mais →
            </Link>
          </AnimatedSection>

          <SectionGrid
            products={belezaAutocuidado}
            badgeOptions={beautyConfig.badges}
            keyPrefix="bel"
            revealStep={60}
            moreHref={beautyConfig.route}
            moreLabel={beautyConfig.moreLabel}
          />
        </div>
      </section>

      {/* ── Depoimentos ────────────────────────────────────── */}
      <section className="ka-deferred-section py-20 bg-ka-subtle">
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
      <section className="ka-deferred-section py-24 bg-gradient-to-br from-[#1A0A0F] via-[#2D0A18] to-[#1A0A0F] relative overflow-hidden">
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

type SectionGridProps = {
  products: ProductCardProduct[];
  badgeOptions: readonly string[];
  moreHref: string;
  moreLabel: string;
  keyPrefix?: string;
  revealStep?: number;
  badgeSeal?: boolean;
};

function SectionGrid({
  products,
  badgeOptions,
  moreHref,
  moreLabel,
  keyPrefix = "product",
  revealStep = 50,
  badgeSeal = false,
}: SectionGridProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
        {products.map((product, i) => (
          <ProductCard
            key={`${keyPrefix}-${product.id}`}
            product={{
              ...product,
              badge: pickHomeBadge(product.id, badgeOptions),
            }}
            revealDelay={i * revealStep}
            badgeSeal={badgeSeal}
          />
        ))}
      </div>

      <div className="mt-5 flex justify-center sm:mt-8">
        <Link
          href={moreHref}
          className="ka-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-pink-400 px-6 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(236,72,153,0.24)]"
        >
          {moreLabel}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </>
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
