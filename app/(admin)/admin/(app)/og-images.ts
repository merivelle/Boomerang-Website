import "server-only";
import type { DB } from "@/lib/cms/admin-helpers";
import type { PickableImage } from "@/components/admin/ImageField";
import { mediaUrl, type MediaRef } from "./work/formData";

/** Every image that can serve as a sharing picture, for the library picker. */
export async function ogLibrary(db: DB): Promise<PickableImage[]> {
  const { data } = await db
    .from("media")
    .select("id,legacy_public_path,bucket,object_path,width,height,alt")
    .in("kind", ["og", "still"])
    .order("created_at", { ascending: false })
    .limit(60);

  return ((data ?? []) as Array<MediaRef & { id: string; width: number; height: number; alt: string | null }>)
    .map((m) => ({
      id: m.id,
      url: mediaUrl(m) ?? "",
      alt: m.alt,
      width: m.width,
      height: m.height,
    }))
    .filter((m) => m.url);
}

/** One media id to a URL. Null in, null out. */
export async function resolveOg(db: DB, id: string | null): Promise<string | null> {
  if (!id) return null;
  const { data } = await db
    .from("media")
    .select("legacy_public_path,bucket,object_path")
    .eq("id", id)
    .maybeSingle();
  return data ? mediaUrl(data as MediaRef) : null;
}
