import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { listDrafts } from "@/lib/cms/drafts";
import { ReviewPublish } from "@/components/admin/ReviewPublish";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Review & publish" };

export default async function PublishPage() {
  const db = await supabaseServer();

  // The publish_log table does not exist until 0006_cms.sql has been run, and a
  // missing "last published" stamp must not be the reason this screen 500s.
  const lastPublished = async () => {
    try {
      const { data } = await db
        .from("publish_log")
        .select("published_at")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as { published_at: string } | null)?.published_at ?? null;
    } catch {
      return null;
    }
  };

  const [drafts, published] = await Promise.all([listDrafts(db), lastPublished()]);

  return (
    <ReviewPublish
      drafts={drafts.map((d) => ({
        id: d.id,
        table: d.table_name,
        op: d.op,
        label: d.label,
        summary: d.summary,
        updatedAt: d.updated_at,
        // Only a credit has a page of its own to look at.
        href:
          d.table_name === "projects" && d.row_key
            ? `/admin/work/${d.row_key}`
            : d.table_name === "categories" || d.table_name === "tags"
              ? "/admin/work/filters"
              : null,
      }))}
      lastPublished={published}
    />
  );
}
