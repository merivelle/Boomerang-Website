import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { WorkTable, type WorkRow } from "@/components/admin/WorkTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Work" };

type Row = {
  slug: string; title: string; studio: string; year: number;
  published: boolean; featured_rank: number | null; hero_rank: number | null;
  categories: { label: string } | null;
  still: { legacy_public_path: string | null; bucket: string | null; object_path: string | null } | null;
  placeholder: { legacy_public_path: string | null; bucket: string | null; object_path: string | null } | null;
  project_tags: Array<{ tags: { slug: string } }>;
};

const url = (m: Row["still"]) =>
  !m ? null
    : m.legacy_public_path ??
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${m.bucket}/${m.object_path}`;

export default async function WorkListPage() {
  const db = await supabaseServer();
  const MEDIA = "legacy_public_path,bucket,object_path";

  const [{ data: projects }, { data: cats }] = await Promise.all([
    db.from("projects").select(
      `slug,title,studio,year,published,featured_rank,hero_rank,sort_index,
       categories(label),
       still:media!projects_still_media_id_fkey(${MEDIA}),
       placeholder:media!projects_placeholder_media_id_fkey(${MEDIA}),
       project_tags(tags(slug))`,
    ).order("year", { ascending: false }).order("sort_index"),
    db.from("categories").select("label").order("sort_index"),
  ]);

  const rows: WorkRow[] = ((projects ?? []) as unknown as Row[]).map((p) => ({
    slug: p.slug,
    title: p.title,
    studio: p.studio,
    year: p.year,
    category: p.categories?.label ?? "—",
    // Falls back to the graded stand-in so the row shows something recognisable
    // instead of an empty box for the credits that still need a real frame.
    poster: url(p.still) ?? url(p.placeholder),
    hasRealPoster: !!p.still,
    published: p.published,
    featured: p.featured_rank !== null,
    inHero: p.hero_rank !== null,
    tags: (p.project_tags ?? []).map((t) => t.tags.slug),
  }));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-[-0.02em] text-zinc-900">Work</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Every credit on the website. Changes go live within a few seconds.
          </p>
        </div>
        <Link
          href="/admin/work/new"
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          + Add work
        </Link>
      </div>

      <WorkTable rows={rows} categories={(cats ?? []).map((c) => (c as { label: string }).label)} />
    </>
  );
}
