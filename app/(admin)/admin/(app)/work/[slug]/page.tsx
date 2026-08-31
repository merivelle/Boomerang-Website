import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { WorkForm } from "@/components/admin/WorkForm";
import { formOptions, mediaUrl, PROJECT_SELECT } from "../formData";

export const dynamic = "force-dynamic";

type Media = { legacy_public_path: string | null; bucket: string | null; object_path: string | null };
type Row = {
  slug: string; title: string; studio: string; year: number; role: string;
  trailer_url: string | null; published: boolean;
  featured_rank: number | null; hero_rank: number | null; category_id: string;
  still: Media | null; placeholder: Media | null;
  project_tags: Array<{ tag_id: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await supabaseServer();
  const { data } = await db.from("projects").select("title").eq("slug", slug).single();
  return { title: (data as { title: string } | null)?.title ?? "Work" };
}

export default async function EditWorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await supabaseServer();

  const [{ data }, o] = await Promise.all([
    db.from("projects").select(PROJECT_SELECT).eq("slug", slug).single(),
    formOptions(),
  ]);
  if (!data) notFound();
  const p = data as unknown as Row;

  return (
    <WorkForm
      data={{
        slug: p.slug,
        title: p.title,
        studio: p.studio,
        year: p.year,
        role: p.role,
        categoryId: p.category_id,
        trailerUrl: p.trailer_url ?? "",
        published: p.published,
        featured: p.featured_rank !== null,
        inHero: p.hero_rank !== null,
        tagIds: (p.project_tags ?? []).map((t) => t.tag_id),
        poster: mediaUrl(p.still) ?? mediaUrl(p.placeholder),
        hasRealPoster: !!p.still,
      }}
      {...o}
    />
  );
}
