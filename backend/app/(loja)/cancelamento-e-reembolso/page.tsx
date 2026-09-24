import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_IDENTITY } from "@/lib/legal-identity";

export const metadata: Metadata = {
  title: "Cancelamento e Reembolso",
  description: "Procedimento de cancelamento e reembolso de pedidos KA Bijoux.",
};

export default function CancelamentoReembolsoPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-black text-gray-900">Cancelamento e Reembolso</h1>
      <div className="mt-8 space-y-7 text-sm leading-7 text-gray-600">
        <section>
          <h2 className="font-bold text-gray-900">Antes do envio</h2>
          <p>
            Solicite o cancelamento o quanto antes pelo e-mail <a className="font-semibold text-rose-800 underline" href={`mailto:${LEGAL_IDENTITY.email}`}>{LEGAL_IDENTITY.email}</a>,
            informando o número do pedido. Se a expedição ainda não tiver ocorrido, a loja analisará
            o cancelamento e a reversão da cobrança. O pedido só é considerado cancelado após confirmação.
          </p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">Após o envio ou recebimento</h2>
          <p>
            Aplicam-se o direito de arrependimento e as regras de troca/devolução. Aguarde as
            instruções antes de postar ou entregar o produto.
          </p>
        </section>
        <section>
          <h2 className="font-bold text-gray-900">Reembolso</h2>
          <p>
            Quando devido, o reembolso é iniciado pelo fluxo Asaas correspondente ao método usado.
            A KA Bijoux não promete crédito instantâneo: o prazo de visualização depende do gateway,
            da instituição financeira e do meio de pagamento. A confirmação será enviada ao consumidor.
          </p>
        </section>
      </div>
      <p className="mt-10 text-sm text-gray-600">
        Veja também <Link className="font-semibold text-rose-800 underline" href="/trocas-e-devolucoes">Trocas e Devoluções</Link> e <Link className="font-semibold text-rose-800 underline" href="/contato">Contato</Link>.
      </p>
    </main>
  );
}
