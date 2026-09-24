import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Retorno do pagamento",
  robots: { index: false, follow: false },
};

type ReturnPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function PaymentReturnPage({
  searchParams,
}: ReturnPageProps) {
  const params = (await searchParams) ?? {};
  const orderId = first(params.orderId);
  const appUrl = orderId
    ? `kabijoux://pedidos/${encodeURIComponent(orderId)}`
    : "kabijoux://pedidos";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff7f9] px-5">
      <section className="w-full max-w-lg rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c8274a]">
          KA Bijoux
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          Checkout finalizado
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          O retorno do checkout não confirma o pagamento. A KA Bijoux atualizará
          o pedido somente após a confirmação segura enviada pelo provedor.
        </p>
        <a
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#c8274a] px-6 font-semibold text-white"
          href={appUrl}
        >
          Voltar para o aplicativo
        </a>
      </section>
    </main>
  );
}
