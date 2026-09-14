"use server";

import { redirect } from "next/navigation";
import { supabaseServer, currentUser } from "@/lib/supabase/server";
import { friendly, slugify, uniqueSlug } from "@/lib/cms/admin-helpers";
import { discardFor, getDraft, stageDraft } from "@/lib/cms/drafts";

export type SaveResult = { ok: false; error: string } | { ok: true; slug: string; staged: boolean };

/**
 * Every edit here is STAGED, not published. The live tables are untouched until
 * someone presses Publish on /admin/publish, so a half-finished credit, a typo,
 * or an experiment never reaches a visitor.
 *
 * Two conventions hold this together:
 *
 *   * A patch holds database column names, because lib/cms/preview.ts overlays
 *     it straight onto raw rows with no translation.
 *   * A key starting with "_" is a PSEUDO-field: something the editor thinks of
 *     as one switch that is not one column. `_featured` becomes a rank at
 *     publish time; `_focal` lands on the image's own row, not the credit's.
 */

const PROJECT_FIELDS = [
  "title",
  "studio",
  "year",
  "role",
  "category_id",
  "trailer_url",
  "seo_title",
  "seo_description",
  "published",
] as const;

function readForm(form: FormData) {
  const s = (k: string) => String(form.get(k) ?? "").trim();
  const trailer = s("trailer_url");

  return {
    title: s("title"),
    studio: s("studio"),
    yearRaw: s("year"),
    year: Number(s("year")),
    role: s("role"),
    category_id: s("category_id"),
    trailer_url: trailer === "" ? null : trailer,
    seo_title: s("seo_title") || null,
    seo_description: s("seo_description") || null,
    published: form.get("published") === "on",
    wantsFeatured: form.get("featured") === "on",
    tagIds: form.getAll("tags").map(String).sort(),
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
  // A uuid, or "new:<slug>" for a category that is itself still only staged.
  if (!/^(new:[a-z0-9-]+|[0-9a-f-]{36})$/.test(v.category_id)) return "Pick a category.";
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

  const candidate: Record<string, unknown> = {
    title: v.title,
    studio: v.studio,
    year: v.year,
    role: v.role,
    category_id: v.category_id,
    trailer_url: v.trailer_url,
    seo_title: v.seo_title,
    seo_description: v.seo_description,
    published: v.published,
  };

  // ------------------------------------------------------------ a new credit --
  if (!slug) {
    const base = slugify(v.title);
    if (!base) return { ok: false, error: "That title can't be turned into a web address." };
    // Reserved now so the poster upload has something to attach to before the
    // credit exists. Re-checked at publish, in case another one lands first.
    const provisional = await uniqueSlug(db, base);

    const res = await stageDraft({
      table: "projects",
      rowKey: provisional,
      op: "insert",
      patch: { ...candidate, tags: v.tagIds, ...(v.wantsFeatured ? { _featured: true } : {}) },
      label: v.title,
      summary: "New credit, not on the website yet",
    });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, slug: provisional, staged: true };
  }

  // --------------------------------------------------------- an existing one --
  const { data: liveRow, error } = await db
    .from("projects")
    .select("id,slug,still_media_id,featured_rank,title,studio,year,role,category_id,trailer_url,seo_title,seo_description,published")
    .eq("slug", slug)
    .maybeSingle();

  // No live row means this is a credit that is itself still only staged.
  const draft = await getDraft("projects", { rowKey: slug });
  if (error) return { ok: false, error: friendly(error.message) };
  if (!liveRow && draft?.op !== "insert") return { ok: false, error: "That credit no longer exists." };

  const live = (liveRow ?? {}) as Record<string, unknown>;
  const stillId = (live.still_media_id as string | null) ?? (draft?.patch.still_media_id as string | null) ?? null;

  if (v.wantsFeatured && !stillId)
    return { ok: false, error: "Add a poster before putting this in Selected Work." };

  if (draft?.op === "insert") {
    const res = await stageDraft({
      table: "projects",
      rowKey: slug,
      op: "insert",
      patch: { ...candidate, tags: v.tagIds, _featured: v.wantsFeatured },
      label: v.title,
      summary: "New credit, not on the website yet",
    });
    return res.ok ? { ok: true, slug, staged: true } : { ok: false, error: res.error };
  }

  // Only genuinely different values are staged. Typing a word and typing it
  // back should leave nothing waiting to publish, and the Review screen should
  // say "changed the year", not list every field on the form.
  const patch: Record<string, unknown> = {};
  for (const key of PROJECT_FIELDS) {
    if (!same(live[key], candidate[key])) patch[key] = candidate[key];
  }

  const liveTags = await currentTagIds(db, live.id as string);
  if (liveTags.join("|") !== v.tagIds.join("|")) patch.tags = v.tagIds;

  const isFeatured = live.featured_rank !== null && live.featured_rank !== undefined;
  if (isFeatured !== v.wantsFeatured) patch._featured = v.wantsFeatured;

  // Merge with anything already staged, then decide whether a draft is still
  // warranted: a poster staged earlier keeps the draft alive even when this
  // save changes nothing.
  const merged = { ...(draft?.patch ?? {}), ...patch };
  for (const key of PROJECT_FIELDS) {
    if (key in merged && same(live[key], merged[key])) delete merged[key];
  }

  if (!Object.keys(merged).length) {
    if (draft) await discardFor("projects", { rowKey: slug });
    return { ok: true, slug, staged: false };
  }

  const res = await stageDraft({
    table: "projects",
    rowKey: slug,
    op: "update",
    patch: merged,
    label: (merged.title as string) ?? (live.title as string) ?? slug,
  });
  return res.ok ? { ok: true, slug, staged: true } : { ok: false, error: res.error };
}

/** The editor clicked the preview to say what must stay in frame. */
export async function setFocalPoint(slug: string, x: number, y: number) {
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const label = await labelFor(slug);

  // Focal point belongs to the image row, not the credit, but an editor thinks
  // of it as part of this credit — so it rides along in the same draft under a
  // pseudo-field and is unpacked at publish.
  await stageDraft({
    table: "projects",
    rowKey: slug,
    patch: { _focal: { x: clamp(x), y: clamp(y) } },
    label,
    summary: "Changed where the poster crops",
  });
}

export async function setPublished(slug: string, published: boolean) {
  const db = await supabaseServer();
  const { data } = await db
    .from("projects")
    .select("title,published")
    .eq("slug", slug)
    .maybeSingle();
  const live = data as { title: string; published: boolean } | null;

  if (live && live.published === published) {
    await discardFor("projects", { rowKey: slug });
    return;
  }

  await stageDraft({
    table: "projects",
    rowKey: slug,
    patch: { published },
    label: live?.title ?? slug,
    summary: published ? "Putting it on the website" : "Taking it off the website",
  });
}

export async function deleteWork(slug: string) {
  const draft = await getDraft("projects", { rowKey: slug });

  // A credit that only ever existed as a draft is thrown away outright — there
  // is nothing on the website to remove, so asking someone to publish a
  // deletion of something that was never published would be nonsense.
  if (draft?.op === "insert") {
    await discardFor("projects", { rowKey: slug });
    redirect("/admin/work");
  }

  await stageDraft({
    table: "projects",
    rowKey: slug,
    op: "delete",
    patch: {},
    label: await labelFor(slug),
    summary: "Removing it from the website",
  });
  redirect("/admin/work");
}

export async function duplicateWork(slug: string) {
  const db = await supabaseServer();
  const { data } = await db.from("projects").select("*").eq("slug", slug).maybeSingle();
  if (!data) return;
  const src = data as Record<string, unknown>;

  const title = `${src.title} (copy)`;
  const provisional = await uniqueSlug(db, slugify(title));

  await stageDraft({
    table: "projects",
    rowKey: provisional,
    op: "insert",
    // A duplicate never inherits a curated slot or a live state: those are
    // decisions about the real credit, not properties of it.
    patch: {
      title,
      studio: src.studio,
      year: src.year,
      role: src.role,
      category_id: src.category_id,
      trailer_url: src.trailer_url,
      still_media_id: src.still_media_id,
      published: false,
      tags: await currentTagIds(db, src.id as string),
    },
    label: title,
    summary: `Copied from ${src.title}`,
  });
}

// ----------------------------------------------------------------- helpers --

type DB = Awaited<ReturnType<typeof supabaseServer>>;

async function currentTagIds(db: DB, projectId: string): Promise<string[]> {
  if (!projectId) return [];
  const { data } = await db.from("project_tags").select("tag_id").eq("project_id", projectId);
  return (data ?? []).map((r) => (r as { tag_id: string }).tag_id).sort();
}

async function labelFor(slug: string): Promise<string> {
  const db = await supabaseServer();
  const { data } = await db.from("projects").select("title").eq("slug", slug).maybeSingle();
  return (data as { title: string } | null)?.title ?? slug;
}

/** Loose equality across the null/"" and number/string mismatches a form produces. */
function same(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v === "" || v === undefined ? null : v);
  const x = norm(a);
  const y = norm(b);
  if (x === null && y === null) return true;
  return String(x) === String(y);
}
