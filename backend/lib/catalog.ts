export const PRICE_PRESETS = [12, 24, 27, 36, 47, 48] as const;

export type CatalogSubcategory = {
  name: string;
  slug: string;
  pathSlug: string;
  description: string;
};

export type CatalogCategory = {
  name: string;
  publicName?: string;
  slug: string;
  description: string;
  icon: string;
  image?: string;
  group: string;
  order: number;
  homeFeatured?: boolean;
  adult?: boolean;
  subcategories?: CatalogSubcategory[];
};

export const CATALOG_GROUPS = [
  {
    title: "Moda e beleza",
    categories: [
      "bijuterias",
      "bolsas-necessaires",
      "relogios",
      "maquiagem",
      "perfumaria",
      "oculos",
      "acessorios-cabelo",
      "cintos",
    ],
  },
  {
    title: "Moda íntima e roupas",
    categories: ["pijamas", "lingerie", "roupa-infantil", "acessorios-inverno"],
  },
  {
    title: "Casa e variedades",
    categories: ["utilidades-domesticas", "decoracao", "papelaria", "brinquedos", "pet"],
  },
  {
    title: "Celular e acessórios",
    categories: ["capinhas-acessorios-celular"],
  },
  {
    title: "Adulto",
    categories: ["sex-shop"],
  },
] as const;

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  {
    name: "Sex Shop",
    publicName: "Linha Adulto",
    slug: "sex-shop",
    description: "Produtos adultos com discrição e qualidade. Entrega sigilosa.",
    icon: "18+",
    group: "Adulto",
    order: 1,
    adult: true,
    homeFeatured: false,
    subcategories: [
      {
        name: "Géis & Cremes",
        slug: "sex-shop-geis-e-cremes",
        pathSlug: "geis-e-cremes",
        description: "Géis de massagem corporal, cremes estimulantes e produtos sensoriais.",
      },
      {
        name: "Jogos Adultos",
        slug: "sex-shop-jogos",
        pathSlug: "jogos-adultos",
        description: "Jogos, cartas e desafios para momentos adultos com discrição.",
      },
      {
        name: "Acessórios Adultos",
        slug: "sex-shop-acessorios",
        pathSlug: "acessorios-adultos",
        description: "Acessórios adultos, plugs, algemas e itens para uso consensual.",
      },
      {
        name: "Próteses Adultas",
        slug: "sex-shop-proteses",
        pathSlug: "proteses-adultas",
        description: "Próteses adultas com informações claras, uso responsável e discrição.",
      },
      {
        name: "Vibradores",
        slug: "sex-shop-vibradores",
        pathSlug: "vibradores",
        description: "Vibradores, bullets e controles vibratórios.",
      },
      {
        name: "Anéis Penianos",
        slug: "sex-shop-aneis",
        pathSlug: "aneis-penianos",
        description: "Anéis penianos em diversas cores e modelos.",
      },
      {
        name: "Masturbadores",
        slug: "sex-shop-masturbadores",
        pathSlug: "masturbadores",
        description: "Masturbadores EGG e mini bullets.",
      },
      {
        name: "Lubrificantes",
        slug: "sex-shop-lubrificantes",
        pathSlug: "lubrificantes",
        description: "Géis lubrificantes e umectantes íntimos.",
      },
      {
        name: "Balas Líquidas",
        slug: "sex-shop-balas-liquidas",
        pathSlug: "balas-liquidas",
        description: "Balas líquidas e estimulantes orais.",
      },
      {
        name: "Desodorantes Íntimos",
        slug: "sex-shop-desodorantes",
        pathSlug: "desodorantes-intimos",
        description: "Desodorantes íntimos com fragrâncias suaves.",
      },
    ],
  },
  {
    name: "Capinhas e acessórios de celular",
    slug: "capinhas-acessorios-celular",
    description: "Capinhas, suportes e acessórios para deixar o celular mais bonito e protegido.",
    icon: "CEL",
    image: "/images/categories/capinhas-acessorios-celular.jpg",
    group: "Celular e acessórios",
    order: 2,
    homeFeatured: true,
  },
  {
    name: "Bijuterias",
    slug: "bijuterias",
    description: "Brincos, anéis, colares e peças delicadas para o dia a dia.",
    icon: "BJU",
    image: "/images/categories/bijuterias.jpg",
    group: "Moda e beleza",
    order: 3,
    homeFeatured: true,
  },
  {
    name: "Bolsas e Necessaires",
    slug: "bolsas-necessaires",
    description: "Bolsas, necessaires e organizadores femininos para todos os momentos.",
    icon: "BOL",
    image: "/images/categories/bolsas-necessaires.jpg",
    group: "Moda e beleza",
    order: 4,
    homeFeatured: true,
  },
  {
    name: "Relógios",
    slug: "relogios",
    description: "Relógios femininos e acessórios para compor looks elegantes.",
    icon: "REL",
    group: "Moda e beleza",
    order: 5,
  },
  {
    name: "Maquiagem",
    slug: "maquiagem",
    description: "Produtos de beleza para realcar sua rotina com praticidade.",
    icon: "MK",
    image: "/images/categories/maquiagem.jpg",
    group: "Moda e beleza",
    order: 6,
    homeFeatured: true,
  },
  {
    name: "Utilidades domésticas",
    slug: "utilidades-domesticas",
    description: "Itens praticos e charmosos para organizar a casa.",
    icon: "CAS",
    group: "Casa e variedades",
    order: 7,
  },
  {
    name: "Decoração",
    slug: "decoracao",
    description: "Detalhes decorativos para deixar cada cantinho mais especial.",
    icon: "DEC",
    group: "Casa e variedades",
    order: 8,
  },
  {
    name: "Perfumaria",
    slug: "perfumaria",
    description: "Perfumes e fragrâncias selecionadas para presentear ou usar todos os dias.",
    icon: "PER",
    group: "Moda e beleza",
    order: 9,
  },
  {
    name: "Óculos",
    slug: "oculos",
    description: "Óculos adultos e infantis para completar o visual com estilo.",
    icon: "OCL",
    image: "/images/categories/oculos.jpg",
    group: "Moda e beleza",
    order: 10,
    homeFeatured: true,
    subcategories: [
      {
        name: "Infantil",
        slug: "oculos-infantil",
        pathSlug: "infantil",
        description: "Óculos infantis com estilo, conforto e cuidado.",
      },
      {
        name: "Adulto",
        slug: "oculos-adulto",
        pathSlug: "adulto",
        description: "Óculos adultos para looks modernos e elegantes.",
      },
    ],
  },
  {
    name: "Acessórios de cabelo",
    slug: "acessorios-cabelo",
    description: "Tiaras, presilhas, piranhas e detalhes delicados para cabelo.",
    icon: "CAB",
    group: "Moda e beleza",
    order: 11,
  },
  {
    name: "Pijamas",
    slug: "pijamas",
    description: "Pijamas confortaveis para noites leves e bonitas.",
    icon: "PIJ",
    group: "Moda íntima e roupas",
    order: 12,
  },
  {
    name: "Lingerie",
    slug: "lingerie",
    description: "Lingeries selecionadas com delicadeza e bom gosto.",
    icon: "LIN",
    group: "Moda íntima e roupas",
    order: 13,
  },
  {
    name: "Roupa infantil",
    slug: "roupa-infantil",
    description: "Roupas infantis praticas e encantadoras.",
    icon: "INF",
    group: "Moda íntima e roupas",
    order: 14,
  },
  {
    name: "Acessórios de inverno",
    slug: "acessorios-inverno",
    description: "Itens para dias frios com conforto e charme.",
    icon: "INV",
    group: "Moda íntima e roupas",
    order: 15,
  },
  {
    name: "Pet",
    slug: "pet",
    description: "Mimos e utilidades para pets.",
    icon: "PET",
    group: "Casa e variedades",
    order: 16,
  },
  {
    name: "Papelaria",
    slug: "papelaria",
    description: "Itens fofos e uteis para estudo, trabalho e organizacao.",
    icon: "PAP",
    group: "Casa e variedades",
    order: 17,
  },
  {
    name: "Brinquedos",
    slug: "brinquedos",
    description: "Brinquedos e lembrancinhas para crianças.",
    icon: "BRQ",
    group: "Casa e variedades",
    order: 18,
  },
  {
    name: "Cintos",
    slug: "cintos",
    description: "Cintos e detalhes para finalizar o look.",
    icon: "CIN",
    group: "Moda e beleza",
    order: 19,
  },
];

export const MOCK_PRODUCTS = [
  {
    id: "mock-brinco-delicado",
    name: "Brinco delicado",
    description: "Brinco feminino leve, delicado e perfeito para o dia a dia.",
    price: 12,
    promo: null,
    badge: "Novo",
    image: "/imagens/foto-03.jpeg",
    slug: "brinco-delicado",
    category: { name: "Bijuterias", slug: "bijuterias" },
  },
  {
    id: "mock-colar-feminino",
    name: "Colar feminino",
    description: "Colar feminino com acabamento bonito para compor producoes delicadas.",
    price: 24,
    promo: null,
    badge: "Destaque",
    image: "/imagens/foto-06.jpeg",
    slug: "colar-feminino",
    category: { name: "Bijuterias", slug: "bijuterias" },
  },
  {
    id: "mock-capinha-feminina",
    name: "Capinha feminina",
    description: "Capinha charmosa para proteger o celular com personalidade.",
    price: 27,
    promo: null,
    badge: "Novo",
    image: "/imagens/produto-01.jpg",
    slug: "capinha-feminina",
    category: { name: "Capinhas e acessórios de celular", slug: "capinhas-acessorios-celular" },
  },
  {
    id: "mock-camisola-lingerie",
    name: "Camisola/lingerie",
    description: "Peca delicada para uma linha intima feminina, discreta e elegante.",
    price: 36,
    promo: null,
    badge: "Selecionado",
    image: "/imagens/foto-12.jpeg",
    slug: "camisola-lingerie",
    category: { name: "Lingerie", slug: "lingerie" },
  },
  {
    id: "mock-oculos-sol",
    name: "Óculos de sol",
    description: "Óculos de sol moderno para completar o look com estilo.",
    price: 47,
    promo: null,
    badge: "Mais vendido",
    image: "/imagens/foto-08.jpeg",
    slug: "oculos-de-sol",
    category: { name: "Óculos", slug: "oculos" },
    subcategory: { name: "Adulto", slug: "oculos-adulto" },
  },
  {
    id: "mock-necessaire-rosa",
    name: "Necessaire rosa",
    description: "Necessaire rosa pratica, bonita e perfeita para organizar acessorios.",
    price: 48,
    promo: null,
    badge: "Presente",
    image: "/imagens/foto-05.jpeg",
    slug: "necessaire-rosa",
    category: { name: "Bolsas e Necessaires", slug: "bolsas-necessaires" },
  },
];

export function getPublicCategoryName(category: Pick<CatalogCategory, "name" | "publicName">) {
  return category.publicName ?? category.name;
}

export function getCategoryBySlug(slug: string) {
  return CATALOG_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function getSubcategoryByPath(categorySlug: string, pathSlug: string) {
  return getCategoryBySlug(categorySlug)?.subcategories?.find((item) => item.pathSlug === pathSlug) ?? null;
}

export function getCategoryGroups() {
  return CATALOG_GROUPS.map((group) => ({
    title: group.title,
    categories: group.categories
      .map((slug) => getCategoryBySlug(slug))
      .filter((category): category is CatalogCategory => Boolean(category)),
  }));
}

export function getHomeCategories() {
  return CATALOG_CATEGORIES.filter((category) => category.homeFeatured);
}
