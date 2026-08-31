import type { MetadataRoute } from "next";
import { getSite } from "@/lib/cms/queries";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSite().catch(() => null);
  const base = site?.canonicalUrl ?? "https://www.boomerang-music.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The admin is already behind auth; this keeps it out of the index too,
      // and stops crawlers burning requests on a login redirect.
      disallow: ["/admin", "/admin/", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
