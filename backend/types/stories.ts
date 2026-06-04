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
  cover: string;
  coverImageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  items: StoryItem[];
};

export const DEFAULT_STORY_COVER = "/images/brand/ka-bijoux-logo-story-icon.png";
