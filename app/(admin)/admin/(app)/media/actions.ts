"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { currentUser, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { friendly } from "@/lib/cms/admin-helpers";
import { mediaUsage } from "@/lib/cms/media-usage";

export type MediaResult = { ok: true } | { ok: false; error: string };

/**
 * Photos are the one part of the admin that is not staged.
 *
 * An image is an asset, not page content: adding one changes nothing on the
 * site until something points at it, and pointing at it IS staged. Describing
 * or removing an unused file has no published version to differ from, so a
 * draft would be ceremony with nothing on the other side of it. The screen says
 * so plainly rather than leaving it to be discovered.
 */
export async function setMediaAlt(id: string, alt: string): Promise<MediaResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const db = await supabaseServer();
  const { error } = await db
    .from("media")
    .update({ alt: alt.trim() || null } as never)
    .eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };

  revalidateTag("media");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteMedia(id: string): Promise<MediaResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const db = await supabaseServer();

  // Re-checked here and not only in the dialog: the list the editor is looking
  // at may be a minute old, and one minute is long enough for someone else to
  // have used this image.
  const usage = (await mediaUsage(db)).get(id) ?? [];
  if (usage.length) {
    const first = usage[0];
    return {
      ok: false,
      error:
        usage.length === 1
          ? `That image is still being used — ${first.where.toLowerCase()} for ${first.label}. Replace it there first.`
          : `That image is still being used in ${usage.length} places. Replace it there first.`,
    };
  }

  const { data } = await db
    .from("media")
    .select("bucket,object_path,legacy_public_path")
    .eq("id", id)
    .maybeSingle();
  const row = data as {
    bucket: string | null;
    object_path: string | null;
    legacy_public_path: string | null;
  } | null;
  if (!row) return { ok: false, error: "That image no longer exists." };

  if (row.legacy_public_path) {
    return {
      ok: false,
      error:
        "That image ships with the website itself rather than living in the photo library, " +
        "so it can't be deleted here. Ask your developer.",
    };
  }

  const { error } = await db.from("media").delete().eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };

  // The row is the record; the file is the copy. Deleting the row first means a
  // failure here leaves an orphan file, which costs a few KB — the other order
  // would leave a row pointing at nothing, which renders a broken image.
  if (row.bucket && row.object_path) {
    await supabaseAdmin().storage.from(row.bucket).remove([row.object_path]);
  }

  revalidateTag("media");
  revalidatePath("/", "layout");
  return { ok: true };
}
