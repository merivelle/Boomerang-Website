"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createHash } from "node:crypto";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { buildTriptych } from "@/lib/wordmark";

export type CurationResult = { ok: boolean; error?: string };

function publishChanges() {
  revalidateTag("projects");
  revalidateTag("media");
  revalidatePath("/", "layout");
}

/**
 * Rank columns are UNIQUE where not null, so assigning a set in place collides
 * the moment two credits swap positions. Clearing first, in one statement, is
 * both simpler and correct.
 */
async function reassign(column: "hero_rank" | "featured_rank", slugs: string[]) {
  const db = await supabaseServer();

  const { error: clearError } = await db
    .from("projects")
    .update({ [column]: null } as never)
    .not(column, "is", null);
  if (clearError) return { ok: false, error: clearError.message };

  for (let i = 0; i < slugs.length; i++) {
    const { error } = await db
      .from("projects")
      .update({ [column]: i + 1 } as never)
      .eq("slug", slugs[i]);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * The hero is exactly six columns. That is not a preference: HeroC's flex
 * layout is tuned for six, and the mobile wordmark is two triptychs of three.
 */
export async function saveHero(slugs: string[]): Promise<CurationResult> {
  if (slugs.length !== 6)
    return { ok: false, error: `The hero needs exactly 6 films — you have ${slugs.length}.` };
  if (new Set(slugs).size !== 6)
    return { ok: false, error: "The same film is in two slots." };

  const db = await supabaseServer();
  const { data } = await db
    .from("projects")
    .select("slug,title,still_media_id,published")
    .in("slug", slugs);

  const rows = (data ?? []) as Array<{ slug: string; title: string; still_media_id: string | null; published: boolean }>;
  const noPoster = rows.filter((r) => !r.still_media_id);
  if (noPoster.length)
    return { ok: false, error: `${noPoster.map((r) => r.title).join(", ")} needs a poster first.` };
  const hidden = rows.filter((r) => !r.published);
  if (hidden.length)
    return { ok: false, error: `${hidden.map((r) => r.title).join(", ")} is hidden — publish it first.` };

  const res = await reassign("hero_rank", slugs);
  if (!res.ok)
    return { ok: false, error: "That didn't save. Tell your developer if it keeps happening." };

  publishChanges();

  // The phone hero is a baked image of these same six films, so it has to be
  // rebuilt or it silently keeps showing the old slate. Failing here must not
  // fail the save: the desktop hero is already correct, and a stale strip is a
  // far smaller problem than an error on a change that actually applied.
  try {
    await rebuildWordmark(slugs);
    publishChanges();
  } catch (e) {
    return {
      ok: true,
      error:
        "The hero is updated, but the phone version of the lettering couldn't be rebuilt. " +
        "Tell your developer — everything else is live.",
    };
  }

  return { ok: true };
}

/**
 * Rebuild the two triptychs behind the BOOMERANG lettering on phones.
 * Slots 1–3 are the resting state, 4–6 the one it dissolves to, which is why
 * the picker draws that grouping.
 */
async function rebuildWordmark(slugs: string[]) {
  const db = await supabaseServer();
  const { data } = await db
    .from("projects")
    .select(
      `slug,hero_rank,still:media!projects_still_media_id_fkey(legacy_public_path,bucket,object_path)`,
    )
    .not("hero_rank", "is", null)
    .order("hero_rank");

  type Row = {
    slug: string;
    still: { legacy_public_path: string | null; bucket: string | null; object_path: string | null } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const urls = rows.map((r) =>
    r.still?.legacy_public_path ??
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${r.still?.bucket}/${r.still?.object_path}`,
  );
  if (urls.length !== 6) throw new Error("Expected six hero films.");

  const admin = supabaseAdmin();

  for (const [name, from] of [["a", 0], ["b", 3]] as const) {
    const jpeg = await buildTriptych(urls.slice(from, from + 3));
    const checksum = createHash("sha256").update(jpeg).digest("hex");
    // The hash is in the filename so the URL changes when the slate does —
    // otherwise a CDN would keep serving the previous strip.
    const objectPath = `wordmark-${name}-${checksum.slice(0, 8)}.jpg`;

    const up = await admin.storage
      .from("hero")
      .upload(objectPath, jpeg, { contentType: "image/jpeg", upsert: true });
    if (up.error) throw new Error(up.error.message);

    const meta = { kind: "hero", bucket: "hero", object_path: objectPath,
      legacy_public_path: null, width: 720, height: 320,
      bytes: jpeg.byteLength, mime: "image/jpeg", checksum,
      alt: `Boomerang hero lettering ${name.toUpperCase()}` };

    // One row per triptych, matched on alt so a rebuild replaces rather than
    // accumulates. Falls back to insert the first time.
    const existing = await admin.from("media").select("id").eq("alt", meta.alt).maybeSingle();
    if (existing.data) {
      await admin.from("media").update(meta as never).eq("id", (existing.data as { id: string }).id);
    } else {
      await admin.from("media").insert(meta as never);
    }
  }
}

export async function saveFeatured(slugs: string[]): Promise<CurationResult> {
  if (slugs.length < 1) return { ok: false, error: "Selected Work needs at least one film." };

  const db = await supabaseServer();
  const { data } = await db
    .from("projects")
    .select("slug,title,still_media_id,published")
    .in("slug", slugs);

  const rows = (data ?? []) as Array<{ slug: string; title: string; still_media_id: string | null; published: boolean }>;
  const bad = rows.filter((r) => !r.still_media_id || !r.published);
  if (bad.length)
    return {
      ok: false,
      error: `${bad.map((r) => r.title).join(", ")} needs a poster and needs to be published.`,
    };

  const res = await reassign("featured_rank", slugs);
  if (!res.ok)
    return { ok: false, error: "That didn't save. Tell your developer if it keeps happening." };

  publishChanges();
  return { ok: true };
}
