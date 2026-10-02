import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://negocioflow.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/terminos", "/privacidad"], disallow: ["/api/"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
