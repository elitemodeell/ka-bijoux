import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import GoogleSignInButton from "@/components/loja/GoogleSignInButton";

export const metadata: Metadata = {
  title: "Entrar ou criar sua conta",
  robots: { index: false, follow: false },
};

export default function CustomerSignInPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 pb-16 pt-32 md:pt-28">
      <section className="mx-auto max-w-md rounded-[32px] border border-pink-100 bg-white p-6 shadow-[0_24px_80px_rgba(236,72,153,0.12)] sm:p-8">
        <Image
          src="/images/brand/ka-bijoux-logo-header-320.png"
          alt="KA Bijoux"
          width={320}
          height={294}
          className="mx-auto h-20 w-auto object-contain"
          priority
        />
        <div className="mb-7 mt-3 text-center">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Entre ou crie sua conta</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">Use sua conta Google para entrar com segurança.</p>
        </div>
        <Suspense fallback={<div className="h-14 animate-pulse rounded-2xl bg-gray-100" />}>
          <GoogleSignInButton />
        </Suspense>
        <p className="mt-7 text-center text-xs leading-relaxed text-gray-400">
          Ao continuar, você concorda com os termos e a política de privacidade da KA Bijoux.
        </p>
      </section>
    </main>
  );
}
