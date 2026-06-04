import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Carrinho",
  description: "Carrinho da KA Bijoux.",
};

export default function CarrinhoPage() {
  return (
    <main className="bg-white pt-32">
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <div className="rounded-[28px] border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-white px-6 py-12 text-center shadow-[0_18px_60px_rgba(236,72,153,0.10)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">KA Bijoux</p>
          <h1 className="mt-3 font-playfair text-4xl font-bold text-gray-950">Seu carrinho</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-500">
            Escolha seus produtos na vitrine e use a compra rápida para separar seus favoritos com praticidade.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/produtos"
              className="ka-btn rounded-2xl bg-gradient-to-r from-pink-500 to-pink-400 px-7 py-3 text-sm font-bold text-white shadow-glow-lg"
            >
              Ver produtos
            </Link>
            <Link
              href="/"
              className="rounded-2xl border border-pink-100 bg-white px-7 py-3 text-sm font-bold text-pink-500 transition-colors hover:bg-pink-50"
            >
              Voltar para início
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
