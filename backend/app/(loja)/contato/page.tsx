import type { Metadata } from "next";
import { getPublicStoreInfo } from "@/lib/public-store-info";
import { LEGAL_ADDRESS_LINES, LEGAL_IDENTITY } from "@/lib/legal-identity";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contato",
  description: "Canais oficiais de atendimento da KA Bijoux.",
};

export default async function ContatoPage() {
  const store = await getPublicStoreInfo();
  const phoneHref = store.phone?.replace(/[^+\d]/g, "");

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-black text-gray-900">Contato</h1>
      <p className="mt-3 text-sm leading-7 text-gray-600">
        Use os canais abaixo para atendimento sobre pedidos, pagamentos, entrega,
        trocas, devoluções, privacidade ou exclusão de conta.
      </p>

      <section className="mt-8 space-y-3 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
        <p><strong>{LEGAL_IDENTITY.legalName}</strong></p>
        <p>CNPJ: {LEGAL_IDENTITY.cnpj}</p>
        <p>Representante legal: {LEGAL_IDENTITY.legalRepresentative}</p>
        <address className="not-italic">{LEGAL_ADDRESS_LINES.map((line) => <span className="block" key={line}>{line}</span>)}</address>
        <p>
          E-mail: <a className="font-semibold text-rose-800 underline" href={`mailto:${LEGAL_IDENTITY.email}`}>{LEGAL_IDENTITY.email}</a>
        </p>
        {store.phone && phoneHref ? (
          <p>
            Telefone: <a className="font-semibold text-rose-800 underline" href={`tel:${phoneHref}`}>{store.phone}</a>
          </p>
        ) : null}
        {store.hours ? <p>Horário informado: {store.hours}</p> : null}
      </section>

      <p className="mt-6 text-xs leading-6 text-gray-500">
        O canal atende consumidores e solicitações LGPD. Nunca envie senha, token de acesso,
        código de autenticação ou número completo de cartão por e-mail ou telefone.
      </p>
    </main>
  );
}
