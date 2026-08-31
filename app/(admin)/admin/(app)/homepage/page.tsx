import { supabaseServer } from "@/lib/supabase/server";
import { HomepageCurator, type Pick } from "@/components/admin/HomepageCurator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage" };

type Row = {
  slug: string; title: string; studio: string; year: number;
  hero_rank: number | null; featured_rank: number | null;
  still: { legacy_public_path: string | null; bucket: string | null; object_path: string | null } | null;
};

const url = (m: Row["still"]) =>
  !m ? null
    : m.legacy_public_path ??
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${m.bucket}/${m.object_path}`;

export default async function HomepagePage() {
  const db = await supabaseServer();

  // Only credits that could legally be curated: published, with a real poster.
  // The database enforces this too, but an editor should not be offered a
  // choice that will be rejected.
  const { data } = await db
    .from("projects")
    .select(
      `slug,title,studio,year,hero_rank,featured_rank,
       still:media!projects_still_media_id_fkey(legacy_public_path,bucket,object_path)`,
    )
    .eq("published", true)
    .not("still_media_id", "is", null)
    .order("year", { ascending: false })
    .order("sort_index");

  const rows = (data ?? []) as unknown as Row[];
  const toPick = (r: Row): Pick => ({
    slug: r.slug, title: r.title, studio: r.studio, year: r.year, poster: url(r.still),
  });

  return (
    <>
      <h1 className="text-2xl tracking-[-0.02em] text-zinc-900">Homepage</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Choose which work leads the site. Only films with a poster can appear here.
      </p>

      <div className="mt-8">
        <HomepageCurator
          hero={rows.filter((r) => r.hero_rank !== null).sort((a, b) => a.hero_rank! - b.hero_rank!).map(toPick)}
          featured={rows.filter((r) => r.featured_rank !== null).sort((a, b) => a.featured_rank! - b.featured_rank!).map(toPick)}
          options={rows.map(toPick)}
        />
      </div>
    </>
  );
}
