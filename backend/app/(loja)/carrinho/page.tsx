import type { Metadata } from "next";
import CartPageClient from "@/components/loja/CartPageClient";

export const metadata: Metadata = {
  title: "Carrinho",
  description: "Carrinho da KA Bijoux.",
};

export default function CarrinhoPage() {
  return (
    <main className="bg-white pt-32">
      <CartPageClient />
    </main>
  );
}
