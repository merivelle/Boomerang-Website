"use server";

import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { sameValue } from "@/lib/cms/admin-helpers";
import { discardFor, getDraft, listDrafts, stageDraft } from "@/lib/cms/drafts";
import {
  categoryUsage,
  isNewKey,
  loadTaxonomy,
  newKey,
  taxonomySlug,
  rewriteProjectDraftCategory,
  type TaxRow,
  type TaxTable,
} from "@/lib/cms/taxonomy";

export type Result = { ok: true; staged: boolean } | { ok: false; error: string };

/**
 * The Work filters. Like every other editor, nothing here writes to the live
 * tables: each save works out what changed against what is published, stages
 * that, and the website is left alone until someone presses Publish.
 *
 * A filter's web address (slug) is fixed the day it is created and never
 * follows a rename — a category called "Film" that becomes "Feature Film"
 * keeps its films, its links and its place.
 */

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const noun = (t: TaxTable) => (t === "categories" ? "category" : "tag");

/**
 * The Work page keys its buttons by label, and "All" is the button that shows
 * everything — so a name has to be unique across BOTH lists, not just its own.
 */
function badName(
  table: TaxTable,
  label: string,
  selfId: string | null,
  tax: { categories: TaxRow[]; tags: TaxRow[] },
): string | null {
  if (!label) return `Give the ${noun(table)} a name.`;
  if (label.toLowerCase() === "all")
    return "“All” is already the button that shows everything. Pick a different name.";
  const clash = [...tax.categories, ...tax.tags].find(
    (r) => r.id !== selfId && r.draft !== "removing" && r.label.toLowerCase() === label.toLowerCase(),
  );
  if (clash) return `There's already a filter called “${clash.label}” on the Work page.`;
  return null;
}

async function save(table: TaxTable, id: string | null, form: FormData): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const label = str(form, "label");
  const db = await supabaseServer();
  const drafts = await listDrafts(db);
  const tax = await loadTaxonomy(db, drafts);

  const problem = badName(table, label, id, tax);
  if (problem) return { ok: false, error: problem };

  const candidate: Record<string, unknown> = { label };
  if (table === "tags") candidate.show_in_filters = form.get("show_in_filters") === "on";

  // ------------------------------------------------- one that is only staged --
  if (id && isNewKey(id)) {
    const existing = await getDraft(table, { rowKey: id });
    if (!existing) return { ok: false, error: `That ${noun(table)} no longer exists.` };
    const res = await stageDraft({
      table,
      rowKey: id,
      op: "insert",
      patch: candidate,
      label,
      summary: `New ${noun(table)}, not on the website yet`,
    });
    return res.ok ? { ok: true, staged: true } : { ok: false, error: res.error };
  }

  // ------------------------------------------------------- an existing one --
  if (id) {
    const { data } = await db
      .from(table)
      .select(table === "tags" ? "label,show_in_filters" : "label")
      .eq("id", id)
      .maybeSingle();
    if (!data) return { ok: false, error: `That ${noun(table)} no longer exists.` };
    const live = data as unknown as Record<string, unknown>;

    const existing = await getDraft(table, { rowId: id });
    const merged = { ...(existing?.patch ?? {}), ...candidate };
    for (const key of Object.keys(merged)) {
      if (key.startsWith("_") || sameValue(live[key], merged[key])) delete merged[key];
    }

    if (!Object.keys(merged).length) {
      // Saving unchanged over a queued removal leaves the removal queued.
      if (existing && existing.op !== "delete") await discardFor(table, { rowId: id });
      return { ok: true, staged: false };
    }

    // stageDraft merges onto whatever is already there, so a key dropped above
    // (a reverted name, a stale "move the films to…") would creep back in.
    // Start clean whenever the open draft holds something this save discards.
    if (existing && Object.keys(existing.patch).some((k) => !(k in merged))) {
      await discardFor(table, { rowId: id });
    }

    const res = await stageDraft({
      table,
      rowId: id,
      // Explicit: editing one that was queued for removal un-queues it.
      op: "update",
      patch: merged,
      label,
      summary:
        "label" in merged
          ? `Renamed it from “${String(live.label)}”`
          : "Changed whether it has a filter button",
    });
    return res.ok ? { ok: true, staged: true } : { ok: false, error: res.error };
  }

  // ------------------------------------------------------------- a new one --
  const slug = await taxonomySlug(db, table, label, drafts);
  if (!slug) return { ok: false, error: "That name can't be turned into a web address." };

  const res = await stageDraft({
    table,
    rowKey: newKey(slug),
    op: "insert",
    patch: { ...candidate, slug },
    label,
    summary: `New ${noun(table)}, not on the website yet`,
  });
  return res.ok ? { ok: true, staged: true } : { ok: false, error: res.error };
}

export async function saveCategory(id: string | null, form: FormData): Promise<Result> {
  return save("categories", id, form);
}

export async function saveTag(id: string | null, form: FormData): Promise<Result> {
  return save("tags", id, form);
}

// ------------------------------------------------------------------ delete --

/**
 * A film always has a category, so removing one that is in use means saying
 * where its films go. That choice rides along in the draft and is applied at
 * publish, when the films actually move.
 */
export async function deleteCategory(id: string, reassignTo: string | null): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const db = await supabaseServer();
  const drafts = await listDrafts(db);
  const [{ categories }, usage] = await Promise.all([
    loadTaxonomy(db, drafts),
    categoryUsage(db, drafts),
  ]);

  const me = categories.find((c) => c.id === id);
  if (!me) return { ok: false, error: "That category no longer exists." };

  const uses = usage.get(id) ?? 0;
  const target = reassignTo ? categories.find((c) => c.id === reassignTo) : null;

  if (uses > 0) {
    if (!reassignTo)
      return {
        ok: false,
        error: `${uses} ${uses === 1 ? "film uses" : "films use"} this category. Choose where they should go first.`,
      };
    if (!target || target.id === id || target.draft === "removing")
      return { ok: false, error: "Pick a different category to move them to." };
  }

  // One that only ever existed as a draft is thrown away outright — there is
  // nothing on the website to remove. Films staged into it move now.
  if (isNewKey(id)) {
    if (uses > 0 && target) await rewriteProjectDraftCategory(db, id, target.id);
    await discardFor("categories", { rowKey: id });
    return { ok: true, staged: false };
  }

  const remaining = categories.filter((c) => c.id !== id && c.draft !== "removing").length;
  if (remaining < 1)
    return {
      ok: false,
      error: "The Work page needs at least one category. Add another before removing this one.",
    };

  const res = await stageDraft({
    table: "categories",
    rowId: id,
    op: "delete",
    patch: uses > 0 && target ? { _reassign_to: target.id } : {},
    label: me.label,
    summary:
      uses > 0 && target
        ? `Removing it and moving ${uses} ${uses === 1 ? "film" : "films"} to ${target.label}`
        : "Removing it from the Work filters",
  });
  return res.ok ? { ok: true, staged: true } : { ok: false, error: res.error };
}

export async function deleteTag(id: string): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  if (isNewKey(id)) {
    await discardFor("tags", { rowKey: id });
    return { ok: true, staged: false };
  }

  const db = await supabaseServer();
  const [{ data }, { count }] = await Promise.all([
    db.from("tags").select("label").eq("id", id).maybeSingle(),
    db.from("project_tags").select("tag_id", { count: "exact", head: true }).eq("tag_id", id),
  ]);
  if (!data) return { ok: false, error: "That tag no longer exists." };

  const uses = count ?? 0;
  const res = await stageDraft({
    table: "tags",
    rowId: id,
    op: "delete",
    patch: {},
    label: (data as { label: string }).label,
    summary: uses
      ? `Removing it — ${uses} ${uses === 1 ? "film loses" : "films lose"} the tag`
      : "Removing it from the Work filters",
  });
  return res.ok ? { ok: true, staged: true } : { ok: false, error: res.error };
}

// ----------------------------------------------------------------- reorder --

/** The order the buttons read in across the top of the Work page. */
async function reorder(table: TaxTable, ids: string[]): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const db = await supabaseServer();
  const { data } = await db.from(table).select("id").order("sort_index");
  const live = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);

  // Dragged back to exactly the published order: nothing to publish.
  const liveOnly = ids.filter((id) => !isNewKey(id));
  if (liveOnly.length === live.length && liveOnly.every((id, i) => id === live[i]) && liveOnly.length === ids.length) {
    await discardFor(table, { rowKey: `order:${table}` });
    return { ok: true, staged: false };
  }

  const res = await stageDraft({
    table,
    rowKey: `order:${table}`,
    op: "update",
    patch: { order: ids },
    label: table === "categories" ? "Category order" : "Tag order",
    summary: "Reordered the Work filters",
  });
  return res.ok ? { ok: true, staged: true } : { ok: false, error: res.error };
}

export async function reorderCategories(ids: string[]): Promise<Result> {
  return reorder("categories", ids);
}

export async function reorderTags(ids: string[]): Promise<Result> {
  return reorder("tags", ids);
}
