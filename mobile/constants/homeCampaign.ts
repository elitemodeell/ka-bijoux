import type { HomeBanner, MobileHomePayload } from "@/types/home";

export const CHILDREN_CAMPAIGN_ID = "children_crazy_hair_2026";

export const CHILDREN_CAMPAIGN_ANNOUNCEMENTS = [
  "🎉 Mês das Crianças cheio de novidades",
  "🌈 Cabelo Maluco: cor, criatividade e diversão",
  "🎀 Laços, presilhas e acessórios para brincar com o visual",
  "⭐ Presentes divertidos para pequenos grandes momentos",
  "📱 Capinhas coloridas para entrar no clima",
  "💖 Pequenos estilos, grandes histórias",
];

const girlOne = require("../assets/home/children-crazy-hair/girl-1.webp");
const boyOne = require("../assets/home/children-crazy-hair/boy-1.webp");
const girlTwo = require("../assets/home/children-crazy-hair/girl-2.webp");
const boyTwo = require("../assets/home/children-crazy-hair/boy-2.webp");
const girlThree = require("../assets/home/children-crazy-hair/girl-3.webp");
const boyThree = require("../assets/home/children-crazy-hair/boy-3.webp");

const campaignSlides: Array<Omit<HomeBanner, "href">> = [
  {
    id: `${CHILDREN_CAMPAIGN_ID}_boy_3`,
    title: "Mês das Crianças",
    subtitle: "Presentes, capinhas e acessórios cheios de personalidade",
    cta: "Comprar agora",
    image: boyThree,
    mobileImage: boyThree,
  },
  {
    id: `${CHILDREN_CAMPAIGN_ID}_girl_1`,
    title: "Mês das Crianças • Cabelo Maluco",
    subtitle: "Acessórios criativos, coloridos e cheios de personalidade",
    cta: "Ver ofertas",
    image: girlOne,
    mobileImage: girlOne,
  },
  {
    id: `${CHILDREN_CAMPAIGN_ID}_boy_1`,
    title: "Cabelo Maluco",
    subtitle: "Mais imaginação para dias inesquecíveis",
    cta: "Quero aproveitar",
    image: boyOne,
    mobileImage: boyOne,
  },
  {
    id: `${CHILDREN_CAMPAIGN_ID}_girl_2`,
    title: "Mês das Crianças",
    subtitle: "Cor, criatividade e diversão para a escola",
    cta: "Ver ofertas",
    image: girlTwo,
    mobileImage: girlTwo,
  },
  {
    id: `${CHILDREN_CAMPAIGN_ID}_boy_2`,
    title: "Dia do Cabelo Maluco",
    subtitle: "Pequenos estilos, grandes aventuras",
    cta: "Ver ofertas",
    image: boyTwo,
    mobileImage: boyTwo,
  },
  {
    id: `${CHILDREN_CAMPAIGN_ID}_girl_3`,
    title: "Especial Cabelo Maluco",
    subtitle: "A escola mais colorida, divertida e inesquecível",
    cta: "Ver novidades",
    image: girlThree,
    mobileImage: girlThree,
  },
];

export function applyChildrenCampaign(home: MobileHomePayload): MobileHomePayload {
  const fallbackHref = home.campaign.href || "/produtos";
  const banners = campaignSlides.map((slide, index) => ({
    ...slide,
    // Preserve the destinations already approved for each existing carousel position.
    href: home.banners[index % Math.max(home.banners.length, 1)]?.href || fallbackHref,
  }));

  return {
    ...home,
    announcements: CHILDREN_CAMPAIGN_ANNOUNCEMENTS,
    banners,
    campaign: {
      ...home.campaign,
      title: "Mês das Crianças",
      subtitle: "Especial Cabelo Maluco",
      image: boyThree,
      promoTitle: "Mês das Crianças",
      promoSubtitle: "Acessórios criativos, cor e muita diversão para um Dia das Crianças inesquecível!",
      cta: "Quero aproveitar",
    },
    sections: home.sections.map((section) =>
      section.id === "ofertas-relampago"
        ? {
            ...section,
            label: "Mês das Crianças",
            title: "Imperdíveis 🎉",
            subtitle: "Ofertas para deixar os pequenos grandes momentos ainda mais divertidos.",
          }
        : section,
    ),
    finalCta: {
      ...home.finalCta,
      label: "Mês das Crianças",
      titlePrefix: "Pequenos estilos,",
      titleHighlight: "grandes histórias",
      description: "Presentes e acessórios para dias coloridos, criativos e inesquecíveis.",
      button: "Ver novidades ✨",
    },
  };
}
