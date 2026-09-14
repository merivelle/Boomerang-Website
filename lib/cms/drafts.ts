import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Staged edits.
 *
 * Everything an editor changes lands here first and the public site keeps
 * serving what it served before. Publishing walks these rows, merges each patch
 * onto the live row, and busts the cache once.
 *
 * A patch is always PARTIAL and always in database column names, because that
 * is the shape both ends of the pipe already speak: the admin form writes column
 * names, and lib/cms/preview.ts overlays them onto raw PostgREST rows without
 * translating anything.
 */

export type DraftTable =
  | "projects"
  | "clients"
  | "site_settings"
  | "seo_pages"
  | "site_credits"
  | "homepage"
  | "categories"
  | "tags";

export type DraftOp = "insert" | "update" | "delete";

export type Draft = {
  id: string;
  table_name: DraftTable;
  row_id: string | null;
  /** Slug, path, or a singleton name. How a pending insert is addressed. */
  row_key: string | null;
  op: DraftOp;
  patch: Record<string, unknown>;
  label: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT = "id,table_name,row_id,row_key,op,patch,label,summary,created_at,updated_at";

type DB = Awaited<ReturnType<typeof supabaseServer>>;

/** Every open draft, most recently touched first. */
export async function listDrafts(db?: DB): Promise<Draft[]> {
  const c = db ?? (await supabaseServer());
  const { data, error } = await c
    .from("drafts")
    .select(SELECT)
    .order("updated_at", { ascending: false });
  // Before 0006_cms.sql has been run the table does not exist. An admin that
  // will not load is worse than a Review screen that says "nothing staged".
  if (error) return [];
  return (data ?? []) as unknown as Draft[];
}

export async function countDrafts(): Promise<number> {
  const db = await supabaseServer();
  const { count, error } = await db.from("drafts").select("id", { count: "exact", head: true });
  return error ? 0 : (count ?? 0);
}

export async function getDraft(
  table: DraftTable,
  key: { rowId?: string | null; rowKey?: string | null },
): Promise<Draft | null> {
  const db = await supabaseServer();
  let q = db.from("drafts").select(SELECT).eq("table_name", table);
  q = key.rowId ? q.eq("row_id", key.rowId) : q.eq("row_key", key.rowKey ?? "");
  const { data, error } = await q.maybeSingle();
  if (error) return null;
  return (data as unknown as Draft) ?? null;
}

/**
 * Create or extend the open draft for a record.
 *
 * Patches MERGE rather than replace, so editing the year today and the poster
 * tomorrow produces one draft holding both, and two people touching different
 * fields of the same credit do not silently overwrite each other.
 */
export async function stageDraft(input: {
  table: DraftTable;
  rowId?: string | null;
  rowKey?: string | null;
  op?: DraftOp;
  patch: Record<string, unknown>;
  label: string;
  summary?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const db = await supabaseServer();
  const { data: auth } = await db.auth.getUser();

  const existing = await getDraft(input.table, { rowId: input.rowId, rowKey: input.rowKey });

  // A record queued for deletion that is then edited is no longer a deletion.
  const op = input.op ?? existing?.op ?? "update";

  const patch = { ...(existing?.patch ?? {}), ...input.patch };

  if (existing) {
    const { error } = await db
      .from("drafts")
      .update({
        patch,
        op,
        label: input.label,
        summary: input.summary ?? summarise(input.table, patch),
        actor: auth.user?.id ?? null,
      } as never)
      .eq("id", existing.id);
    if (error) return { ok: false, error: draftError(error.message) };
    return { ok: true, id: existing.id };
  }

  const { data, error } = await db
    .from("drafts")
    .insert({
      table_name: input.table,
      row_id: input.rowId ?? null,
      row_key: input.rowKey ?? null,
      op,
      patch,
      label: input.label,
      summary: input.summary ?? summarise(input.table, patch),
      actor: auth.user?.id ?? null,
    } as never)
    .select("id")
    .single();

  if (error) return { ok: false, error: draftError(error.message) };
  return { ok: true, id: (data as { id: string }).id };
}

export async function discardDraft(id: string) {
  const db = await supabaseServer();
  await db.from("drafts").delete().eq("id", id);
}

export async function discardAllDrafts() {
  const db = await supabaseServer();
  // A filter is required; every row has a non-empty table_name.
  await db.from("drafts").delete().neq("table_name", "");
}

/** Drop the open draft for one record, addressed the way the editor addresses it. */
export async function discardFor(
  table: DraftTable,
  key: { rowId?: string | null; rowKey?: string | null },
) {
  const d = await getDraft(table, key);
  if (d) await discardDraft(d.id);
}

// ------------------------------------------------------------------ wording --

/**
 * "Changed the poster and the year" — what the Review screen reads out.
 *
 * Column names never reach an editor. A field with no entry here is deliberately
 * left out of the sentence rather than shown raw.
 */
const FIELD_WORDS: Record<string, string> = {
  title: "the title",
  studio: "the client",
  year: "the year",
  role: "the type of work",
  category_id: "the category",
  trailer_url: "the trailer link",
  still_media_id: "the poster",
  published: "whether it's on the website",
  featured_rank: "its place in Selected Work",
  hero_rank: "its place in the homepage hero",
  seo_title: "the search title",
  seo_description: "the search description",
  tags: "the tags",
  name: "the name",
  website_url: "the website link",
  logo_media_id: "the logo",
  group_id: "the group",
  bio: "the biography",
  founder: "the founder's name",
  location: "the location",
  credits_lead: "the credits sentence",
  intro: "the site description",
  phone: "the phone number",
  instagram_handle: "the Instagram handle",
  contact_email: "the contact address",
  copyright_year: "the copyright year",
  og_media_id: "the sharing image",
  description: "the description",
  titles: "the list of films",
  hero: "the homepage hero",
  featured: "the Selected Work list",
  label: "the name",
  show_in_filters: "whether it has a filter button",
  order: "the order",
};

function summarise(table: DraftTable, patch: Record<string, unknown>): string {
  if (table === "homepage") {
    const parts = Object.keys(patch)
      .map((k) => FIELD_WORDS[k])
      .filter(Boolean);
    return parts.length ? `Reordered ${list(parts)}` : "Changed the homepage";
  }

  const words = Object.keys(patch)
    .map((k) => FIELD_WORDS[k])
    .filter(Boolean);

  if (!words.length) return "Edited";
  return `Changed ${list(words.slice(0, 4))}${words.length > 4 ? ", and more" : ""}`;
}

/** "a, b and c" — the same joining the About page uses, so the tone matches. */
function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function draftError(message: string): string {
  if (/relation .*drafts.* does not exist|schema cache|drafts_table_name_check/.test(message))
    return "The site database hasn't been updated yet. Ask your developer to run the latest migration.";
  if (/row-level security|permission denied/.test(message))
    return "You don't have permission to change that. Ask your developer.";
  return "That didn't save. Please try again, and tell your developer if it keeps happening.";
}

export { summarise as draftSummary };
