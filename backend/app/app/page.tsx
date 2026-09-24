import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_ADDRESS_INLINE, LEGAL_IDENTITY } from "@/lib/legal-identity";

export const metadata: Metadata = {
  title: "Aplicativo oficial",
  description: "Informações institucionais e canais legais do aplicativo KA Bijoux.",
  robots: { index: true, follow: true },
};

export default function AppInstitutionalPage() {
  return (
    <main className="min-h-screen bg-[#17070C] px-5 py-12 text-white">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-7 shadow-2xl sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pink-300">
          KA Bijoux
        </p>
        <h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">
          Aplicativo oficial
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-pink-50/80">
          O aplicativo apresenta uma seleção de acessórios, presentes, itens de
          beleza e utilidades aprovada especificamente para distribuição pela
          Google Play.
        </p>
        <p className="mt-4 text-sm leading-6 text-pink-50/70">
          Operado por {LEGAL_IDENTITY.legalName}, CNPJ {LEGAL_IDENTITY.cnpj}, com sede em {LEGAL_ADDRESS_INLINE}.
        </p>

        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl bg-white/[0.07] p-5">
            <h2 className="font-semibold">Compras e conta</h2>
            <p className="mt-2 text-sm leading-6 text-pink-50/70">
              Consulte produtos disponíveis, acompanhe pedidos e gerencie seus
              dados diretamente no aplicativo.
            </p>
          </article>
          <article className="rounded-2xl bg-white/[0.07] p-5">
            <h2 className="font-semibold">Privacidade e controle</h2>
            <p className="mt-2 text-sm leading-6 text-pink-50/70">
              A exclusão de conta está disponível no próprio aplicativo, na
              área de perfil.
            </p>
          </article>
        </div>

        <nav aria-label="Documentos e contato" className="mt-9 flex flex-wrap gap-3">
          <Link className="rounded-full bg-pink-500 px-5 py-3 text-sm font-semibold hover:bg-pink-400" href="/privacidade">
            Política de Privacidade
          </Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold hover:bg-white/10" href="/termos">
            Termos de Uso
          </Link>
          <a className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold hover:bg-white/10" href={`mailto:${LEGAL_IDENTITY.email}`}>
            {LEGAL_IDENTITY.email}
          </a>
        </nav>
      </section>
    </main>
  );
}
