// The read queries, as pure functions over a fetch implementation.
//
// Deliberately NOT wrapped in `server-only` and deliberately free of Next
// imports: scripts/verify-migration.ts imports this exact module so the
// migration is checked with the same SQL the site runs. Writing separate
// verification queries would verify nothing.
//
// lib/cms/queries.ts is the Next-facing wrapper that adds cache tags.
//
// PostgREST over plain fetch rather than supabase-js, so Next's native
// `next: { tags }` caching applies without wrapping everything in
// unstable_cache.

import type {
  Category,
  Client,
  ClientGroup,
  Media,
  NavItem,
  Project,
  SeoPage,
  SiteSettings,
  Tag,
} from "./types.ts";

export type FetchOpts = { tags?: string[]; revalidate?: number; count?: boolean };
export type Fetcher = (path: string, opts: FetchOpts) => Promise<Response>;

// Every ordered query carries an explicit sort_index tiebreak. JS Array.sort is
// stable and Postgres is not: `order=year.desc` alone silently reshuffles
// same-year films, which changes which 24 credits the homepage shows.
const ORDER = "year.desc,sort_index.asc";

const MEDIA_COLS = "id,kind,bucket,object_path,legacy_public_path,width,height,lqip,focal_x,focal_y,alt";

const PROJECT_COLS = [
  "id,slug,title,studio,year,role,mood,tone,trailer_url",
  "sort_index,featured_rank,hero_rank,published",
  "category:categories(slug,label)",
  `still:media!projects_still_media_id_fkey(${MEDIA_COLS})`,
  `placeholder:media!projects_placeholder_media_id_fkey(${MEDIA_COLS})`,
  `clip:media!projects_clip_media_id_fkey(${MEDIA_COLS})`,
  "project_tags(tags(slug))",
].join(",");

// ------------------------------------------------------------------ shapes --

const supabaseUrl = () =>
  (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");

export function mediaUrl(row: {
  bucket: string | null;
  object_path: string | null;
  legacy_public_path: string | null;
}): string {
  // Hybrid by design: the 110 committed assets keep serving from Vercel's edge
  // for free, and only new uploads live in Storage. The split is data, not a
  // convention, so any asset can be promoted later with no code change.
  if (row.legacy_public_path) return row.legacy_public_path;
  return `${supabaseUrl()}/storage/v1/object/public/${row.bucket}/${row.object_path}`;
}

function toMedia(row: Record<string, unknown> | null): Media | null {
  if (!row) return null;
  const r = row as never as {
    id: string; kind: Media["kind"]; bucket: string | null; object_path: string | null;
    legacy_public_path: string | null; width: number; height: number;
    lqip: string | null; focal_x: string | number; focal_y: string | number; alt: string | null;
  };
  return {
    id: r.id,
    kind: r.kind,
    url: mediaUrl(r),
    width: r.width,
    height: r.height,
    lqip: r.lqip,
    focalX: Number(r.focal_x),
    focalY: Number(r.focal_y),
    alt: r.alt,
  };
}

/** Drop undefined keys so the shape matches the old optional-field type exactly. */
function compact<T extends Record<string, unknown>>(o: T): T {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  return o;
}

function toProject(row: Record<string, unknown>): Project {
  const r = row as never as {
    id: string; slug: string; title: string; studio: string; year: number;
    role: string; mood: string | null; tone: string | null; trailer_url: string | null;
    featured_rank: number | null; hero_rank: number | null; published: boolean;
    category: { slug: string; label: string };
    still: Record<string, unknown> | null;
    placeholder: Record<string, unknown> | null;
    clip: Record<string, unknown> | null;
    project_tags: Array<{ tags: { slug: string } }>;
  };
  return compact({
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: r.category.label,
    studio: r.studio,
    year: r.year,
    role: r.role,
    mood: r.mood ?? undefined,
    // numeric arrives as a string; Number() is exact here because the column is
    // numeric(3,2), not a float.
    tone: r.tone === null ? undefined : Number(r.tone),
    trailerUrl: r.trailer_url ?? undefined,
    still: toMedia(r.still)?.url,
    clip: toMedia(r.clip)?.url,
    tags: (r.project_tags ?? []).map((t) => t.tags.slug).sort(),
    featuredRank: r.featured_rank ?? undefined,
    heroRank: r.hero_rank ?? undefined,
    published: r.published,
  }) as Project;
}

// ----------------------------------------------------------------- queries --

async function rows(f: Fetcher, path: string, opts: FetchOpts): Promise<Record<string, unknown>[]> {
  const res = await f(path, opts);
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

/** Everything on /work: published credits that have a real film frame. */
export async function getWorkProjects(f: Fetcher): Promise<Project[]> {
  const data = await rows(
    f,
    `/projects?select=${PROJECT_COLS}&published=is.true&still_media_id=not.is.null&order=${ORDER}`,
    { tags: ["projects", "media"] },
  );
  return data.map(toProject);
}

/**
 * The homepage contact sheet. `total` is NOT rows.length: WorkGallery renders
 * the count of every non-hero credit (55 today) above a grid that shows 24.
 * Returning only the rendered rows and using .length produces a plausible
 * wrong number.
 */
export async function getHomeGrid(
  f: Fetcher,
  limit = 24,
): Promise<{ rows: Project[]; total: number }> {
  // The hero exclusion is `hero_rank is null` in SQL. That is how the second
  // copy of HERO_SLUGS disappears by construction rather than by discipline.
  const base = `/projects?select=${PROJECT_COLS}&published=is.true&still_media_id=not.is.null&hero_rank=is.null&order=${ORDER}`;
  const res = await f(`${base}&limit=${limit}`, { tags: ["projects", "media"], count: true });
  if (!res.ok) throw new Error(`getHomeGrid -> ${res.status} ${await res.text()}`);
  const range = res.headers.get("content-range") ?? "";
  const total = Number(range.split("/")[1]);
  return {
    rows: ((await res.json()) as Record<string, unknown>[]).map(toProject),
    total: Number.isFinite(total) ? total : 0,
  };
}

/** The six desktop hero columns, in slot order. */
export async function getHeroColumns(f: Fetcher): Promise<Project[]> {
  const data = await rows(
    f,
    `/projects?select=${PROJECT_COLS}&hero_rank=not.is.null&order=hero_rank.asc`,
    { tags: ["projects", "media"] },
  );
  return data.map(toProject);
}

/** Selected Work, in curated order — not year order. */
export async function getFeatured(f: Fetcher): Promise<Project[]> {
  const data = await rows(
    f,
    `/projects?select=${PROJECT_COLS}&featured_rank=not.is.null&order=featured_rank.asc`,
    { tags: ["projects", "media"] },
  );
  return data.map(toProject);
}

export async function getCategories(f: Fetcher): Promise<Category[]> {
  const data = await rows(f, "/categories?select=slug,label&order=sort_index.asc", { tags: ["projects"] });
  return data as never as Category[];
}

export async function getFilterTags(f: Fetcher): Promise<Tag[]> {
  const data = await rows(
    f,
    "/tags?select=slug,label,show_in_filters&show_in_filters=is.true&order=sort_index.asc",
    { tags: ["projects"] },
  );
  return (data as never as Array<{ slug: string; label: string; show_in_filters: boolean }>).map(
    (t) => ({ slug: t.slug, label: t.label, showInFilters: t.show_in_filters }),
  );
}

export async function getClientGroups(f: Fetcher): Promise<ClientGroup[]> {
  const data = await rows(
    f,
    `/client_groups?select=slug,label,sort_index,clients(id,slug,name,website_url,sort_index,published,logo:media!clients_logo_media_id_fkey(${MEDIA_COLS}))&order=sort_index.asc`,
    { tags: ["clients", "media"] },
  );
  return (data as never as Array<{
    slug: string; label: string;
    clients: Array<{
      id: string; slug: string; name: string; website_url: string | null;
      sort_index: number; published: boolean; logo: Record<string, unknown> | null;
    }>;
  }>).map((g) => ({
    slug: g.slug,
    label: g.label,
    // PostgREST does not order embedded rows; sort here or the client wall shuffles.
    clients: g.clients
      .filter((c) => c.published)
      .sort((a, b) => a.sort_index - b.sort_index)
      .map((c): Client => compact({
        id: c.id,
        slug: c.slug,
        name: c.name,
        websiteUrl: c.website_url ?? undefined,
        logo: toMedia(c.logo)?.url,
      }) as Client),
  }));
}

/**
 * The homepage marquee. ClientsMarquee doubles this array and translates -50%,
 * so the count must stay stable or the loop visibly jumps.
 */
export async function getLogoClients(f: Fetcher): Promise<Client[]> {
  const groups = await getClientGroups(f);
  return groups.flatMap((g) => g.clients).filter((c) => c.logo);
}

/**
 * Reads the site_public VIEW, not site_settings. The view has no email column,
 * which is the guarantee that the contact address cannot be serialized into the
 * page when `site` is passed as a prop into Nav (a client component).
 */
export async function getSite(f: Fetcher): Promise<SiteSettings> {
  const data = await rows(f, "/site_public?select=*&limit=1", { tags: ["site"] });
  const r = data[0] as never as Record<string, never>;
  if (!r) throw new Error("site_public is empty - run the migration first");
  return {
    name: r.name, wordmark: r.wordmark, founder: r.founder, role: r.role,
    location: r.location, intro: r.intro, bio: r.bio, positioning: r.positioning,
    canonicalUrl: r.canonical_url, creditsLead: r.credits_lead,
    phone: r.phone, phoneHref: r.phone_href,
    instagramHandle: r.instagram_handle, instagramUrl: r.instagram_url,
    copyrightYear: r.copyright_year,
  };
}

export async function getSiteCredits(f: Fetcher): Promise<string[]> {
  const data = await rows(f, "/site_credits?select=title&order=sort_index.asc", { tags: ["site"] });
  return (data as never as Array<{ title: string }>).map((r) => r.title);
}

export async function getNav(f: Fetcher): Promise<NavItem[]> {
  const data = await rows(
    f,
    "/nav_items?select=label,href&enabled=is.true&order=sort_index.asc",
    { tags: ["site"] },
  );
  return data as never as NavItem[];
}

export async function getSeo(f: Fetcher, path: string): Promise<SeoPage | null> {
  const data = await rows(
    f,
    `/seo_pages?select=path,title,description,noindex,og:media!seo_pages_og_media_id_fkey(${MEDIA_COLS})&path=eq.${encodeURIComponent(path)}&limit=1`,
    { tags: ["seo", "media"] },
  );
  const r = data[0] as never as {
    path: string; title: string | null; description: string | null;
    noindex: boolean; og: Record<string, unknown> | null;
  };
  if (!r) return null;
  return {
    path: r.path,
    title: r.title,
    description: r.description,
    ogImage: toMedia(r.og)?.url ?? null,
    noindex: r.noindex,
  };
}
