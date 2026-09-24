import type { Metadata } from "next";
import Link from "next/link";
import { getPublicStoreInfo } from "@/lib/public-store-info";
import { LEGAL_IDENTITY } from "@/lib/legal-identity";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trocas e Devoluções",
  description: "Orientações sobre arrependimento, trocas, devoluções e reembolsos da KA Bijoux.",
};

export default async function TrocasDevolucoesPage() {
  const store = await getPublicStoreInfo();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-black text-gray-900">Trocas, Devoluções e Reembolsos</h1>
      <p className="mt-3 text-sm leading-7 text-gray-600">
        Esta página não limita direitos previstos no Código de Defesa do Consumidor.
      </p>

      <div className="mt-8 space-y-7 text-sm leading-7 text-gray-600">
        <section>
          <h2 className="font-bold text-gray-900">Direito de arrependimento</h2>
          <p>
            Em compras realizadas pela internet, o consumidor pode comunicar o arrependimento
            no prazo legal de 7 dias, contado do recebimento do produto ou da contratação,
            conforme aplicável. A solicitação deve identificar o pedido e o item.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900">Produto com defeito, avaria ou item incorreto</h2>
          <p>
            Entre em contato assim que identificar o problema e preserve produto, embalagem e
            comprovantes disponíveis. A análise e as soluções observarão os prazos e alternativas
            legais, sem excluir garantia ou direito obrigatório.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900">Como solicitar</h2>
          <p>
            Use a página de <Link className="font-semibold text-rose-800 underline" href="/contato">contato</Link>
            {store.email ? <> ou envie e-mail para <a className="font-semibold text-rose-800 underline" href={`mailto:${LEGAL_IDENTITY.email}`}>{LEGAL_IDENTITY.email}</a></> : null},
            informando o número do pedido, o item e o motivo. Aguarde as instruções antes de
            enviar ou entregar o produto. Não há atendimento por WhatsApp nesta versão.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900">Reembolso</h2>
          <p>
            Quando devido, o reembolso será solicitado pelo mesmo fluxo financeiro da compra,
            observando o processamento do gateway e da instituição financeira. A confirmação do
            cancelamento ou estorno será comunicada ao consumidor. O prazo para o crédito aparecer
            depende do método de pagamento, da Asaas e da instituição financeira.
          </p>
        </section>
      </div>
    </main>
  );
}
