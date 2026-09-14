import "server-only";
import type { Draft } from "./drafts";
import { slugify, type DB } from "./admin-helpers";

/**
 * The Work filters — `categories` and `tags` — as the editor sees them: the live
 * rows with every open draft laid on top.
 *
 * One definition, shared by the Work filters screen, the project form's
 * dropdown, the Work list, and the publish engine, so "what categories exist
 * right now" has exactly one answer across the admin.
 *
 * A filter that is staged but not yet published has no uuid, so it is
 * addressed everywhere by the pseudo-id "new:<slug>" — in the editor's rows,
 * in the reorder array, and as a project draft's category_id. The publish
 * step turns it back into a real id by slug, after the insert has landed.
 */

export type TaxTable = "categories" | "tags";

export const NEW = "new:";
export const isNewKey = (id: unknown): id is string =>
  typeof id === "string" && id.startsWith(NEW);
export const newKey = (slug: string) => `${NEW}${slug}`;
const slugOfKey = (key: string) => key.slice(NEW.length);

export type TaxRow = {
  /** A uuid, or "new:<slug>" for one that is only staged so far. */
  id: string;
  slug: string;
  label: string;
  /** Always true for a category; a tag can exist without a button. */
  showInFilters: boolean;
  draft: "new" | "edited" | "removing" | null;
};

type LiveRow = { id: string; slug: string; label: string; sort_index: number; show_in_filters?: boolean };

async function liveRows(db: DB, table: TaxTable): Promise<LiveRow[]> {
  const cols = table === "tags" ? "id,slug,label,sort_index,show_in_filters" : "id,slug,label,sort_index";
  const { data } = await db.from(table).select(cols).order("sort_index");
  return (data ?? []) as unknown as LiveRow[];
}

function merge(table: TaxTable, live: LiveRow[], drafts: Draft[]): TaxRow[] {
  const mine = drafts.filter((d) => d.table_name === table);
  const byId = new Map(mine.filter((d) => d.row_id).map((d) => [d.row_id!, d]));

  const rows: TaxRow[] = live.map((r) => {
    const d = byId.get(r.id);
    const patch = (d?.patch ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      slug: r.slug,
      // Shown as it WILL read once published.
      label: typeof patch.label === "string" ? patch.label : r.label,
      showInFilters:
        table === "categories"
          ? true
          : typeof patch.show_in_filters === "boolean"
            ? patch.show_in_filters
            : (r.show_in_filters ?? true),
      draft: d ? (d.op === "delete" ? "removing" : "edited") : null,
    };
  });

  const inserts = mine
    .filter((d) => d.op === "insert" && d.row_key && isNewKey(d.row_key))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const d of inserts) {
    const patch = d.patch as Record<string, unknown>;
    const slug = String(patch.slug ?? slugOfKey(d.row_key!));
    rows.push({
      id: newKey(slug),
      slug,
      label: String(patch.label ?? d.label),
      showInFilters: table === "categories" ? true : patch.show_in_filters !== false,
      draft: "new",
    });
  }

  // A staged running order wins over the stored one. Anything the order does
  // not mention (added after it was staged) keeps its place after the rest.
  const order = mine.find((d) => d.row_key === `order:${table}`);
  const ranks = new Map<string, number>();
  if (order && Array.isArray(order.patch.order)) {
    (order.patch.order as string[]).forEach((id, i) => ranks.set(id, i));
  }
  if (!ranks.size) return rows;
  const stored = new Map(rows.map((r, i) => [r.id, i]));
  return rows.sort((a, b) => {
    const ra = ranks.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const rb = ranks.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return stored.get(a.id)! - stored.get(b.id)!;
  });
}

/** Live rows with drafts applied, in the order the site WILL show them. */
export async function loadTaxonomy(
  db: DB,
  drafts: Draft[],
): Promise<{ categories: TaxRow[]; tags: TaxRow[] }> {
  const [cats, tags] = await Promise.all([liveRows(db, "categories"), liveRows(db, "tags")]);
  return { categories: merge("categories", cats, drafts), tags: merge("tags", tags, drafts) };
}

// -------------------------------------------------------------------- usage --

/**
 * How many films sit in each category, counting what is staged: a film moved
 * in a draft counts where it is going, a film staged for removal not at all.
 * Keyed by category id (uuid or "new:<slug>").
 */
export async function categoryUsage(db: DB, drafts: Draft[]): Promise<Map<string, number>> {
  const { data } = await db.from("projects").select("slug,category_id");
  const bySlug = new Map<string, string>();
  for (const r of (data ?? []) as Array<{ slug: string; category_id: string }>) {
    bySlug.set(r.slug, r.category_id);
  }

  for (const d of drafts) {
    if (d.table_name !== "projects" || !d.row_key) continue;
    if (d.op === "delete") {
      bySlug.delete(d.row_key);
      continue;
    }
    if (typeof d.patch.category_id === "string") bySlug.set(d.row_key, d.patch.category_id);
  }

  const counts = new Map<string, number>();
  for (const id of bySlug.values()) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

/** Same as categoryUsage, for tags — a film's staged tag list replaces its live one. */
export async function tagUsage(db: DB, drafts: Draft[]): Promise<Map<string, number>> {
  const [{ data: links }, { data: projects }] = await Promise.all([
    db.from("project_tags").select("project_id,tag_id"),
    db.from("projects").select("id,slug"),
  ]);
  const slugOf = new Map(
    ((projects ?? []) as Array<{ id: string; slug: string }>).map((p) => [p.id, p.slug]),
  );

  const bySlug = new Map<string, Set<string>>();
  for (const l of (links ?? []) as Array<{ project_id: string; tag_id: string }>) {
    const slug = slugOf.get(l.project_id);
    if (!slug) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, new Set());
    bySlug.get(slug)!.add(l.tag_id);
  }

  for (const d of drafts) {
    if (d.table_name !== "projects" || !d.row_key) continue;
    if (d.op === "delete") {
      bySlug.delete(d.row_key);
      continue;
    }
    if (Array.isArray(d.patch.tags)) bySlug.set(d.row_key, new Set(d.patch.tags as string[]));
  }

  const counts = new Map<string, number>();
  for (const set of bySlug.values())
    for (const id of set) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

// ------------------------------------------------------------------ resolve --

/** A uuid or "new:<slug>" → the live uuid, or null if no such row exists. */
export async function resolveCategoryId(db: DB, id: unknown): Promise<string | null> {
  if (typeof id !== "string" || !id) return null;
  const q = db.from("categories").select("id");
  const { data } = await (isNewKey(id) ? q.eq("slug", slugOfKey(id)) : q.eq("id", id)).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Tag ids from a project draft → live uuids. A uuid that no longer exists is
 * dropped silently (the tag was removed, so the film simply loses it); a
 * "new:" key that cannot be found is reported, because that means the tag
 * the editor chose was discarded before it was published.
 */
export async function resolveTagIds(
  db: DB,
  ids: string[],
): Promise<{ ids: string[]; missing: string[] }> {
  if (!ids.length) return { ids: [], missing: [] };
  const { data } = await db.from("tags").select("id,slug");
  const rows = (data ?? []) as Array<{ id: string; slug: string }>;
  const byId = new Set(rows.map((r) => r.id));
  const bySlug = new Map(rows.map((r) => [r.slug, r.id]));

  const out: string[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    if (isNewKey(id)) {
      const real = bySlug.get(slugOfKey(id));
      if (real) out.push(real);
      else missing.push(id);
    } else if (byId.has(id)) {
      out.push(id);
    }
  }
  return { ids: [...new Set(out)], missing };
}

/** A slug from a label, unique against the live rows AND anything staged. */
export async function taxonomySlug(db: DB, table: TaxTable, label: string, drafts: Draft[]) {
  const base = slugify(label);
  if (!base) return "";
  const { data } = await db.from(table).select("slug");
  const taken = new Set((data ?? []).map((r) => (r as { slug: string }).slug));
  for (const d of drafts) {
    if (d.table_name === table && d.row_key && isNewKey(d.row_key)) taken.add(slugOfKey(d.row_key));
  }
  if (!taken.has(base)) return base;
  for (let i = 2; i < 500; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now()}`;
}

/** Every open project draft that points at `from` now points at `to`. */
export async function rewriteProjectDraftCategory(db: DB, from: string, to: string) {
  const { data } = await db
    .from("drafts")
    .select("id,patch")
    .eq("table_name", "projects")
    .eq("patch->>category_id", from);
  for (const d of (data ?? []) as Array<{ id: string; patch: Record<string, unknown> }>) {
    await db
      .from("drafts")
      .update({ patch: { ...d.patch, category_id: to } } as never)
      .eq("id", d.id);
  }
}
