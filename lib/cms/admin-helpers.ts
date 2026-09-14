import "server-only";
import type { supabaseServer } from "@/lib/supabase/server";

/**
 * Shared admin plumbing.
 *
 * These live outside the server-action files because a "use server" module may
 * only export async functions — a sync helper like slugify() exported from one
 * is a build error. Keeping them here also means the publish engine and the
 * Work editor cannot drift apart on what a valid slug is.
 */

export type DB = Awaited<ReturnType<typeof supabaseServer>>;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export async function nextSortIndex(db: DB) {
  const { data } = await db
    .from("projects")
    .select("sort_index")
    .order("sort_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as { sort_index: number } | null)?.sort_index ?? 0) + 10;
}

export async function nextFeaturedRank(db: DB) {
  const { data } = await db
    .from("projects")
    .select("featured_rank")
    .not("featured_rank", "is", null)
    .order("featured_rank", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as { featured_rank: number } | null)?.featured_rank ?? 0) + 1;
}

export async function uniqueSlug(db: DB, base: string) {
  const { data } = await db.from("projects").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => (r as { slug: string }).slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 500; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now()}`;
}

/** Database errors, translated. An editor should never see a constraint name. */
export function friendly(message: string): string {
  if (/hero_needs_a_real_still|featured_needs_a_real_still/.test(message))
    return "Add a poster before putting this on the homepage.";
  if (/hero_must_be_published|featured_must_be_published/.test(message))
    return "A credit has to be published before it can go on the homepage.";
  if (/projects_slug_key|duplicate key/.test(message))
    return "There's already a credit with that web address.";
  if (/projects_category_id_fkey/.test(message))
    return "Films still use this category. Open Work filters, remove it again and choose where to move them.";
  if (/still_aspect_is_sane/.test(message))
    return "That image is the wrong shape — the site needs a wide, landscape frame.";
  if (/row-level security|permission denied/.test(message))
    return "You don't have permission to change that. Ask your developer.";
  if (/relation .* does not exist|schema cache/.test(message))
    return "The site database hasn't been updated yet. Ask your developer to run the latest migration.";
  return "That didn't save. Please try again, and tell your developer if it keeps happening.";
}

/**
 * Only genuinely different values, so a draft describes what actually changed.
 *
 * Typing a word and typing it back should leave nothing waiting to publish, and
 * the Review screen should read "changed the year" rather than listing every
 * field on the form. Comparison is loose because a form yields strings and ""
 * where the database holds numbers and NULL.
 */
export function diffPatch(
  live: Record<string, unknown>,
  candidate: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (!sameValue(live[key], value)) out[key] = value;
  }
  return out;
}

export function sameValue(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v === "" || v === undefined ? null : v);
  const x = norm(a);
  const y = norm(b);
  if (x === null && y === null) return true;
  if (x === null || y === null) return false;
  return String(x) === String(y);
}
