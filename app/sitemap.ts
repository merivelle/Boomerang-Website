import type { MetadataRoute } from "next";
import { getSite } from "@/lib/cms/queries";

// Only the five real public pages. There is no /work/[slug] route yet, so
// listing credits would advertise URLs that do not exist.
const PAGES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "/", priority: 1, changeFrequency: "monthly" },
  { path: "/work", priority: 0.9, changeFrequency: "monthly" },
  { path: "/clients", priority: 0.6, changeFrequency: "yearly" },
  { path: "/about", priority: 0.6, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await getSite().catch(() => null);
  const base = (site?.canonicalUrl ?? "https://www.boomerang-music.com").replace(/\/$/, "");
  const lastModified = new Date();

  return PAGES.map((p) => ({
    url: `${base}${p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
