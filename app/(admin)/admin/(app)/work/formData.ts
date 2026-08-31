import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

const MEDIA = "legacy_public_path,bucket,object_path,focal_x,focal_y";

export type MediaRef = {
  legacy_public_path: string | null; bucket: string | null; object_path: string | null;
  focal_x: number | null; focal_y: number | null;
};

/** NULL focal means nobody has chosen one — the component keeps its own framing. */
export const focalOf = (m: MediaRef | null) =>
  m && m.focal_x !== null && m.focal_y !== null ? { x: Number(m.focal_x), y: Number(m.focal_y) } : null;

export const mediaUrl = (m: MediaRef | null) =>
  !m ? null
    : m.legacy_public_path ??
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${m.bucket}/${m.object_path}`;

export const PROJECT_SELECT = `slug,title,studio,year,role,trailer_url,published,
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
export async function formOptions() {
  const db = await supabaseServer();
  const [cats, tags, rows] = await Promise.all([
    db.from("categories").select("id,label").order("sort_index"),
    db.from("tags").select("id,label").order("sort_index"),
    db.from("projects").select("role,studio"),
  ]);

  const list = (rows.data ?? []) as Array<{ role: string; studio: string }>;
  return {
    categories: (cats.data ?? []) as Array<{ id: string; label: string }>,
    tags: (tags.data ?? []) as Array<{ id: string; label: string }>,
    roleSuggestions: [...new Set(list.map((r) => r.role))].sort(),
    studioSuggestions: [...new Set(list.map((r) => r.studio))].sort(),
  };
}
