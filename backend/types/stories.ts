export type StoryItem = {
  id: string;
  type: "image" | "video";
  src: string;
  mediaUrl: string;
  duration?: number;
  text?: string | null;
  buttonText?: string | null;
  link?: string | null;
  linkUrl?: string | null;
  poster?: string | null;
  posterUrl?: string | null;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type StoryGroup = {
  id: string;
  title: string;
  category: "OFFICIAL" | "CUSTOMER" | "REVIEW" | "HIGHLIGHT";
  reviewId?: string | null;
  review?: { rating: number; comment: string | null; customerName: string; productName: string } | null;
  cover: string;
  coverImageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  expiresAt?: string | null;
  customerConsentConfirmedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  items: StoryItem[];
};

export type StoryCategory = "OFFICIAL" | "CUSTOMER" | "REVIEW" | "HIGHLIGHT";

export const STORY_CATEGORY_LABELS: Record<StoryCategory, string> = {
  OFFICIAL: "KA Stories",
  CUSTOMER: "Clientes",
  REVIEW: "Avaliações",
  HIGHLIGHT: "Destaques",
};

export const DEFAULT_STORY_COVER = "/images/brand/ka-bijoux-logo-story-icon.png";
