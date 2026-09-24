import type { Metadata } from "next";
import Link from "next/link";
import { getPublicStoreInfo } from "@/lib/public-store-info";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrega e Frete",
  description: "Modalidades de entrega e cálculo de frete da KA Bijoux.",
};

export default async function EntregaPage() {
  const store = await getPublicStoreInfo();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-black text-gray-900">Entrega e Frete</h1>
      <p className="mt-3 text-sm leading-7 text-gray-600">
        As modalidades, valores e prazos válidos são sempre os apresentados no checkout
        para o endereço e os itens do pedido. O aplicativo não presume frete grátis.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-gray-600">
        <section>
          <h2 className="font-bold text-gray-900">Retirada na loja</h2>
          <p>
            {store.pickupEnabled
              ? "Disponível sem cobrança de frete. Aguarde a confirmação de que o pedido está pronto antes de comparecer."
              : "Modalidade indisponível no momento."}
          </p>
          {store.pickupEnabled && store.address ? (
            <p className="mt-1 font-medium text-gray-800">
              {store.address}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="font-bold text-gray-900">Mototáxi local</h2>
          <p>
            {store.mototaxiEnabled
              ? `Disponível apenas para endereços aceitos na área configurada de ${store.city}/${store.state}. O valor atual é mostrado e validado pelo servidor no checkout${store.mototaxiPrice ? ` (configuração atual: R$ ${store.mototaxiPrice.replace(".", ",")})` : ""}.`
              : "Modalidade indisponível no momento."}
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900">Transportadoras</h2>
          <p>
            {store.carrierShippingEnabled
              ? "As opções são calculadas no checkout conforme CEP, peso, dimensões, quantidade e disponibilidade do transportador. Se nenhuma cotação válida for retornada, a modalidade fica indisponível."
              : "A integração nacional com o Melhor Envio ainda não está homologada e cotações por transportadora estão indisponíveis no momento. Não anunciamos entrega nacional enquanto esse fluxo não estiver ativo e testado."}
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900">Conferência e atendimento</h2>
          <p>
            Confira o endereço antes do pagamento. Para atraso, avaria ou dúvida sobre uma entrega,
            use a página de <Link className="font-semibold text-rose-800 underline" href="/contato">contato</Link> informando o número do pedido.
          </p>
        </section>
      </div>
    </main>
  );
}
