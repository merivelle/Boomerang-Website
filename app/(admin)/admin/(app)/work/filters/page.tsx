import { supabaseServer } from "@/lib/supabase/server";
import { listDrafts } from "@/lib/cms/drafts";
import { categoryUsage, loadTaxonomy, tagUsage } from "@/lib/cms/taxonomy";
import { FiltersEditor, type FilterRow } from "@/components/admin/FiltersEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Work filters" };

export default async function WorkFiltersPage() {
  const db = await supabaseServer();
  const drafts = await listDrafts(db);

  const [tax, catUse, tagUse] = await Promise.all([
    loadTaxonomy(db, drafts),
    categoryUsage(db, drafts),
    tagUsage(db, drafts),
  ]);

  const categories: FilterRow[] = tax.categories.map((c) => ({ ...c, films: catUse.get(c.id) ?? 0 }));
  const tags: FilterRow[] = tax.tags.map((t) => ({ ...t, films: tagUse.get(t.id) ?? 0 }));

  return <FiltersEditor categories={categories} tags={tags} />;
}
