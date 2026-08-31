import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { currentUser, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Uploads are normalized with sharp, which needs real memory and time.
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_WIDTH = 2560;

// Deliberately wide, and identical to the database CHECK. It exists to reject a
// portrait poster, not to enforce 16:9: the site already renders stills from
// 1.33 to 2.76 and absorbs all of it with aspect-video + object-cover.
const MIN_ASPECT = 1.3;
const MAX_ASPECT = 2.8;

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"];

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return bad("Your session expired. Sign in again.", 401);

  const form = await request.formData();
  const file = form.get("file");
  const slug = String(form.get("slug") ?? "").trim();

  if (!(file instanceof File)) return bad("No file was received.");
  if (!slug) return bad("Missing which credit this poster belongs to.");
  if (file.size > MAX_BYTES)
    return bad(`That image is ${(file.size / 1048576).toFixed(1)} MB. The limit is 25 MB.`);
  if (!ALLOWED.includes(file.type))
    return bad("That file isn't an image we can use. Try a JPG or PNG.");

  const original = Buffer.from(await file.arrayBuffer());

  // .rotate() first, with no argument: it bakes in the EXIF orientation flag.
  // Without it a photo taken on a phone arrives sideways and every later
  // measurement is wrong.
  const upright = sharp(original).rotate();
  const meta = await upright.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return bad("That image couldn't be read.");

  const aspect = w / h;
  if (aspect < MIN_ASPECT) {
    return bad(
      "That image is too tall — the site needs a wide, landscape frame like a film still. " +
        "Try a screenshot from the trailer rather than a poster.",
    );
  }
  if (aspect > MAX_ASPECT) return bad("That image is too wide and letterboxed to use.");

  const normalized = await upright
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    // Strips every metadata block: a still with GPS or IPTC in it is a small
    // privacy leak nobody would ever notice.
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  const out = await sharp(normalized).metadata();
  const lqipBuf = await sharp(normalized).resize(16, null, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  const checksum = createHash("sha256").update(normalized).digest("hex");

  const db = await supabaseServer();
  const { data: project } = await db
    .from("projects")
    .select("id, slug, still_media_id")
    .eq("slug", slug)
    .single();
  if (!project) return bad("That credit no longer exists.");
  const p = project as { id: string; slug: string; still_media_id: string | null };

  // Service role for storage and the media row: the editor is already
  // authenticated above, and this keeps a storage-policy tweak from breaking
  // uploads silently.
  const admin = supabaseAdmin();
  const objectPath = `${slug}-${checksum.slice(0, 8)}.jpg`;

  const up = await admin.storage
    .from("stills")
    .upload(objectPath, normalized, { contentType: "image/jpeg", upsert: true });
  if (up.error) return bad("The image couldn't be saved. Try again.", 502);

  // Keep the untouched upload. 1 GB free against 25 MB of current assets is
  // enormous headroom, and it is the redo path if the normalization above ever
  // turns out to have been wrong for a particular image.
  await admin.storage
    .from("originals")
    .upload(`${slug}-${checksum.slice(0, 8)}`, original, {
      contentType: file.type,
      upsert: true,
    });

  const { data: media, error: mediaError } = await admin
    .from("media")
    .insert({
      kind: "still",
      bucket: "stills",
      object_path: objectPath,
      width: out.width,
      height: out.height,
      bytes: normalized.byteLength,
      mime: "image/jpeg",
      lqip: `data:image/webp;base64,${lqipBuf.toString("base64")}`,
      alt: null,
      checksum,
      created_by: user.id,
    } as never)
    .select("id")
    .single();

  if (mediaError || !media) return bad("The image saved but couldn't be recorded.", 502);

  const { error: linkError } = await admin
    .from("projects")
    .update({ still_media_id: (media as { id: string }).id } as never)
    .eq("id", p.id);
  if (linkError) return bad("The image saved but couldn't be attached to the credit.", 502);

  revalidateTag("projects");
  revalidateTag("media");
  revalidatePath("/", "layout");

  return NextResponse.json({
    ok: true,
    replaced: !!p.still_media_id,
    width: out.width,
    height: out.height,
    bytes: normalized.byteLength,
  });
}
