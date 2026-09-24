import type { MetadataRoute } from "next";
import { LEGAL_IDENTITY, LEGAL_ROUTES } from "@/lib/legal-identity";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/produtos", "/sobre", ...LEGAL_ROUTES];
  return Array.from(new Set(paths)).map((path) => ({
    url: `${LEGAL_IDENTITY.website}${path}`,
    lastModified: new Date("2026-08-03T00:00:00-03:00"),
    changeFrequency: path === "/" ? "daily" : "monthly",
    priority: path === "/" ? 1 : path === "/produtos" ? 0.9 : 0.6,
  }));
}
