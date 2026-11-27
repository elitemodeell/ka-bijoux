export type HomeHeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string;
  mobileImage: string;
  objectPosition: string;
};

export type HomeCampaignContent = {
  title: string;
  subtitle: string;
  image: string;
  href: string;
  promoTitle: string;
  promoSubtitle: string;
  cta: string;
};

export type HomePresentation = {
  theme: "christmas" | "default";
  seasonalDecoration: boolean;
  logoUrl: string;
  storyLogoUrl: string;
  headerColors: readonly [string, string];
  ambientMusic: { enabled: boolean; url: string | null };
  announcements: readonly string[];
  banners: readonly HomeHeroSlide[];
  campaign: HomeCampaignContent;
};

export type HomeQuickCategory = {
  label: string;
  description: string;
  icon: "sparkles" | "tag" | "new" | "diamond" | "phone" | "heart" | "grid";
  href: string;
  playAllowed: boolean;
};

export type HomeSectionKey =
  | "ofertasRelampago"
  | "achadinhos"
  | "novidades"
  | "maisVendidos"
  | "paraPresentes"
  | "belezaAutocuidado";

export type HomeSectionDefinition = {
  id: string;
  key: HomeSectionKey;
  label: string;
  title: string;
  subtitle?: string;
  route: string;
  moreLabel: string;
  badges: readonly string[];
  badgeSeal?: boolean;
  background: "subtle" | "white";
};

export const HOME_ANNOUNCEMENTS = [
  "\uD83D\uDC96 Novidades selecionadas para você",
  "\uD83D\uDCF1 Capinhas estilosas para o seu celular",
  "\uD83D\uDD76\uFE0F Óculos de sol com muito charme",
  "\u2728 Bijuterias delicadas para o dia a dia",
  "\uD83D\uDED2 Acessórios femininos com estilo",
  "\uD83D\uDE9A Retirada e entrega local em Itaúna",
  "\uD83D\uDCB3 Pagamento seguro via Pix",
  "\uD83C\uDF81 Presentes especiais para quem você ama",
] as const;

const DEFAULT_HOME_HERO_SLIDES: HomeHeroSlide[] = [
  {
    id: "ferias-com-estilo",
    title: "Férias com Estilo",
    subtitle: "Ofertas para viajar, sair e se cuidar",
    cta: "Quero Aproveitar",
    href: "/produtos?new=true",
    image: "/banners/banner-ferias-com-estilo.webp",
    mobileImage: "/banners/banner-ferias-com-estilo-mobile.webp",
    objectPosition: "center",
  },
  {
    id: "mala-pronta",
    title: "Mala Pronta, Look Completo",
    subtitle: "Capinhas, bolsas, óculos e acessórios para todos os momentos",
    cta: "Comprar Agora",
    href: "/produtos",
    image: "/banners/banner-mala-pronta-look-completo.webp",
    mobileImage: "/banners/banner-mala-pronta-look-completo-mobile.webp",
    objectPosition: "center",
  },
  {
    id: "destino-ferias",
    title: "Destino: Férias",
    subtitle: "Acessórios e bijuterias com alegria, charme e verão",
    cta: "Ver Ofertas",
    href: "/categoria/bijuterias",
    image: "/banners/banner-destino-ferias.webp",
    mobileImage: "/banners/banner-destino-ferias-mobile.webp",
    objectPosition: "center",
  },
  {
    id: "brilhe-nas-ferias",
    title: "Brilhe nas Férias",
    subtitle: "Peças delicadas para deixar seu visual ainda mais bonito",
    cta: "Quero Brilhar",
    href: "/categoria/bijuterias",
    image: "/banners/banner-brilhe-nas-ferias.webp",
    mobileImage: "/banners/banner-brilhe-nas-ferias-mobile.webp",
    objectPosition: "center",
  },
];

const CHRISTMAS_ANNOUNCEMENTS = [
  "🎄 Presentes que encantam neste Natal",
  "✨ Brilhe neste Natal com KA Bijoux",
  "🎁 Encontre acessórios especiais para presentear",
] as const;

const CHRISTMAS_HERO_SLIDES: HomeHeroSlide[] = [
  {
    id: "natal-presentes-que-encantam",
    title: "Presentes que encantam",
    subtitle: "Bijuterias e acessórios para surpreender",
    cta: "Conferir coleção",
    href: "/produtos",
      image: "/banners/ka-natal-presentes-encantam-brand.webp",
      mobileImage: "/banners/ka-natal-presentes-encantam-brand.webp",
    objectPosition: "center",
  },
  {
    id: "natal-brilhe-neste-natal",
    title: "Brilhe neste Natal",
    subtitle: "Bijuterias e acessórios para valorizar seu estilo",
    cta: "Comprar agora",
    href: "/categoria/bijuterias",
      image: "/banners/ka-natal-brilhe-neste-natal-brand.webp",
      mobileImage: "/banners/ka-natal-brilhe-neste-natal-brand.webp",
    objectPosition: "center",
  },
    {
      id: "natal-cheio-de-estilo",
      title: "Brilhe neste Natal",
      subtitle: "Bijuterias e acessórios para valorizar seu estilo",
      cta: "Comprar agora",
      href: "/categoria/bijuterias",
      image: "/banners/ka-natal-cheio-de-estilo-brand.webp",
      mobileImage: "/banners/ka-natal-cheio-de-estilo-brand.webp",
      objectPosition: "center",
    },
];

export const HOME_QUICK_CATEGORIES: HomeQuickCategory[] = [
  {
    label: "Novidades",
    description: "Confira o que acabou de chegar.",
    icon: "sparkles",
    href: "/produtos?new=true",
    playAllowed: true,
  },
  {
    label: "Promoções",
    description: "Descontos especiais.",
    icon: "tag",
    href: "/produtos?promo=true",
    playAllowed: true,
  },
  {
    label: "Lançamentos",
    description: "As tendências do momento.",
    icon: "new",
    href: "/produtos?sort=createdAt",
    playAllowed: true,
  },
  {
    label: "Bijuterias",
    description: "Peças para todos os estilos.",
    icon: "diamond",
    href: "/categoria/bijuterias",
    playAllowed: true,
  },
  {
    label: "Capinhas",
    description: "Proteção com muito estilo.",
    icon: "phone",
    href: "/categoria/capinhas-acessorios-celular",
    playAllowed: true,
  },
  {
    label: "Ver categorias",
    description: "Explore a loja completa.",
    icon: "grid",
    href: "/produtos",
    playAllowed: true,
  },
];

export const HOME_CAMPAIGN = {
  title: "Destino: Férias",
  subtitle: "Ofertas especiais para curtir seus melhores momentos",
  image: "/banners/banner-destino-ferias-mobile.webp",
  href: "/produtos?new=true",
  promoTitle: "Férias com estilo!",
  promoSubtitle: "Ofertas para viajar, sair e se cuidar",
  cta: "Quero aproveitar",
} as const;

const CHRISTMAS_CAMPAIGN = {
  title: "Natal KA Bijoux",
  subtitle: "Presentes que encantam",
  image: "/banners/ka-natal-presentes-encantam-brand.webp",
  href: "/produtos",
  promoTitle: "Brilhe neste Natal",
  promoSubtitle: "Bijuterias e acessórios especiais para presentear",
  cta: "Conferir coleção",
} as const;

/** Seasonal content is returned by the backend so it can expire without a mobile rebuild. */
export type HomePresentationSettings = {
  themeMode?: "AUTO" | "CHRISTMAS" | "DEFAULT";
  logoUrl?: string | null;
  storyLogoUrl?: string | null;
  headerColors?: readonly [string, string];
  bannerUrls?: readonly string[];
  ambientMusicEnabled?: boolean;
  ambientMusicUrl?: string | null;
};

const DEFAULT_HEADER_COLORS = ["#7a002e", "#51001f"] as const;
const DEFAULT_CHRISTMAS_LOGO = "/images/brand/ka-bijoux-logo-natal.png";
const DEFAULT_CHRISTMAS_STORY_LOGO = "/images/brand/ka-bijoux-logo-natal-story.png";

export function getHomePresentation(now = new Date(), settings: HomePresentationSettings = {}): HomePresentation {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const automaticChristmas = month === 11 || (month === 12 && day <= 26);
  const christmas = settings.themeMode === "CHRISTMAS"
    ? true
    : settings.themeMode === "DEFAULT"
      ? false
      : automaticChristmas;

  const presentation: Omit<HomePresentation, "logoUrl" | "storyLogoUrl" | "headerColors" | "ambientMusic"> = christmas
    ? {
        theme: "christmas",
        seasonalDecoration: true,
        announcements: CHRISTMAS_ANNOUNCEMENTS,
        banners: CHRISTMAS_HERO_SLIDES,
        campaign: CHRISTMAS_CAMPAIGN,
      }
    : {
        theme: "default",
        seasonalDecoration: false,
        announcements: HOME_ANNOUNCEMENTS,
        banners: DEFAULT_HOME_HERO_SLIDES,
        campaign: HOME_CAMPAIGN,
      };

  const banners = presentation.banners.map((slide, index) => {
    const image = settings.bannerUrls?.[index];
    return image ? { ...slide, image, mobileImage: image } : slide;
  });

  return {
    ...presentation,
    banners,
    logoUrl: christmas ? settings.logoUrl || DEFAULT_CHRISTMAS_LOGO : "",
    storyLogoUrl: christmas ? settings.storyLogoUrl || DEFAULT_CHRISTMAS_STORY_LOGO : "/images/brand/ka-bijoux-logo-story-icon.png",
    headerColors: settings.headerColors ?? DEFAULT_HEADER_COLORS,
    ambientMusic: {
      enabled: christmas && (settings.ambientMusicEnabled ?? true),
      url: settings.ambientMusicUrl || null,
    },
  };
}

export const HOME_BENEFITS = [
  { icon: "gift", title: "Envio e retirada", subtitle: "Escolha a melhor forma na finalização" },
  { icon: "card", title: "Pix via Asaas", subtitle: "Pagamento seguro e confirmado" },
  { icon: "shield", title: "Compra segura", subtitle: "Pedido acompanhado com cuidado" },
] as const;

export const HOME_SECTION_DEFINITIONS: readonly HomeSectionDefinition[] = [
  {
    id: "ofertas-relampago",
    key: "ofertasRelampago",
    label: "Imperdíveis",
    title: "Ofertas Relâmpago 🔥",
    route: "/produtos?promo=true",
    moreLabel: "Ver todos os produtos",
    badges: ["Imperdível", "Oferta", "Super Preço", "Corre!", "Aproveite"],
    badgeSeal: true,
    background: "subtle",
  },
  {
    id: "achadinhos",
    key: "achadinhos",
    label: "Achados da semana",
    title: "Achados da Semana",
    subtitle: "Seleção especial da KA Bijoux.",
    route: "/produtos",
    moreLabel: "Ver mais achadinhos",
    badges: ["Achadinho", "Queridinho", "Boa Compra", "Favorito"],
    background: "white",
  },
  {
    id: "novidades",
    key: "novidades",
    label: "Chegando agora",
    title: "Novidades 🆕",
    route: "/produtos?new=true",
    moreLabel: "Ver todas as novidades",
    badges: ["Novo", "Lançamento", "Chegou"],
    background: "subtle",
  },
  {
    id: "mais-vendidos",
    key: "maisVendidos",
    label: "Top da semana",
    title: "Mais Vendidos ⭐",
    route: "/produtos?ordem=mais-vendidos",
    moreLabel: "Ver mais vendidos",
    badges: ["Mais Vendido", "Destaque", "Top"],
    background: "white",
  },
  {
    id: "para-presentear",
    key: "paraPresentes",
    label: "Ideias de presente",
    title: "Para Presentear 🎁",
    route: "/produtos",
    moreLabel: "Ver opções para presentear",
    badges: ["Presente", "Especial", "Mimo", "Encanto"],
    background: "subtle",
  },
  {
    id: "beleza-autocuidado",
    key: "belezaAutocuidado",
    label: "Beleza e bem-estar",
    title: "Beleza e Autocuidado ✨",
    route: "/produtos",
    moreLabel: "Ver mais beleza",
    badges: ["Top Beleza", "Favorita", "Tendência"],
    background: "white",
  },
] as const;

export const HOME_FINAL_CTA = {
  label: "Sua loja favorita",
  titlePrefix: "Pronta para se sentir",
  titleHighlight: "ainda mais linda?",
  description:
    "Veja nossa coleção completa e encontre o acessório perfeito para cada momento.",
  button: "Ver coleção ✨",
  href: "/produtos",
} as const;

export function pickHomeBadge(id: string, options: readonly string[]): string {
  const checksum = id.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
  return options[checksum % options.length];
}
