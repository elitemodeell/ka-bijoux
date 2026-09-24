import type { ImageSource } from "expo-image";

export type HomeImageSource = string | number | ImageSource;

export type HomeProduct = {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  promotionalPrice?: number | null;
  stock: number;
  images: Array<{ url: string; alt?: string | null }>;
  isNew?: boolean;
  featured?: boolean;
  badge?: string | null;
  variations?: Array<{
    id: string;
    name: string;
    value: string;
    imageUrl?: string | null;
    stock: number;
    isDefault: boolean;
    order: number;
  }>;
};

export type HomeBanner = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: HomeImageSource;
  mobileImage: HomeImageSource;
};

export type HomeStoryItem = {
  id: string;
  type: "image" | "video";
  src: string;
  mediaUrl: string;
  duration: number;
  text?: string | null;
  buttonText?: string | null;
  link?: string | null;
  linkUrl?: string | null;
};

export type HomeStory = {
  id: string;
  title: string;
  cover: string;
  coverImageUrl?: string | null;
  sortOrder: number;
  items: HomeStoryItem[];
};

export type HomeCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  mobileProductCount: number;
};

export type HomeQuickCategory = {
  label: string;
  description: string;
  icon: "sparkles" | "tag" | "new" | "diamond" | "phone";
  href: string;
};

export type HomeProductSection = {
  id: string;
  label?: string;
  title: string;
  subtitle?: string;
  route: string;
  moreLabel: string;
  badgeSeal: boolean;
  background: "subtle" | "white";
  products: HomeProduct[];
};

export type MobileHomePayload = {
  schemaVersion: number;
  generatedAt: string;
  announcements: string[];
  banners: HomeBanner[];
  campaign: {
    title: string;
    subtitle: string;
    image: HomeImageSource;
    href: string;
    promoTitle: string;
    promoSubtitle: string;
    cta: string;
  };
  quickCategories: HomeQuickCategory[];
  categories: HomeCategory[];
  stories: HomeStory[];
  sections: HomeProductSection[];
  benefits: Array<{ icon: string; title: string; subtitle: string }>;
  finalCta: {
    label: string;
    titlePrefix: string;
    titleHighlight: string;
    description: string;
    button: string;
    href: string;
  };
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    customerName: string;
    city: string | null;
    state: string | null;
    createdAt: string;
  }>;
};
