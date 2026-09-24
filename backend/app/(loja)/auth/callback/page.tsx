import type { Metadata } from "next";
import { Suspense } from "react";
import GoogleAuthCallback from "@/components/loja/GoogleAuthCallback";

export const metadata: Metadata = {
  title: "Concluindo acesso",
  robots: { index: false, follow: false },
};

export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 pb-16 pt-32 md:pt-28">
      <section className="mx-auto max-w-md rounded-[32px] border border-pink-100 bg-white p-8 shadow-[0_24px_80px_rgba(236,72,153,0.12)]">
        <Suspense fallback={<p className="text-center text-sm font-semibold text-gray-600">Concluindo sua entrada…</p>}>
          <GoogleAuthCallback />
        </Suspense>
      </section>
    </main>
  );
}
