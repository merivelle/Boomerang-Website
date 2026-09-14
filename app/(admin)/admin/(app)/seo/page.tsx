import { supabaseServer } from "@/lib/supabase/server";
import { listDrafts } from "@/lib/cms/drafts";
import { SeoEditor, type SeoHealth, type SeoRow } from "@/components/admin/SeoEditor";
import { ogLibrary, resolveOg } from "../og-images";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search & sharing" };

// Only the pages an editor writes copy for. Per-credit wording lives on the
// credit's own Search & sharing tab, where the film it belongs to is in front
// of them.
const LABELS: Record<string, string> = {
  "/": "Homepage",
  "/work": "Work",
  "/clients": "Clients",
  "/about": "About",
  "/contact": "Contact",
};

export default async function SeoPage() {
  const db = await supabaseServer();

  const [{ data: pages }, { data: site }, drafts, ogOptions, health] = await Promise.all([
    db.from("seo_pages").select("path,title,description,og_media_id").order("path"),
    db.from("site_settings").select("name,og_media_id").eq("id", 1).single(),
    listDrafts(db),
    ogLibrary(db),
    seoHealth(db),
  ]);

  const byPath = new Map(
    drafts.filter((d) => d.table_name === "seo_pages" && d.row_key).map((d) => [d.row_key!, d]),
  );
  const siteDraft = drafts.find((d) => d.table_name === "site_settings");
  const s = (site ?? {}) as Record<string, unknown>;

  const order = Object.keys(LABELS);
  const rows: SeoRow[] = await Promise.all(
    ((pages ?? []) as Array<Record<string, unknown>>)
      .filter((p) => String(p.path) in LABELS)
      .sort((a, b) => order.indexOf(String(a.path)) - order.indexOf(String(b.path)))
      .map(async (p) => {
        const path = String(p.path);
        const draft = byPath.get(path);
        const patch = (draft?.patch ?? {}) as Record<string, unknown>;
        const pick = <T,>(key: string, live: T): T => (key in patch ? (patch[key] as T) : live);

        return {
          path,
          label: LABELS[path],
          title: pick<string | null>("title", (p.title as string | null) ?? null) ?? "",
          description: pick<string | null>("description", (p.description as string | null) ?? null) ?? "",
          ogImage: await resolveOg(
            db,
            pick<string | null>("og_media_id", (p.og_media_id as string | null) ?? null),
          ),
          staged: Boolean(draft),
        };
      }),
  );

  const siteOgId =
    (siteDraft?.patch.og_media_id as string | undefined) ?? (s.og_media_id as string | null) ?? null;

  return (
    <SeoEditor
      rows={rows}
      siteName={String(s.name ?? "")}
      health={health}
      ogOptions={ogOptions}
      siteOgImage={await resolveOg(db, siteOgId)}
    />
  );
}

/**
 * The four numbers on the health panel. Every one of them is something an
 * editor can go and fix, and each links to the screen where they'd fix it —
 * a warning with no next step is just a nag.
 */
async function seoHealth(db: Awaited<ReturnType<typeof supabaseServer>>): Promise<SeoHealth> {
  const [noDescription, noAlt, noPoster] = await Promise.all([
    // Counted against credits that are actually VISIBLE, and only where the
    // wording would genuinely help — a credit with no poster is hidden anyway,
    // so nagging about its description is noise.
    db
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("published", true)
      .not("still_media_id", "is", null)
      .is("trailer_url", null),
    db.from("media").select("id", { count: "exact", head: true }).is("alt", null),
    db
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("published", true)
      .is("still_media_id", null),
  ]);

  return {
    projectsMissingTrailer: noDescription.count ?? 0,
    imagesMissingAlt: noAlt.count ?? 0,
    projectsMissingPoster: noPoster.count ?? 0,
  };
}
