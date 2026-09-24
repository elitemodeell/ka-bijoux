import type { Metadata } from "next";
import Link from "next/link";
import { AccountDeletionRequestForm } from "@/components/loja/AccountDeletionRequestForm";
import { LEGAL_IDENTITY } from "@/lib/legal-identity";

export const metadata: Metadata = {
  title: "Exclusão de conta",
  description: "Solicite a exclusão da sua conta e dos dados pessoais da KA Bijoux.",
};

export default function ExcluirContaPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-bold uppercase tracking-wider text-rose-800">KA Bijoux</p>
      <h1 className="mt-2 text-3xl font-black text-gray-950 sm:text-4xl">
        Exclusão de conta e dados
      </h1>
      <p className="mt-4 leading-7 text-gray-700">
        Esta página funciona sem instalar ou abrir o aplicativo. Para impedir que outra
        pessoa exclua sua conta apenas conhecendo seu e-mail, enviaremos um link temporário
        ao endereço cadastrado.
      </p>

      <section className="mt-10" aria-labelledby="como-funciona">
        <h2 id="como-funciona" className="text-xl font-bold text-gray-900">
          Como funciona
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-700">
          <li>Informe o e-mail da conta no formulário.</li>
          <li>Abra o link de confirmação enviado ao e-mail cadastrado.</li>
          <li>Revise os dados apagados e retidos e confirme ou cancele a solicitação.</li>
          <li>
            Após a confirmação, a desativação e a anonimização são automáticas. Se houver
            necessidade de análise operacional, o processamento poderá levar até 7 dias.
          </li>
        </ol>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Dados apagados e retidos">
        <div className="rounded-2xl bg-emerald-50 p-5">
          <h2 className="font-bold text-emerald-950">Dados apagados ou anonimizados</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-950">
            Nome, e-mail, telefone, CPF, credencial, token de notificação, favoritos,
            avaliações, notificações, carrinho e endereços não vinculados a pedidos.
          </p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-5">
          <h2 className="font-bold text-amber-950">Dados que podem ser retidos</h2>
          <p className="mt-2 text-sm leading-6 text-amber-950">
            Pedidos, pagamentos, referências de gateway, eventos de segurança,
            consentimentos e endereços ligados a transações, quando necessários para
            obrigações fiscais, legais, prevenção a fraude ou contestações.
          </p>
        </div>
      </section>

      <p className="mt-6 text-sm leading-6 text-gray-600">
        O prazo de retenção depende da obrigação aplicável; a referência operacional
        atual para registros transacionais é de até 5 anos, quando necessária para obrigações
        legais, fiscais, prevenção a fraude ou defesa de direitos. É possível cancelar pelo próprio
        link antes de confirmar a exclusão.
      </p>

      <div className="mt-10">
        <AccountDeletionRequestForm />
      </div>

      <aside className="mt-8 rounded-2xl bg-gray-50 p-5 text-sm leading-6 text-gray-700">
        <h2 className="font-bold text-gray-900">Suporte e privacidade</h2>
        <p className="mt-2">
          Se você não tem mais acesso ao e-mail cadastrado, contate{" "}
          <a className="font-semibold underline" href={`mailto:${LEGAL_IDENTITY.email}`}>
            {LEGAL_IDENTITY.email}
          </a>
          . O controlador é {LEGAL_IDENTITY.legalName}, CNPJ {LEGAL_IDENTITY.cnpj}.
        </p>
        <p className="mt-2">
          Leia também a{" "}
          <Link className="font-semibold underline" href="/privacidade">
            Política de Privacidade
          </Link>{" "}
          e os{" "}
          <Link className="font-semibold underline" href="/termos">
            Termos de Uso
          </Link>
          .
        </p>
      </aside>
    </main>
  );
}
