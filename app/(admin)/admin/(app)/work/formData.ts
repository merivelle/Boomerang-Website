import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { listDrafts } from "@/lib/cms/drafts";
import { loadTaxonomy, type TaxRow } from "@/lib/cms/taxonomy";

const MEDIA = "legacy_public_path,bucket,object_path,focal_x,focal_y";

export type MediaRef = {
  legacy_public_path: string | null; bucket: string | null; object_path: string | null;
  // Optional so the same resolver serves callers that only need a URL — the
  // media library lists images that are not attached to anything.
  focal_x?: number | null; focal_y?: number | null;
};

/** NULL focal means nobody has chosen one — the component keeps its own framing. */
export const focalOf = (m: MediaRef | null) =>
  m && m.focal_x != null && m.focal_y != null ? { x: Number(m.focal_x), y: Number(m.focal_y) } : null;

export const mediaUrl = (m: MediaRef | null) =>
  !m ? null
    : m.legacy_public_path ??
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${m.bucket}/${m.object_path}`;

export const PROJECT_SELECT = `slug,title,studio,year,role,trailer_url,published,
  seo_title,seo_description,
  featured_rank,hero_rank,category_id,
  still:media!projects_still_media_id_fkey(${MEDIA}),
  placeholder:media!projects_placeholder_media_id_fkey(${MEDIA}),
  project_tags(tag_id)`;

/**
 * Options for the form. `role` and `studio` are free text with a suggestion
 * list built from what is already in use — 3 roles and 33 studios do not
 * warrant lookup tables, and a lookup table would stop an editor typing a
 * distributor nobody has worked with yet.
 */
export type FilterOption = Pick<TaxRow, "id" | "label" | "draft">;

export async function formOptions() {
  const db = await supabaseServer();
  const drafts = await listDrafts(db);
  const [tax, rows] = await Promise.all([
    loadTaxonomy(db, drafts),
    db.from("projects").select("role,studio"),
  ]);

  // Filters that are staged but not yet published are offered too, marked as
  // such — adding a category and filing a film under it is one job, not two
  // publishes. One queued for removal is not: nothing new should be put there.
  const usable = (r: TaxRow): FilterOption => ({ id: r.id, label: r.label, draft: r.draft });
  const list = (rows.data ?? []) as Array<{ role: string; studio: string }>;
  return {
    categories: tax.categories.filter((c) => c.draft !== "removing").map(usable),
    tags: tax.tags.filter((t) => t.draft !== "removing").map(usable),
    roleSuggestions: [...new Set(list.map((r) => r.role))].sort(),
    studioSuggestions: [...new Set(list.map((r) => r.studio))].sort(),
  };
}
