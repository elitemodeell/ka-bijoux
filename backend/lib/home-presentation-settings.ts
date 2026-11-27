import { z } from "zod";
import type { HomePresentationSettings } from "@/lib/home-content";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor hexadecimal no formato #RRGGBB.");

const publicAssetUrl = z.string().trim().refine((value) => {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return !value.split("/").includes("..");
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}, "Use um caminho local ou uma URL HTTPS pública.");

export const homePresentationSettingsSchema = z.object({
  themeMode: z.enum(["AUTO", "CHRISTMAS", "DEFAULT"]).default("AUTO"),
  logoUrl: publicAssetUrl.nullable().default(null),
  storyLogoUrl: publicAssetUrl.nullable().default(null),
  headerColors: z.tuple([hexColor, hexColor]).default(["#7a002e", "#51001f"]),
  bannerUrls: z.array(publicAssetUrl).max(3).default([]),
  ambientMusicEnabled: z.boolean().default(true),
  ambientMusicUrl: publicAssetUrl.nullable().default(null),
});

export type HomePresentationSettingsInput = z.infer<typeof homePresentationSettingsSchema>;

export function parseHomePresentationSettings(value: unknown): HomePresentationSettings {
  const parsed = homePresentationSettingsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : {};
}
