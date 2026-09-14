import { supabaseServer } from "@/lib/supabase/server";
import { getDraft } from "@/lib/cms/drafts";
import { HomepageCurator, type Pick } from "@/components/admin/HomepageCurator";
import { PageTitle } from "@/components/admin/ui";
import { mediaUrl, type MediaRef } from "../work/formData";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage" };

type Row = {
  slug: string; title: string; studio: string; year: number;
  hero_rank: number | null; featured_rank: number | null;
  still: MediaRef | null;
};

export default async function HomepagePage() {
  const db = await supabaseServer();

  // Only credits that could legally be curated: published, with a real poster.
  // The database enforces this too, but an editor should not be offered a
  // choice that will be rejected.
  const [{ data }, draft] = await Promise.all([
    db
      .from("projects")
      .select(
        `slug,title,studio,year,hero_rank,featured_rank,
         still:media!projects_still_media_id_fkey(legacy_public_path,bucket,object_path,focal_x,focal_y)`,
      )
      .eq("published", true)
      .not("still_media_id", "is", null)
      .order("year", { ascending: false })
      .order("sort_index"),
    getDraft("homepage", { rowKey: "homepage" }),
  ]);

  const rows = (data ?? []) as unknown as Row[];
  const toPick = (r: Row): Pick => ({
    slug: r.slug, title: r.title, studio: r.studio, year: r.year, poster: mediaUrl(r.still),
  });

  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const fromSlugs = (slugs: string[]) =>
    slugs.map((s) => bySlug.get(s)).filter(Boolean).map((r) => toPick(r as Row));

  // A staged order is what the editor is working on, so it is what they see.
  const stagedHero = Array.isArray(draft?.patch.hero) ? (draft!.patch.hero as string[]) : null;
  const stagedFeatured = Array.isArray(draft?.patch.featured)
    ? (draft!.patch.featured as string[])
    : null;

  const liveHero = rows
    .filter((r) => r.hero_rank !== null)
    .sort((a, b) => a.hero_rank! - b.hero_rank!)
    .map(toPick);
  const liveFeatured = rows
    .filter((r) => r.featured_rank !== null)
    .sort((a, b) => a.featured_rank! - b.featured_rank!)
    .map(toPick);

  return (
    <>
      <PageTitle
        title="Homepage"
        description="Choose which work leads the site. Only films that are on the website and have a poster can appear here."
      />
      <div className="mt-7">
        <HomepageCurator
          hero={stagedHero ? fromSlugs(stagedHero) : liveHero}
          featured={stagedFeatured ? fromSlugs(stagedFeatured) : liveFeatured}
          options={rows.map(toPick)}
          staged={Boolean(draft)}
        />
      </div>
    </>
  );
}
