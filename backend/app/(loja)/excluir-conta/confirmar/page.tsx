import type { Metadata } from "next";
import { AccountDeletionConfirmation } from "@/components/loja/AccountDeletionConfirmation";

export const metadata: Metadata = {
  title: "Confirmar exclusão de conta",
  robots: { index: false, follow: false },
};

export default async function ConfirmarExclusaoPage(
  props: {
    searchParams: Promise<{ token?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-bold uppercase tracking-wider text-rose-800">KA Bijoux</p>
      <h1 className="mt-2 text-3xl font-black text-gray-950">Exclusão de conta</h1>
      <div className="mt-8">
        <AccountDeletionConfirmation token={searchParams.token || ""} />
      </div>
    </main>
  );
}
