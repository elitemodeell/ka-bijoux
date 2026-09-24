import type { Metadata } from "next";
import { LEGAL_ADDRESS_INLINE, LEGAL_IDENTITY } from "@/lib/legal-identity";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(LEGAL_IDENTITY.website),
  title: {
    default: "KA Bijoux — Bijuterias, Óculos e Acessórios",
    template: "%s | KA Bijoux",
  },
  description:
    "Descubra bijuterias, óculos de sol, capinhas e acessórios femininos com estilo. KA Bijoux — elegância que combina com você.",
  keywords: ["bijuterias", "acessórios", "óculos de sol", "capinhas", "KA Bijoux", "Itaúna"],
  openGraph: {
    title: "KA Bijoux — Bijuterias, Óculos e Acessórios",
    description: "Loja de produtos físicos, acessórios, beleza, presentes e utilidades em Itaúna/MG.",
    url: LEGAL_IDENTITY.website,
    siteName: "KA Bijoux",
    type: "website",
    locale: "pt_BR",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/images/brand/ka-bijoux-logo-header-320.png",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: LEGAL_IDENTITY.tradeName,
    legalName: LEGAL_IDENTITY.legalName,
    taxID: LEGAL_IDENTITY.cnpj,
    url: LEGAL_IDENTITY.website,
    email: LEGAL_IDENTITY.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${LEGAL_IDENTITY.address.street}, ${LEGAL_IDENTITY.address.number}`,
      addressLocality: LEGAL_IDENTITY.address.city,
      addressRegion: LEGAL_IDENTITY.address.state,
      postalCode: LEGAL_IDENTITY.address.zipCode,
      addressCountry: "BR",
    },
    description: `Loja de produtos físicos operada por ${LEGAL_IDENTITY.legalName}, em ${LEGAL_ADDRESS_INLINE}.`,
  };

  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        {children}
      </body>
    </html>
  );
}
