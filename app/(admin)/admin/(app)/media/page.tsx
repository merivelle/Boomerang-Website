import { supabaseServer } from "@/lib/supabase/server";
import { mediaUsage } from "@/lib/cms/media-usage";
import { MediaLibrary, type MediaItem } from "@/components/admin/MediaLibrary";
import { mediaUrl } from "../work/formData";

export const dynamic = "force-dynamic";
export const metadata = { title: "Photos" };

type Row = {
  id: string;
  kind: MediaItem["kind"];
  bucket: string | null;
  object_path: string | null;
  legacy_public_path: string | null;
  width: number;
  height: number;
  bytes: number;
  mime: string;
  alt: string | null;
  created_at: string;
};

export default async function MediaPage() {
  const db = await supabaseServer();

  const [{ data }, usage] = await Promise.all([
    db
      .from("media")
      .select("id,kind,bucket,object_path,legacy_public_path,width,height,bytes,mime,alt,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    mediaUsage(db),
  ]);

  const items: MediaItem[] = ((data ?? []) as unknown as Row[]).map((m) => ({
    id: m.id,
    kind: m.kind,
    url: mediaUrl(m) ?? "",
    // A file that ships with the site rather than living in the library. It can
    // be described and reused, but not deleted from here.
    builtIn: Boolean(m.legacy_public_path),
    width: m.width,
    height: m.height,
    bytes: m.bytes,
    mime: m.mime,
    alt: m.alt,
    addedAt: m.created_at,
    usedBy: usage.get(m.id) ?? [],
  }));

  return <MediaLibrary items={items} />;
}
