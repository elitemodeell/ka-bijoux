import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KA Bijoux — Bijuterias, Óculos e Acessórios",
    template: "%s | KA Bijoux",
  },
  description:
    "Descubra bijuterias, óculos de sol, capinhas e acessórios femininos com estilo. KA Bijoux — elegância que combina com você.",
  keywords: ["bijuterias", "acessórios", "óculos de sol", "capinhas", "KA Bijoux", "Itaúna"],
  openGraph: {
    siteName: "KA Bijoux",
    type: "website",
    locale: "pt_BR",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/images/brand/ka-bijoux-logo-header-320.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
