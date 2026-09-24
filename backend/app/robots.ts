import type { MetadataRoute } from "next";
import { LEGAL_IDENTITY } from "@/lib/legal-identity";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] },
    ],
    sitemap: `${LEGAL_IDENTITY.website}/sitemap.xml`,
    host: LEGAL_IDENTITY.website,
  };
}
