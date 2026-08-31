"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer, currentUser } from "@/lib/supabase/server";

export type SaveResult = { ok: false; error: string } | { ok: true; slug: string };

/**
 * Busts every cached read the change could affect. This is what gives editors a
 * sub-second edit-to-live loop; the 24h revalidate in lib/cms/queries.ts is only
 * the backstop for a lost call.
 */
function publishChanges() {
  revalidateTag("projects");
  revalidateTag("media");
  revalidatePath("/", "layout");
}

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function readForm(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const studio = String(form.get("studio") ?? "").trim();
  const yearRaw = String(form.get("year") ?? "").trim();
  const trailer = String(form.get("trailer_url") ?? "").trim();

  return {
    title,
    studio,
    year: Number(yearRaw),
    yearRaw,
    role: String(form.get("role") ?? "").trim(),
    category_id: String(form.get("category_id") ?? ""),
    trailer_url: trailer === "" ? null : trailer,
    published: form.get("published") === "on",
    wantsFeatured: form.get("featured") === "on",
    tagIds: form.getAll("tags").map(String),
  };
}

/** Everything the form can get wrong, in the editor's own words. */
function validate(v: ReturnType<typeof readForm>): string | null {
  if (!v.title) return "Give the project a title.";
  if (!v.studio) return "Add the client or studio.";
  if (!v.yearRaw) return "Add a year.";
  if (!Number.isInteger(v.year) || v.year < 1900 || v.year > 2100)
    return "That year doesn't look right — use a four-digit year like 2026.";
  if (!v.role) return "Say what kind of work this was.";
  if (!v.category_id) return "Pick a category.";
  if (v.trailer_url && !/^https:\/\//.test(v.trailer_url))
    return "The trailer link needs to start with https:// — or leave it blank.";
  return null;
}

export async function saveWork(slug: string | null, form: FormData): Promise<SaveResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const v = readForm(form);
  const problem = validate(v);
  if (problem) return { ok: false, error: problem };

  const db = await supabaseServer();

  // Featured requires a real poster (the database enforces this too). Rather
  // than let the insert fail with a constraint name, say what is missing.
  const row = {
    title: v.title,
    studio: v.studio,
    year: v.year,
    role: v.role,
    category_id: v.category_id,
    trailer_url: v.trailer_url,
    published: v.published,
  };

  let id: string;
  let finalSlug: string;

  if (slug) {
    const { data: existing, error } = await db
      .from("projects")
      .select("id, slug, still_media_id, featured_rank")
      .eq("slug", slug)
      .single();
    if (error || !existing) return { ok: false, error: "That credit no longer exists." };

    if (v.wantsFeatured && !existing.still_media_id)
      return { ok: false, error: "Add a poster before putting this in Selected Work." };

    const featured_rank = v.wantsFeatured
      ? (existing.featured_rank ?? (await nextFeaturedRank(db)))
      : null;

    const { error: e } = await db
      .from("projects")
      .update({ ...row, featured_rank } as never)
      .eq("id", existing.id);
    if (e) return { ok: false, error: friendly(e.message) };

    id = existing.id;
    finalSlug = existing.slug;
  } else {
    const base = slugify(v.title);
    if (!base) return { ok: false, error: "That title can't be turned into a web address." };
    finalSlug = await uniqueSlug(db, base);

    if (v.wantsFeatured)
      return { ok: false, error: "Add a poster first, then you can put this in Selected Work." };

    const { data, error } = await db
      .from("projects")
      .insert({ ...row, slug: finalSlug, sort_index: await nextSortIndex(db) } as never)
      .select("id")
      .single();
    if (error) return { ok: false, error: friendly(error.message) };
    id = (data as { id: string }).id;
  }

  // Tags: replace the set rather than diffing it. At one tag per credit the
  // simplest correct thing is also the fastest.
  await db.from("project_tags").delete().eq("project_id", id);
  if (v.tagIds.length) {
    await db
      .from("project_tags")
      .insert(v.tagIds.map((tag_id) => ({ project_id: id, tag_id })) as never);
  }

  publishChanges();
  return { ok: true, slug: finalSlug };
}

/** The editor clicked the preview to say what must stay in frame. */
export async function setFocalPoint(slug: string, x: number, y: number) {
  const db = await supabaseServer();
  const { data } = await db.from("projects").select("still_media_id").eq("slug", slug).single();
  const id = (data as { still_media_id: string | null } | null)?.still_media_id;
  if (!id) return;

  await db
    .from("media")
    .update({
      focal_x: Math.min(1, Math.max(0, x)),
      focal_y: Math.min(1, Math.max(0, y)),
    } as never)
    .eq("id", id);

  publishChanges();
}

export async function setPublished(slug: string, published: boolean) {
  const db = await supabaseServer();
  // Unpublishing has to release the curated slots, or the database constraint
  // that keeps unpublished films out of the homepage rejects the update.
  const patch = published ? { published } : { published, featured_rank: null, hero_rank: null };
  await db.from("projects").update(patch as never).eq("slug", slug);
  publishChanges();
}

export async function deleteWork(slug: string) {
  const db = await supabaseServer();
  await db.from("projects").delete().eq("slug", slug);
  publishChanges();
  redirect("/admin/work");
}

export async function duplicateWork(slug: string) {
  const db = await supabaseServer();
  const { data } = await db.from("projects").select("*").eq("slug", slug).single();
  if (!data) return;
  const src = data as Record<string, unknown>;

  const copy = {
    ...src,
    id: undefined,
    slug: await uniqueSlug(db, `${src.slug}-copy`),
    title: `${src.title} (copy)`,
    // A duplicate never inherits a curated slot or a live state: those are
    // decisions about the real credit, not properties of it.
    featured_rank: null,
    hero_rank: null,
    published: false,
    sort_index: await nextSortIndex(db),
    created_at: undefined,
    updated_at: undefined,
  };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;

  await db.from("projects").insert(copy as never);
  publishChanges();
}

// ---------------------------------------------------------------- helpers --

type DB = Awaited<ReturnType<typeof supabaseServer>>;

async function nextSortIndex(db: DB) {
  const { data } = await db.from("projects").select("sort_index")
    .order("sort_index", { ascending: false }).limit(1).single();
  return ((data as { sort_index: number } | null)?.sort_index ?? 0) + 10;
}

async function nextFeaturedRank(db: DB) {
  const { data } = await db.from("projects").select("featured_rank")
    .not("featured_rank", "is", null)
    .order("featured_rank", { ascending: false }).limit(1).single();
  return ((data as { featured_rank: number } | null)?.featured_rank ?? 0) + 1;
}

async function uniqueSlug(db: DB, base: string) {
  const { data } = await db.from("projects").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => (r as { slug: string }).slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 500; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now()}`;
}

/** Database errors, translated. An editor should never see a constraint name. */
function friendly(message: string): string {
  if (/hero_needs_a_real_still|featured_needs_a_real_still/.test(message))
    return "Add a poster before putting this on the homepage.";
  if (/hero_must_be_published|featured_must_be_published/.test(message))
    return "A credit has to be published before it can go on the homepage.";
  if (/projects_slug_key|duplicate key/.test(message))
    return "There's already a credit with that web address.";
  if (/row-level security|permission denied/.test(message))
    return "You don't have permission to change that. Ask your developer.";
  return "That didn't save. Please try again, and tell your developer if it keeps happening.";
}
