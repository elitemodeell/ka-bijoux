import type { Metadata } from "next";
import CustomerAccount from "@/components/loja/CustomerAccount";

export const metadata: Metadata = {
  title: "Minha conta",
  robots: { index: false, follow: false },
};

export default function CustomerAccountPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 pb-16 pt-32 md:pt-28">
      <section className="mx-auto max-w-md rounded-[32px] border border-pink-100 bg-white p-6 shadow-[0_24px_80px_rgba(236,72,153,0.12)] sm:p-8">
        <h1 className="mb-6 text-center text-2xl font-black tracking-tight text-gray-900">Minha conta</h1>
        <CustomerAccount />
      </section>
    </main>
  );
}
