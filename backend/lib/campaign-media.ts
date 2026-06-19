export type CampaignVideo = {
  id: string;
  title: string;
  src: string;
  poster: string;
};

export type SeasonalCampaign = {
  id: string;
  eyebrow: string;
  title: string;
  titleLines?: string[];
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  accent: string;
  shortcuts: Array<{
    label: string;
    href: string;
  }>;
};

export const copaBannerHref = "/categoria/sex-shop";

export const copaBannerImage = "/banners/banner-copa-do-prazer-2026.jpg";

export const activeSeasonalCampaign: SeasonalCampaign = {
  id: "copa-do-prazer",
  eyebrow: "Copa do Prazer — Entrou em Campo!",
  title: "Copa do Prazer",
  titleLines: ["Copa do", "Prazer!"],
  subtitle: "Produtos selecionados para elevar sua experiência com uma campanha especial.",
  ctaLabel: "Quero aproveitar",
  ctaHref: "/categoria/sex-shop",
  image: copaBannerImage,
  accent: "Frete grátis acima de R$150",
  shortcuts: [
    { label: "Geis & Cremes", href: "/categoria/sex-shop/geis-e-cremes" },
    { label: "Vibradores", href: "/categoria/sex-shop/vibradores" },
    { label: "Lubrificantes", href: "/categoria/sex-shop/lubrificantes" },
    { label: "Lingerie", href: "/categoria/lingerie" },
    { label: "Ver tudo", href: "/categoria/sex-shop" },
  ],
};
