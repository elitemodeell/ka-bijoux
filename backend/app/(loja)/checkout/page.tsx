import type { Metadata } from "next";
import WebCheckout from "@/components/loja/WebCheckout";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <main className="px-4 pb-16 pt-32"><WebCheckout /></main>;
}
