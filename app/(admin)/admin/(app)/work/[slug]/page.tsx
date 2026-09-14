import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getDraft } from "@/lib/cms/drafts";
import { WorkForm } from "@/components/admin/WorkForm";
import { focalOf, formOptions, mediaUrl, PROJECT_SELECT, type MediaRef } from "../formData";

export const dynamic = "force-dynamic";

type Row = {
  slug: string; title: string; studio: string; year: number; role: string;
  trailer_url: string | null; published: boolean;
  seo_title: string | null; seo_description: string | null;
  featured_rank: number | null; hero_rank: number | null; category_id: string;
  still: MediaRef | null; placeholder: MediaRef | null;
  project_tags: Array<{ tag_id: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await supabaseServer();
  const { data } = await db.from("projects").select("title").eq("slug", slug).maybeSingle();
  const draft = await getDraft("projects", { rowKey: slug });
  return { title: (data as { title: string } | null)?.title ?? draft?.label ?? "Work" };
}

export default async function EditWorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await supabaseServer();

  const [{ data }, o, draft] = await Promise.all([
    db.from("projects").select(PROJECT_SELECT).eq("slug", slug).maybeSingle(),
    formOptions(),
    getDraft("projects", { rowKey: slug }),
  ]);

  // A credit can exist as a staged insert with no live row at all, which is
  // what a just-added film is until someone publishes it.
  if (!data && draft?.op !== "insert") notFound();

  const p = (data ?? null) as unknown as Row | null;
  const patch = (draft?.patch ?? {}) as Record<string, unknown>;
  const pick = <T,>(key: string, live: T): T => (key in patch ? (patch[key] as T) : live);

  // A poster staged but not yet published still has to be the one shown here.
  const stagedStillId = typeof patch.still_media_id === "string" ? patch.still_media_id : null;
  let stagedStill: MediaRef | null = null;
  if (stagedStillId) {
    const { data: m } = await db
      .from("media")
      .select("legacy_public_path,bucket,object_path,focal_x,focal_y")
      .eq("id", stagedStillId)
      .maybeSingle();
    stagedStill = (m as MediaRef) ?? null;
  }

  const still = stagedStill ?? p?.still ?? null;
  const stagedFocal = patch._focal as { x: number; y: number } | null | undefined;

  return (
    <WorkForm
      data={{
        slug,
        isNew: draft?.op === "insert",
        hasDraft: Boolean(draft),
        title: pick("title", p?.title ?? draft?.label ?? ""),
        studio: pick("studio", p?.studio ?? ""),
        year: pick("year", p?.year ?? new Date().getFullYear()),
        role: pick("role", p?.role ?? ""),
        categoryId: pick("category_id", p?.category_id ?? ""),
        trailerUrl: pick<string | null>("trailer_url", p?.trailer_url ?? null) ?? "",
        published: pick("published", p?.published ?? false),
        featured: pick("_featured", p?.featured_rank != null),
        inHero: p?.hero_rank != null,
        tagIds: Array.isArray(patch.tags)
          ? (patch.tags as string[])
          : (p?.project_tags ?? []).map((t) => t.tag_id),
        poster: mediaUrl(still) ?? mediaUrl(p?.placeholder ?? null),
        hasRealPoster: Boolean(still),
        // `_focal: null` is how a fresh upload clears the old crop point.
        focal: stagedFocal === undefined ? focalOf(still) : stagedFocal,
        seoTitle: pick<string | null>("seo_title", p?.seo_title ?? null) ?? "",
        seoDescription: pick<string | null>("seo_description", p?.seo_description ?? null) ?? "",
      }}
      {...o}
    />
  );
}
