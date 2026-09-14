import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import type { Draft } from "./drafts";
import { isNewKey, newKey } from "./taxonomy";

/**
 * Preview: the public site, rendered with staged edits applied.
 *
 * The overlay is installed at the FETCHER, not in each getter, for two reasons.
 * A draft patch is already in database column names, so it merges straight onto
 * a raw PostgREST row with no translation; and one interception point means a
 * getter added later is covered without anybody remembering to cover it.
 *
 * The gate is deliberately two locks, not one: draft mode must be on AND the
 * request must carry a valid editor session. A leaked or copied draft-mode
 * cookie on its own shows a signed-out visitor exactly what it shows today.
 */

const MEDIA_COLS =
  "id,kind,bucket,object_path,legacy_public_path,width,height,lqip,focal_x,focal_y,alt";

export async function previewing(): Promise<boolean> {
  try {
    const dm = await draftMode();
    if (!dm.isEnabled) return false;
    return (await currentUser()) !== null;
  } catch {
    // draftMode() throws outside a request scope (a build-time prerender, a
    // script). No request means no preview, which is the safe answer.
    return false;
  }
}

type Row = Record<string, unknown>;

/** Loaded once per request and reused across every query the page makes. */
type Staged = {
  projects: Map<string, Row>;
  clients: Map<string, Row>;
  /**
   * clientId -> staged sort_index. Stored as the COLUMN rather than as an
   * array order, because sql.ts re-sorts embedded clients by sort_index after
   * this overlay runs — reordering the array here would simply be undone.
   */
  clientOrder: Map<string, number>;
  site: Row | null;
  credits: string[] | null;
  seo: Map<string, Row>;
  hero: string[] | null;
  featured: string[] | null;
  /**
   * The Work filters as they WILL be: live rows with renames applied, removals
   * dropped, staged additions appended, in the staged order. Keyed by id, where
   * a staged addition's id is "new:<slug>" — the same handle a project draft
   * uses to file a film under it.
   */
  categories: Map<string, FilterRow>;
  tags: Map<string, FilterRow>;
};

type FilterRow = { id: string; slug: string; label: string; show_in_filters: boolean; sort_index: number };

async function loadStaged(): Promise<Staged | null> {
  const db = await supabaseServer();
  const { data, error } = await db.from("drafts").select("table_name,row_id,row_key,op,patch");
  if (error || !data?.length) return null;

  const out: Staged = {
    projects: new Map(),
    clients: new Map(),
    clientOrder: new Map(),
    site: null,
    credits: null,
    seo: new Map(),
    hero: null,
    featured: null,
    categories: new Map(),
    tags: new Map(),
  };

  const filterDrafts: Draft[] = [];

  for (const raw of data as unknown as Draft[]) {
    const patch = (raw.patch ?? {}) as Row;
    switch (raw.table_name) {
      case "projects":
        if (raw.row_key) out.projects.set(raw.row_key, { ...patch, __op: raw.op });
        break;
      case "clients":
        if (raw.row_key?.startsWith("order:") && Array.isArray(patch.order)) {
          (patch.order as string[]).forEach((id, i) => out.clientOrder.set(id, i));
        } else if (raw.row_id) {
          out.clients.set(raw.row_id, { ...patch, __op: raw.op });
        }
        break;
      case "site_settings":
        // contact_email lives in site_private and must never reach a public
        // view, in preview or anywhere else.
        out.site = Object.fromEntries(
          Object.entries(patch).filter(([k]) => k !== "contact_email"),
        );
        break;
      case "site_credits":
        if (Array.isArray(patch.titles)) out.credits = patch.titles as string[];
        break;
      case "seo_pages":
        if (raw.row_key) out.seo.set(raw.row_key, patch);
        break;
      case "homepage":
        if (Array.isArray(patch.hero)) out.hero = patch.hero as string[];
        if (Array.isArray(patch.featured)) out.featured = patch.featured as string[];
        break;
      case "categories":
      case "tags":
        filterDrafts.push(raw);
        break;
    }
  }

  // Always built, not only when a filter is staged: a film moved between two
  // existing categories carries only the id, and the embedded name has to be
  // looked up from somewhere.
  out.categories = await effectiveFilters(db, "categories", filterDrafts);
  out.tags = await effectiveFilters(db, "tags", filterDrafts);

  return out;
}

async function effectiveFilters(
  db: Awaited<ReturnType<typeof supabaseServer>>,
  table: "categories" | "tags",
  drafts: Draft[],
): Promise<Map<string, FilterRow>> {
  const cols = table === "tags" ? "id,slug,label,sort_index,show_in_filters" : "id,slug,label,sort_index";
  const { data } = await db.from(table).select(cols).order("sort_index");
  const live = (data ?? []) as unknown as Array<Partial<FilterRow> & { id: string; slug: string; label: string; sort_index: number }>;

  const mine = drafts.filter((d) => d.table_name === table);
  const byId = new Map(mine.filter((d) => d.row_id).map((d) => [d.row_id!, d]));

  const rows: FilterRow[] = [];
  for (const r of live) {
    const d = byId.get(r.id);
    if (d?.op === "delete") continue;
    const patch = (d?.patch ?? {}) as Row;
    rows.push({
      id: r.id,
      slug: r.slug,
      label: typeof patch.label === "string" ? patch.label : r.label,
      show_in_filters:
        typeof patch.show_in_filters === "boolean" ? patch.show_in_filters : (r.show_in_filters ?? true),
      sort_index: r.sort_index,
    });
  }

  let next = rows.length ? Math.max(...rows.map((r) => r.sort_index)) + 1 : 0;
  for (const d of mine) {
    if (d.op !== "insert" || !d.row_key || !isNewKey(d.row_key)) continue;
    const patch = d.patch as Row;
    const slug = String(patch.slug ?? d.row_key.slice(4));
    rows.push({
      id: newKey(slug),
      slug,
      label: String(patch.label ?? d.label),
      show_in_filters: patch.show_in_filters !== false,
      sort_index: next++,
    });
  }

  const order = mine.find((d) => d.row_key === `order:${table}`);
  if (order && Array.isArray(order.patch.order)) {
    const rank = new Map((order.patch.order as string[]).map((id, i) => [id, i]));
    const stored = new Map(rows.map((r, i) => [r.id, i]));
    rows.sort((a, b) => {
      const ra = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const rb = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return ra !== rb ? ra - rb : stored.get(a.id)! - stored.get(b.id)!;
    });
    rows.forEach((r, i) => (r.sort_index = i));
  }

  return new Map(rows.map((r) => [r.id, r]));
}

// React's cache() and not a module-level variable: the memo has to be scoped to
// ONE request. A module-level map on a warm serverless instance would serve one
// editor's staged edits into another's preview and never expire.
const staged = cache(loadStaged);

// --------------------------------------------------------------- the overlay --

const selectOf = (path: string) =>
  decodeURIComponent(new URLSearchParams(path.split("?")[1] ?? "").get("select") ?? "*");

/** Re-reads full rows for slugs the original query filtered out. */
async function projectsBySlug(select: string, slugs: string[]): Promise<Row[]> {
  if (!slugs.length) return [];
  const db = await supabaseServer();
  // The editor's own client, so RLS still applies: preview shows what this
  // person is allowed to see, including their own unpublished credits.
  const { data } = await db.from("projects").select(select).in("slug", slugs);
  const rows = (data ?? []) as unknown as Row[];
  const bySlug = new Map(rows.map((r) => [r.slug as string, r]));
  // Returned in the drafted order, not the database's.
  return slugs.map((s) => bySlug.get(s)).filter(Boolean) as Row[];
}

async function mediaById(id: unknown): Promise<Row | null> {
  if (typeof id !== "string" || !id) return null;
  const db = await supabaseServer();
  const { data } = await db.from("media").select(MEDIA_COLS).eq("id", id).maybeSingle();
  return (data as unknown as Row) ?? null;
}

/**
 * Merge a patch onto a row.
 *
 * Underscore-prefixed keys are pseudo-fields the publish step unpacks elsewhere,
 * so they are skipped here — except `_focal`, which is skipped as a key and then
 * applied to the embedded image, because a re-cropped poster is exactly the kind
 * of change someone opens a preview to check.
 */
async function mergeProject(row: Row, patch: Row, s: Staged): Promise<Row> {
  const next: Row = { ...row };
  for (const [k, v] of Object.entries(patch)) {
    if (k.startsWith("_") || k === "tags") continue;
    next[k] = v;
  }

  if ("still_media_id" in patch) next.still = await mediaById(patch.still_media_id);

  // sql.ts reads the embedded category and tag rows, not the ids, so a moved
  // or re-tagged film has to have those resolved or the Work page files it
  // where it used to be.
  if (typeof patch.category_id === "string") {
    const c = s.categories.get(patch.category_id);
    if (c) next.category = { slug: c.slug, label: c.label };
  }
  if (Array.isArray(patch.tags)) {
    next.project_tags = (patch.tags as string[])
      .map((id) => s.tags.get(id))
      .filter(Boolean)
      .map((t) => ({ tags: { slug: t!.slug } }));
  }

  const focal = patch._focal as { x: number; y: number } | undefined;
  if (focal && next.still) {
    next.still = { ...(next.still as Row), focal_x: focal.x, focal_y: focal.y };
  }

  return next;
}

/**
 * A renamed category has to rename on every film too: the Work page matches a
 * film to a button by label, and a film left with the old name would vanish
 * from under the new button.
 */
function renameCategory(row: Row, s: Staged): Row {
  const cat = row.category as { slug: string; label: string } | null | undefined;
  if (!cat) return row;
  for (const c of s.categories.values()) {
    if (c.slug === cat.slug && c.label !== cat.label) {
      return { ...row, category: { ...cat, label: c.label } };
    }
  }
  return row;
}

/**
 * The single entry point. Given the PostgREST path and the rows it returned,
 * hand back what the site would show if everything staged were published.
 */
export async function overlay(path: string, rows: unknown): Promise<unknown> {
  const s = await staged();
  if (!s || !Array.isArray(rows)) return rows;

  const table = path.split("?")[0].replace(/^\//, "");
  const query = path.split("?")[1] ?? "";
  const list = rows as Row[];

  if (table === "projects") {
    const select = selectOf(path);

    // The hero and Selected Work queries filter on a column the draft changes,
    // so their result SET is wrong, not just their field values. Rebuild them
    // from the drafted order instead of patching what came back.
    if (/hero_rank=not\.is\.null/.test(query) && s.hero) {
      const fresh = await projectsBySlug(select, s.hero);
      return Promise.all(
        fresh.map((r) => mergeProject(r, (s.projects.get(r.slug as string) ?? {}) as Row, s)),
      );
    }
    if (/featured_rank=not\.is\.null/.test(query) && s.featured) {
      const fresh = await projectsBySlug(select, s.featured);
      return Promise.all(
        fresh.map((r) => mergeProject(r, (s.projects.get(r.slug as string) ?? {}) as Row, s)),
      );
    }

    const kept: Row[] = [];
    for (const r of list) {
      const patch = s.projects.get(r.slug as string);
      if (patch?.__op === "delete") continue;
      // Staging "hide this" should make it disappear from the preview.
      if (patch && patch.published === false) continue;
      kept.push(renameCategory(patch ? await mergeProject(r, patch, s) : r, s));
    }
    return kept;
  }

  // The filter buttons themselves. The result SET changes (a removal, an
  // addition, a tag losing its button), so they are rebuilt from the effective
  // list rather than patched — narrowed and shaped to what the query asked for.
  if (table === "categories" || table === "tags") {
    const cols = selectOf(path).split(",").map((c) => c.trim());
    const onlyButtons = /show_in_filters=is\.true/.test(query);
    return [...s[table].values()]
      .filter((r) => !onlyButtons || r.show_in_filters)
      .sort((a, b) => a.sort_index - b.sort_index)
      .map((r) => Object.fromEntries(cols.map((c) => [c, (r as unknown as Row)[c]])));
  }

  if (table === "client_groups") {
    return Promise.all(
      list.map(async (g) => ({
        ...g,
        clients: await Promise.all(
          ((g.clients as Row[] | undefined) ?? [])
            .filter((c) => {
              const p = s.clients.get(c.id as string);
              return !(p?.__op === "delete" || p?.published === false);
            })
            .map(async (c) => {
              const id = c.id as string;
              const next = { ...c };
              const p = s.clients.get(id);

              if (p) {
                for (const [k, v] of Object.entries(p)) if (!k.startsWith("_")) next[k] = v;
                // sql.ts reads the embedded object, not the id, so a staged
                // logo has to be resolved or the wall shows the old mark.
                if ("logo_media_id" in p) next.logo = await mediaById(p.logo_media_id);
              }

              const rank = s.clientOrder.get(id);
              if (rank !== undefined) next.sort_index = rank;
              return next;
            }),
        ),
      })),
    );
  }

  if (table === "site_public" && s.site) {
    return list.map((r) => ({ ...r, ...s.site }));
  }

  if (table === "site_credits" && s.credits) {
    return s.credits.map((title) => ({ title }));
  }

  if (table === "seo_pages") {
    return list.map((r) => {
      const p = s.seo.get(r.path as string);
      return p ? { ...r, ...p } : r;
    });
  }

  return rows;
}
