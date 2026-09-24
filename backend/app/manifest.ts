import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KA Bijoux",
    short_name: "KA Bijoux",
    description: "Loja de produtos físicos, acessórios, beleza, presentes e utilidades.",
    start_url: "/",
    display: "standalone",
    background_color: "#17070C",
    theme_color: "#17070C",
    lang: "pt-BR",
    icons: [
      { src: "/images/brand/ka-bijoux-logo-header-320.png", sizes: "320x294", type: "image/png" },
    ],
  };
}
