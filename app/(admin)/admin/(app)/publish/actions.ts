"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer, currentUser } from "@/lib/supabase/server";
import { listDrafts, discardDraft, discardAllDrafts, type Draft } from "@/lib/cms/drafts";
import {
  friendly,
  nextFeaturedRank,
  nextSortIndex,
  slugify,
  uniqueSlug,
  type DB,
} from "@/lib/cms/admin-helpers";
import { saveFeatured, saveHero } from "../homepage/actions";
import {
  isNewKey,
  resolveCategoryId,
  resolveTagIds,
  rewriteProjectDraftCategory,
  type TaxTable,
} from "@/lib/cms/taxonomy";

export type PublishItem = { id: string; label: string; ok: boolean; error?: string };
export type PublishResult = { published: number; failed: PublishItem[] };

/**
 * Busts every cached read a publish could affect, once, at the end. Doing it
 * per item would fire twenty revalidations for one click.
 */
function bust() {
  for (const t of ["projects", "media", "clients", "site", "seo"]) revalidateTag(t);
  revalidatePath("/", "layout");
}

/**
 * Applies staged edits to the live tables.
 *
 * Order is a dependency order, not a preference: a credit has to exist before
 * it can be placed on the homepage, and has to still exist when its placement
 * is read, so deletes go last.
 *
 * Each item succeeds or fails on its own. One credit that can't go live — say
 * it was put in Selected Work and then lost its poster — must not hold back the
 * other nineteen.
 */
const ORDER: Draft["table_name"][] = [
  // A film can be filed under a category that is itself only staged, so the
  // filters have to exist before the film that names them is written.
  "categories",
  "tags",
  "projects",
  "clients",
  "site_settings",
  "site_credits",
  "seo_pages",
  "homepage",
];

export async function publishDrafts(ids?: string[]): Promise<PublishResult> {
  const user = await currentUser();
  if (!user)
    return { published: 0, failed: [{ id: "*", label: "Session", ok: false, error: "Your session expired. Sign in again." }] };

  const db = await supabaseServer();
  const all = await listDrafts(db);
  const chosen = ids?.length ? all.filter((d) => ids.includes(d.id)) : all;

  const queue = [...chosen].sort((a, b) => {
    const byTable = ORDER.indexOf(a.table_name) - ORDER.indexOf(b.table_name);
    if (byTable !== 0) return byTable;
    // Inserts before updates before deletes, within a table.
    const rank = { insert: 0, update: 1, delete: 2 } as const;
    return rank[a.op] - rank[b.op];
  });

  const failed: PublishItem[] = [];
  let published = 0;

  for (const d of queue) {
    const error = await applyOne(d);
    if (error) {
      failed.push({ id: d.id, label: d.label, ok: false, error });
    } else {
      await discardDraft(d.id);
      published++;
    }
  }

  if (published > 0) {
    await db
      .from("publish_log")
      .insert({
        actor: user.id,
        item_count: published,
        items: queue
          .filter((d) => !failed.some((f) => f.id === d.id))
          .map((d) => ({ label: d.label, summary: d.summary, table: d.table_name })),
      } as never);
    bust();
  }

  return { published, failed };
}

/** Returns an editor-facing error string, or null on success. */
async function applyOne(d: Draft): Promise<string | null> {
  switch (d.table_name) {
    case "projects":
      return applyProject(d);
    case "clients":
      return applyClient(d);
    case "site_settings":
      return applySiteSettings(d);
    case "site_credits":
      return applySiteCredits(d);
    case "seo_pages":
      return applySeo(d);
    case "homepage":
      return applyHomepage(d);
    case "categories":
      return applyTaxonomy(d, "categories");
    case "tags":
      return applyTaxonomy(d, "tags");
    default:
      return "That change couldn't be published. Tell your developer.";
  }
}

// ------------------------------------------------------------------ projects --

async function applyProject(d: Draft): Promise<string | null> {
  const db = await supabaseServer();
  const patch = { ...d.patch } as Record<string, unknown>;

  // Pseudo-fields come out first: they are things the editor sets on a credit
  // that do not live on the credit's own row.
  let tagIds = Array.isArray(patch.tags) ? (patch.tags as string[]) : null;
  const wantsFeatured = typeof patch._featured === "boolean" ? (patch._featured as boolean) : null;
  const focal = patch._focal as { x: number; y: number } | undefined;
  delete patch.tags;
  for (const k of Object.keys(patch)) if (k.startsWith("_")) delete patch[k];

  if (d.op === "delete") {
    const { error } = await db.from("projects").delete().eq("slug", d.row_key ?? "");
    return error ? friendly(error.message) : null;
  }

  // The category and tags may have been chosen while they were themselves only
  // staged ("new:<slug>"). Filters publish first, so by now they are real rows —
  // unless someone discarded them, which is the one case an editor has to hear about.
  if ("category_id" in patch) {
    const real = await resolveCategoryId(db, patch.category_id);
    if (!real)
      return "The category this film was put in isn't on the website — it may have been discarded before publishing. Open the film and pick a category.";
    patch.category_id = real;
  }
  if (tagIds) {
    const r = await resolveTagIds(db, tagIds);
    if (r.missing.length)
      return "One of this film's tags hasn't been published — it may have been discarded. Open the film and check its tags.";
    tagIds = r.ids;
  }

  if (d.op === "insert") {
    const base = slugify(String(patch.title ?? "")) || "untitled";
    const slug = await uniqueSlug(db, base);
    const { data, error } = await db
      .from("projects")
      .insert({
        ...patch,
        slug,
        sort_index: await nextSortIndex(db),
      } as never)
      .select("id")
      .single();
    if (error) return friendly(error.message);

    const newId = (data as { id: string }).id;
    if (tagIds?.length) {
      await db
        .from("project_tags")
        .insert(tagIds.map((tag_id) => ({ project_id: newId, tag_id })) as never);
    }
    if (wantsFeatured) {
      const err = await setFeatured(db, newId, true);
      if (err) return err;
    }
    if (focal) await setFocal(db, newId, focal);
    return null;
  }

  const { data: existing } = await db
    .from("projects")
    .select("id")
    .eq("slug", d.row_key ?? "")
    .maybeSingle();
  if (!existing) return "That credit no longer exists — it may have been deleted.";
  const id = (existing as { id: string }).id;

  if (Object.keys(patch).length) {
    const { error } = await db.from("projects").update(patch as never).eq("id", id);
    if (error) return friendly(error.message);
  }

  if (tagIds) {
    await db.from("project_tags").delete().eq("project_id", id);
    if (tagIds.length) {
      await db
        .from("project_tags")
        .insert(tagIds.map((tag_id) => ({ project_id: id, tag_id })) as never);
    }
  }

  if (wantsFeatured !== null) {
    const err = await setFeatured(db, id, wantsFeatured);
    if (err) return err;
  }
  if (focal) await setFocal(db, id, focal);

  return null;
}

/**
 * "Show in Selected Work" is one switch to an editor and a unique rank column
 * to the database. Turning it on appends to the end of the list; the Homepage
 * screen is where the order itself is decided, and it publishes after this, so
 * an explicit ordering always wins over an implicit append.
 */
async function setFeatured(db: DB, id: string, on: boolean): Promise<string | null> {
  if (!on) {
    const { error } = await db.from("projects").update({ featured_rank: null } as never).eq("id", id);
    return error ? friendly(error.message) : null;
  }

  const { data: current } = await db
    .from("projects")
    .select("featured_rank")
    .eq("id", id)
    .maybeSingle();
  if ((current as { featured_rank: number | null } | null)?.featured_rank) return null;

  const { error } = await db
    .from("projects")
    .update({ featured_rank: await nextFeaturedRank(db) } as never)
    .eq("id", id);
  return error ? friendly(error.message) : null;
}

/** The focal point is a property of the image, reached through the credit. */
async function setFocal(db: DB, projectId: string, focal: { x: number; y: number }) {
  const { data } = await db
    .from("projects")
    .select("still_media_id")
    .eq("id", projectId)
    .maybeSingle();
  const mediaId = (data as { still_media_id: string | null } | null)?.still_media_id;
  if (!mediaId) return;
  await db
    .from("media")
    .update({ focal_x: focal.x, focal_y: focal.y } as never)
    .eq("id", mediaId);
}

// ------------------------------------------------------------------- clients --

async function applyClient(d: Draft): Promise<string | null> {
  const db = await supabaseServer();
  const patch = d.patch as Record<string, unknown>;

  // A whole group's running order, staged as one change rather than one per logo.
  if (d.row_key?.startsWith("order:") && Array.isArray(patch.order)) {
    return reorderGroup(db, patch.order as string[]);
  }

  if (d.op === "delete") {
    const { error } = await db.from("clients").delete().eq("id", d.row_id ?? "");
    return error ? friendly(error.message) : null;
  }

  if (d.op === "insert") {
    const { error } = await db.from("clients").insert(patch as never);
    return error
      ? /duplicate/.test(error.message)
        ? "There's already a client with that name."
        : friendly(error.message)
      : null;
  }

  const { error } = await db.from("clients").update(patch as never).eq("id", d.row_id ?? "");
  return error ? friendly(error.message) : null;
}

/**
 * (group_id, sort_index) is unique, so moving one row into an occupied slot
 * collides. Park the whole group beyond the range first, then lay it back down.
 */
async function reorderGroup(db: DB, ids: string[]): Promise<string | null> {
  for (let i = 0; i < ids.length; i++) {
    const { error } = await db
      .from("clients")
      .update({ sort_index: 1000 + i } as never)
      .eq("id", ids[i]);
    if (error) return friendly(error.message);
  }
  for (let i = 0; i < ids.length; i++) {
    const { error } = await db
      .from("clients")
      .update({ sort_index: i } as never)
      .eq("id", ids[i]);
    if (error) return friendly(error.message);
  }
  return null;
}

// ------------------------------------------------------------ work filters --

/** Categories and tags: the buttons across the top of the Work page. */
async function applyTaxonomy(d: Draft, table: TaxTable): Promise<string | null> {
  const db = await supabaseServer();
  const patch = { ...d.patch } as Record<string, unknown>;
  const noun = table === "categories" ? "category" : "tag";

  if (d.row_key?.startsWith("order:") && Array.isArray(patch.order)) {
    return reorderTaxonomy(db, table, patch.order as string[]);
  }

  if (d.op === "insert") {
    // sort_index is worked out now, not when the draft was staged: two filters
    // added on the same day would otherwise both claim the same slot, and a
    // category's slot is unique.
    const { data: last } = await db
      .from(table)
      .select("sort_index")
      .order("sort_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sort_index = ((last as { sort_index: number } | null)?.sort_index ?? -1) + 1;

    const row: Record<string, unknown> = { slug: patch.slug, label: patch.label, sort_index };
    if (table === "tags") row.show_in_filters = patch.show_in_filters !== false;

    const { error } = await db.from(table).insert(row as never);
    return error
      ? /duplicate/.test(error.message)
        ? `There's already a ${noun} with that web address.`
        : friendly(error.message)
      : null;
  }

  const id = d.row_id ?? "";

  if (d.op === "delete") {
    if (table === "categories") {
      const problem = await emptyCategory(db, id, patch._reassign_to);
      if (problem) return problem;
    }
    const { error } = await db.from(table).delete().eq("id", id);
    return error ? friendly(error.message) : null;
  }

  for (const k of Object.keys(patch)) if (k.startsWith("_") || k === "order") delete patch[k];
  if (!Object.keys(patch).length) return null;

  const { data, error } = await db.from(table).update(patch as never).eq("id", id).select("id");
  if (error) return friendly(error.message);
  if (!data?.length) return `That ${noun} no longer exists — it may have been removed.`;
  return null;
}

/**
 * A film always has a category, so one that is in use cannot simply go: its
 * films move to the category the editor chose when they removed it. Open
 * drafts that point at it move too, or they would fail at their own publish.
 */
async function emptyCategory(db: DB, id: string, reassignTo: unknown): Promise<string | null> {
  const { count: total } = await db.from("categories").select("id", { count: "exact", head: true });
  if ((total ?? 0) <= 1)
    return "The Work page needs at least one category, so this one can't be removed.";

  const [{ count: live }, { count: staged }] = await Promise.all([
    db.from("projects").select("id", { count: "exact", head: true }).eq("category_id", id),
    db
      .from("drafts")
      .select("id", { count: "exact", head: true })
      .eq("table_name", "projects")
      .eq("patch->>category_id", id),
  ]);
  const uses = (live ?? 0) + (staged ?? 0);
  if (!uses) return null;

  const target = await resolveCategoryId(db, reassignTo);
  if (!target || target === id)
    return `${uses} ${uses === 1 ? "film still uses" : "films still use"} this category. Open Work filters, remove it again and choose where to move them.`;

  const { error } = await db
    .from("projects")
    .update({ category_id: target } as never)
    .eq("category_id", id);
  if (error) return friendly(error.message);
  await rewriteProjectDraftCategory(db, id, target);
  return null;
}

/**
 * Like reorderGroup: a category's sort_index is unique, so park everything
 * beyond the range first. Every live row is placed, mentioned in the order or
 * not, so a filter added after the order was staged still lands somewhere.
 * "new:<slug>" entries are resolved by slug — their insert has already run.
 */
async function reorderTaxonomy(db: DB, table: TaxTable, order: string[]): Promise<string | null> {
  const { data } = await db.from(table).select("id,slug").order("sort_index");
  const live = (data ?? []) as Array<{ id: string; slug: string }>;
  const bySlug = new Map(live.map((r) => [r.slug, r.id]));
  const known = new Set(live.map((r) => r.id));

  const placed: string[] = [];
  for (const key of order) {
    const id = isNewKey(key) ? bySlug.get(key.slice(4)) : key;
    if (id && known.has(id) && !placed.includes(id)) placed.push(id);
  }
  for (const r of live) if (!placed.includes(r.id)) placed.push(r.id);

  for (let i = 0; i < placed.length; i++) {
    const { error } = await db.from(table).update({ sort_index: 1000 + i } as never).eq("id", placed[i]);
    if (error) return friendly(error.message);
  }
  for (let i = 0; i < placed.length; i++) {
    const { error } = await db.from(table).update({ sort_index: i } as never).eq("id", placed[i]);
    if (error) return friendly(error.message);
  }
  return null;
}

// --------------------------------------------------------------------- site --

async function applySiteSettings(d: Draft): Promise<string | null> {
  const db = await supabaseServer();
  const patch = { ...d.patch } as Record<string, unknown>;

  // The contact address lives in site_private, which is a different table for a
  // reason: it is the one field the public site must never be able to read.
  const email = patch.contact_email;
  delete patch.contact_email;

  if (Object.keys(patch).length) {
    const { error } = await db.from("site_settings").update(patch as never).eq("id", 1);
    if (error) return friendly(error.message);
  }

  if (typeof email === "string" && email) {
    const { error } = await db
      .from("site_private")
      .update({ contact_email: email } as never)
      .eq("id", 1);
    if (error) return "The contact address didn't save.";
  }
  return null;
}

async function applySiteCredits(d: Draft): Promise<string | null> {
  const titles = Array.isArray(d.patch.titles) ? (d.patch.titles as string[]) : null;
  if (!titles) return null;

  const db = await supabaseServer();
  // Replaced wholesale — eight rows make diffing them more code than it's worth.
  await db.from("site_credits").delete().neq("title", " ");
  if (titles.length) {
    const { error } = await db
      .from("site_credits")
      .insert(titles.map((title, i) => ({ title, sort_index: i })) as never);
    if (error) return friendly(error.message);
  }
  return null;
}

async function applySeo(d: Draft): Promise<string | null> {
  const db = await supabaseServer();
  const { error } = await db
    .from("seo_pages")
    .update(d.patch as never)
    .eq("path", d.row_key ?? "");
  return error ? friendly(error.message) : null;
}

// ----------------------------------------------------------------- homepage --

async function applyHomepage(d: Draft): Promise<string | null> {
  const hero = Array.isArray(d.patch.hero) ? (d.patch.hero as string[]) : null;
  const featured = Array.isArray(d.patch.featured) ? (d.patch.featured as string[]) : null;

  // Reuses the existing curation actions rather than reimplementing them: they
  // already hold the six-slot rule, the poster and published checks, the
  // park-then-place around the unique rank columns, and the phone wordmark
  // rebuild that the hero silently depends on.
  if (hero) {
    const res = await saveHero(hero);
    if (!res.ok) return res.error ?? "The homepage hero couldn't be published.";
  }
  if (featured) {
    const res = await saveFeatured(featured);
    if (!res.ok) return res.error ?? "Selected Work couldn't be published.";
  }
  return null;
}

// ------------------------------------------------------------------ discard --

export async function discardOne(id: string) {
  await discardDraft(id);
}

export async function discardEverything() {
  await discardAllDrafts();
}
