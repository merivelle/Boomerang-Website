import { supabaseServer } from "@/lib/supabase/server";
import { listDrafts } from "@/lib/cms/drafts";
import { loadTaxonomy } from "@/lib/cms/taxonomy";
import { WorkManager, type WorkRow } from "@/components/admin/WorkManager";
import { mediaUrl, type MediaRef } from "./formData";

export const dynamic = "force-dynamic";
export const metadata = { title: "Work" };

type Row = {
  id: string;
  slug: string;
  title: string;
  studio: string;
  year: number;
  created_at: string;
  trailer_url: string | null;
  seo_description: string | null;
  published: boolean;
  featured_rank: number | null;
  hero_rank: number | null;
  category_id: string;
  categories: { label: string } | null;
  still: MediaRef | null;
  placeholder: MediaRef | null;
  project_tags: Array<{ tags: { slug: string } }>;
};

export default async function WorkListPage() {
  const db = await supabaseServer();
  const MEDIA = "legacy_public_path,bucket,object_path,focal_x,focal_y";

  const [{ data: projects }, drafts] = await Promise.all([
    db
      .from("projects")
      .select(
        `id,slug,title,studio,year,created_at,trailer_url,seo_description,
         published,featured_rank,hero_rank,category_id,
         categories(label),
         still:media!projects_still_media_id_fkey(${MEDIA}),
         placeholder:media!projects_placeholder_media_id_fkey(${MEDIA}),
         project_tags(tags(slug))`,
      )
      .order("year", { ascending: false })
      .order("sort_index"),
    listDrafts(db),
  ]);

  // Live categories with drafts applied, so a film filed under a category that
  // is itself still staged ("new:<slug>") shows its name here rather than "—".
  const { categories } = await loadTaxonomy(db, drafts);
  const labelOf = new Map(categories.map((c) => [c.id, c.label]));

  // Every image a draft points at, resolved in one query rather than one per row.
  const stagedMediaIds = drafts
    .filter((d) => d.table_name === "projects")
    .map((d) => d.patch.still_media_id)
    .filter((v): v is string => typeof v === "string");

  const posters = new Map<string, string>();
  if (stagedMediaIds.length) {
    const { data } = await db
      .from("media")
      .select("id,legacy_public_path,bucket,object_path")
      .in("id", stagedMediaIds);
    for (const m of (data ?? []) as Array<MediaRef & { id: string }>) {
      const u = mediaUrl(m);
      if (u) posters.set(m.id, u);
    }
  }

  const byslug = new Map(
    drafts.filter((d) => d.table_name === "projects" && d.row_key).map((d) => [d.row_key!, d]),
  );

  const rows: WorkRow[] = ((projects ?? []) as unknown as Row[]).map((p) => {
    const draft = byslug.get(p.slug);
    const patch = (draft?.patch ?? {}) as Record<string, unknown>;
    const stagedStill = typeof patch.still_media_id === "string" ? patch.still_media_id : null;

    return {
      slug: p.slug,
      // Shown as it WILL read once published — an editor who just changed a
      // title should see the new one in the list, with a badge saying why.
      title: (patch.title as string) ?? p.title,
      studio: (patch.studio as string) ?? p.studio,
      year: Number(patch.year ?? p.year),
      category: labelOf.get((patch.category_id as string) ?? p.category_id) ?? "—",
      // Falls back to the graded stand-in so the row shows something
      // recognisable instead of an empty box.
      poster: (stagedStill && posters.get(stagedStill)) ?? mediaUrl(p.still) ?? mediaUrl(p.placeholder),
      hasRealPoster: Boolean(p.still || stagedStill),
      published: (patch.published as boolean) ?? p.published,
      featured: (patch._featured as boolean) ?? p.featured_rank !== null,
      inHero: p.hero_rank !== null,
      hasTrailer: Boolean(("trailer_url" in patch ? patch.trailer_url : p.trailer_url) ?? null),
      hasDescription: Boolean(
        ("seo_description" in patch ? patch.seo_description : p.seo_description) ?? null,
      ),
      addedAt: p.created_at,
      draft: draft ? (draft.op === "delete" ? "removing" : "edited") : null,
    };
  });

  // Credits that exist only as a staged insert have no live row to merge onto,
  // so they are appended. Without this an editor adds a credit and it vanishes.
  for (const d of drafts) {
    if (d.table_name !== "projects" || d.op !== "insert" || !d.row_key) continue;
    const patch = d.patch as Record<string, unknown>;
    const stagedStill = typeof patch.still_media_id === "string" ? patch.still_media_id : null;

    rows.unshift({
      slug: d.row_key,
      title: (patch.title as string) ?? d.label,
      studio: (patch.studio as string) ?? "—",
      year: Number(patch.year ?? new Date(d.created_at).getFullYear()),
      category: labelOf.get(patch.category_id as string) ?? "—",
      poster: (stagedStill && posters.get(stagedStill)) ?? null,
      hasRealPoster: Boolean(stagedStill),
      published: (patch.published as boolean) ?? false,
      featured: Boolean(patch._featured),
      inHero: false,
      hasTrailer: Boolean(patch.trailer_url),
      hasDescription: Boolean(patch.seo_description),
      addedAt: d.created_at,
      draft: "new",
    });
  }

  return <WorkManager rows={rows} categories={categories.map((c) => c.label)} />;
}
