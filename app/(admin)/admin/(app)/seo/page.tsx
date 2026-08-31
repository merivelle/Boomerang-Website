import { supabaseServer } from "@/lib/supabase/server";
import { SeoEditor, type SeoRow } from "@/components/admin/SeoEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "SEO" };

// Only the pages an editor should be writing copy for. /work/[slug] does not
// exist yet, so per-credit SEO stays hidden rather than inviting descriptions
// that nothing reads.
const LABELS: Record<string, string> = {
  "/": "Homepage",
  "/work": "Work",
  "/clients": "Clients",
  "/about": "About",
  "/contact": "Contact",
};

export default async function SeoPage() {
  const db = await supabaseServer();
  const [{ data: pages }, { data: site }] = await Promise.all([
    db.from("seo_pages").select("path,title,description").order("path"),
    db.from("site_settings").select("name").eq("id", 1).single(),
  ]);

  const order = Object.keys(LABELS);
  const rows: SeoRow[] = ((pages ?? []) as Array<{ path: string; title: string | null; description: string | null }>)
    .filter((p) => p.path in LABELS)
    .sort((a, b) => order.indexOf(a.path) - order.indexOf(b.path))
    .map((p) => ({
      path: p.path,
      label: LABELS[p.path],
      title: p.title ?? "",
      description: p.description ?? "",
    }));

  return <SeoEditor rows={rows} siteName={(site as { name: string }).name} />;
}
