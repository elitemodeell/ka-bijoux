import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KA Bijoux - Admin",
  description: "Painel administrativo KA Bijoux",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
