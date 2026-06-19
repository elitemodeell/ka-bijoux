import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductListingPage from "@/components/loja/ProductListingPage";
import { getSubcategoryByPath } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { subcategoria: string } }): Metadata {
  const sub = getSubcategoryByPath("sex-shop", params.subcategoria);
  if (!sub) return { title: "Linha Adulto — KA Bijoux" };
  return {
    title: `${sub.name} — Linha Adulto | KA Bijoux`,
    description: sub.description,
  };
}

export default function SexShopSubcategoriaPage({
  params,
  searchParams,
}: {
  params: { subcategoria: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sub = getSubcategoryByPath("sex-shop", params.subcategoria);
  if (!sub) notFound();

  return (
    <div className="bg-[#0d0d0d] min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0a1f] via-[#2d0a2e] to-[#1a0a1f] pt-28 pb-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #ff4d6d 0%, transparent 50%), radial-gradient(circle at 80% 50%, #9b59b6 0%, transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4">
          <Link
            href="/categoria/sex-shop"
            className="inline-flex items-center gap-1.5 text-xs text-pink-400/70 hover:text-pink-400 transition-colors mb-4"
          >
            ← Linha Adulto
          </Link>
          <span className="block rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-pink-400 mb-4 w-fit">
            🔞 Acesso restrito — +18
          </span>
          <h1 className="font-playfair text-3xl font-bold text-white sm:text-4xl">
            {sub.name}
          </h1>
          <p className="mt-2 text-sm text-white/50">{sub.description}</p>
        </div>
      </div>

      {/* Produtos */}
      <div className="mx-auto max-w-7xl px-4 py-8 pb-16">
        <div className="rounded-3xl bg-[#161616] p-6">
          <ProductListingPage
            title={sub.name}
            description={sub.description}
            basePath={`/categoria/sex-shop/${sub.pathSlug}`}
            searchParams={searchParams}
            categorySlug="sex-shop"
            subcategorySlug={sub.slug}
            adultNotice={true}
            embedded
          />
        </div>
      </div>
    </div>
  );
}
