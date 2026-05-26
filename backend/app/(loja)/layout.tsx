import type { Metadata } from "next";
import Navbar from "@/components/loja/Navbar";
import Footer from "@/components/loja/Footer";

export const metadata: Metadata = {
  title: {
    default: "KA Bijoux — Bijuterias, Óculos e Acessórios",
    template: "%s | KA Bijoux",
  },
};

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="min-h-screen">{children}</div>
      <Footer />
    </>
  );
}
