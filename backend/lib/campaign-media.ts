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

export const copaBannerHref = "/categoria/camisas-selecao-brasileira";

export const copaBannerImage = "/banners/ChatGPT%20Image%204%20de%20jun.%20de%202026,%2012_15_33.png";

export const valentinesCampaignBanner = "/banners/ChatGPT%20Image%204%20de%20jun.%20de%202026,%2012_21_17.png";

export const valentinesCampaignVideos: CampaignVideo[] = [
  {
    id: "namorados-02",
    title: "Presente com carinho",
    src: "/videos/stories/videos-namorados/namorados-02.mp4",
    poster: valentinesCampaignBanner,
  },
  {
    id: "namorados-03",
    title: "Detalhes que encantam",
    src: "/videos/stories/videos-namorados/namorados-03.mp4",
    poster: valentinesCampaignBanner,
  },
  {
    id: "namorados-04",
    title: "Acessorios romanticos",
    src: "/videos/stories/videos-namorados/namorados-04.mp4",
    poster: valentinesCampaignBanner,
  },
  {
    id: "namorados-05",
    title: "Para quem voce ama",
    src: "/videos/stories/videos-namorados/namorados-05.mp4",
    poster: valentinesCampaignBanner,
  },
  {
    id: "namorados-06",
    title: "Brilho especial",
    src: "/videos/stories/videos-namorados/namorados-06.mp4",
    poster: valentinesCampaignBanner,
  },
];

export const activeSeasonalCampaign: SeasonalCampaign = {
  id: "dia-dos-namorados",
  eyebrow: "Campanha especial KA",
  title: "Especial Dia dos Namorados",
  titleLines: ["Especial Dia dos", "Namorados"],
  subtitle: "Presentes, acessorios e detalhes delicados para encantar quem voce ama.",
  ctaLabel: "Ver colecao especial",
  ctaHref: "/produtos?campanha=dia-dos-namorados",
  image: valentinesCampaignBanner,
  accent: "Romantico e delicado",
  shortcuts: [
    { label: "Presentes romanticos", href: "/produtos?campanha=dia-dos-namorados" },
    { label: "Bijuterias delicadas", href: "/categoria/bijuterias" },
    { label: "Lingerie", href: "/categoria/lingerie" },
    { label: "Perfumaria", href: "/categoria/perfumaria" },
    { label: "Ver tudo", href: "/produtos" },
  ],
};
