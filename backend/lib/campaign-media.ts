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

export const feriasBannerHref = "/produtos?new=true";

export const feriasBannerImage = "/banners/banner-ferias-com-estilo.png";

export const activeSeasonalCampaign: SeasonalCampaign = {
  id: "ferias-com-estilo",
  eyebrow: "Férias com Estilo — Chegou a hora!",
  title: "Férias com Estilo",
  titleLines: ["Férias", "com Estilo!"],
  subtitle: "Acessórios, bijuterias, capinhas e bolsas para viajar, sair e se cuidar.",
  ctaLabel: "Quero aproveitar",
  ctaHref: "/produtos?new=true",
  image: feriasBannerImage,
  accent: "Envio para todo o Brasil",
  shortcuts: [
    { label: "Bijuterias", href: "/categoria/bijuterias" },
    { label: "Capinhas", href: "/categoria/capinhas-acessorios-celular" },
    { label: "Bolsas", href: "/categoria/bolsas-necessaires" },
    { label: "Óculos", href: "/categoria/oculos" },
    { label: "Ver tudo", href: "/produtos" },
  ],
};
