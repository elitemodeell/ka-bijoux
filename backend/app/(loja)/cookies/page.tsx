import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_IDENTITY } from "@/lib/legal-identity";

export const metadata: Metadata = {
  title: "Cookies e armazenamento local",
  description: "Como a KA Bijoux usa cookies essenciais e armazenamento local.",
};

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-black text-gray-900">Cookies e armazenamento local</h1>
      <p className="mt-3 text-sm leading-7 text-gray-600">Última atualização: 3 de agosto de 2026.</p>
      <div className="mt-8 space-y-7 text-sm leading-7 text-gray-600">
        <section>
          <h2 className="font-bold text-gray-900">Uso atual</h2>
          <p>
            O site usa cookie HTTP-only estritamente necessário para autenticação da área
            administrativa. No fluxo do consumidor, o navegador ou aplicativo pode guardar
            sessão, carrinho, stories vistos e posição de navegação para prestar o serviço.
          </p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">Publicidade e analytics</h2>
          <p>
            Não foram ativados cookies de publicidade, pixels de rastreamento ou analytics
            comportamental nesta versão. Por isso não exibimos um banner de consentimento para
            finalidades inexistentes. Se essas tecnologias forem adicionadas, esta política e o
            mecanismo de consentimento serão revistos antes da ativação.
          </p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">Controle</h2>
          <p>
            O usuário pode limpar o armazenamento pelo navegador ou sistema do aparelho. Isso pode
            encerrar a sessão e remover preferências ou carrinho local. Dúvidas podem ser enviadas
            para <a className="font-semibold text-rose-800 underline" href={`mailto:${LEGAL_IDENTITY.email}`}>{LEGAL_IDENTITY.email}</a>.
          </p>
        </section>
      </div>
      <p className="mt-10 text-sm text-gray-600">
        Consulte também a <Link className="font-semibold text-rose-800 underline" href="/privacidade">Política de Privacidade</Link>.
      </p>
    </main>
  );
}
