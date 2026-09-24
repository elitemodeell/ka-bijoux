import type { Metadata } from "next";
import { LEGAL_ADDRESS_LINES, LEGAL_IDENTITY } from "@/lib/legal-identity";

export const metadata: Metadata = {
  title: "Sobre a KA Bijoux",
  description: "Identificação institucional da KA Bijoux.",
};

export default function SobrePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-black text-gray-900">Sobre a KA Bijoux</h1>
      <p className="mt-4 text-sm leading-7 text-gray-600">
        A KA Bijoux comercializa produtos físicos de beleza, acessórios, presentes e utilidades.
        O catálogo disponível pode variar entre o site e o aplicativo distribuído pela Google Play.
      </p>
      <section className="mt-8 space-y-2 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
        <p><strong>{LEGAL_IDENTITY.legalName}</strong></p>
        <p>CNPJ: {LEGAL_IDENTITY.cnpj}</p>
        <p>Representante legal: {LEGAL_IDENTITY.legalRepresentative}</p>
        <address className="not-italic">{LEGAL_ADDRESS_LINES.map((line) => <span className="block" key={line}>{line}</span>)}</address>
        <p><a className="font-semibold text-rose-800 underline" href={`mailto:${LEGAL_IDENTITY.email}`}>{LEGAL_IDENTITY.email}</a></p>
      </section>
    </main>
  );
}
