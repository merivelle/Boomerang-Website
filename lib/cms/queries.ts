// The Next-facing read layer.
//
// `server-only` is load-bearing, not decoration. Eight "use client" components
// used to import from content/*; if one of them ends up importing this module
// instead — even by accident — the build fails here rather than shipping
// database credentials to the browser. Types live in ./types.ts, which has no
// runtime imports, so `import type { Project }` from a client component stays
// safe.

import "server-only";
import * as q from "./sql";
import type { FetchOpts } from "./sql";
import { overlay, previewing } from "./preview";

const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// The anon key, not the service role: these pages are public, so RLS is
// exercised on the same path the data is public on. A policy mistake then
// fails closed in development instead of quietly leaking in production.
const fetcher = async (path: string, opts: FetchOpts): Promise<Response> => {
  const preview = await previewing();

  const res = await fetch(`${URL}/rest/v1${path}`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      ...(opts.count ? { Prefer: "count=exact" } : {}),
    },
    // In preview nothing may be cached: the whole point is to see the staged
    // version, and a cached body would also risk that body being served back to
    // a normal visitor from the same cache entry.
    ...(preview
      ? { cache: "no-store" as const }
      : {
          next: {
            tags: opts.tags,
            // Admin saves call revalidateTag for a sub-second edit-to-live loop.
            // A day is the backstop for the deploy race that loses one of those,
            // not the mechanism.
            revalidate: opts.revalidate ?? 86400,
          },
        }),
  });

  if (!preview || !res.ok) return res;

  // Re-wrap rather than mutate: sql.ts reads .json() and, for the home grid,
  // the content-range header, so both have to survive the overlay.
  const patched = await overlay(path, await res.json());
  return new Response(JSON.stringify(patched), {
    status: res.status,
    headers: res.headers,
  });
};

export const getWorkProjects = () => q.getWorkProjects(fetcher);
export const getHomeGrid = (limit?: number) => q.getHomeGrid(fetcher, limit);
export const getHeroColumns = () => q.getHeroColumns(fetcher);
export const getFeatured = () => q.getFeatured(fetcher);
export const getHeroWordmarks = () => q.getHeroWordmarks(fetcher);
export const getProject = (slug: string) => q.getProject(fetcher, slug);
export const getPublishedSlugs = () => q.getPublishedSlugs(fetcher);
export const getProjectContext = (slug: string) => q.getProjectContext(fetcher, slug);
export const getCategories = () => q.getCategories(fetcher);
export const getFilterTags = () => q.getFilterTags(fetcher);
export const getClientGroups = () => q.getClientGroups(fetcher);
export const getLogoClients = () => q.getLogoClients(fetcher);
export const getSite = () => q.getSite(fetcher);
export const getSiteCredits = () => q.getSiteCredits(fetcher);
export const getNav = () => q.getNav(fetcher);
export const getSeo = (path: string) => q.getSeo(fetcher, path);

/**
 * Page metadata from seo_pages, falling back to the app's own defaults so a
 * blank row never produces an empty <title>.
 */
export async function seoMetadata(path: string, fallback: { title: string; description: string }) {
  const seo = await getSeo(path).catch(() => null);
  const title = seo?.title || fallback.title;
  const description = seo?.description || fallback.description;

  return {
    title,
    description,
    // The social image used to be fetched and then dropped on the floor, so
    // anything set in the admin silently did nothing. Absent here means "fall
    // through to the site-wide image in app/layout.tsx", which is why it is
    // spread conditionally rather than set to a default.
    ...(seo?.ogImage
      ? {
          openGraph: { title, description, images: [{ url: seo.ogImage }] },
          twitter: { title, description, images: [seo.ogImage] },
        }
      : {}),
    ...(seo?.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
