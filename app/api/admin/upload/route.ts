import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { currentUser, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { stageDraft } from "@/lib/cms/drafts";

export const runtime = "nodejs";
// Uploads are normalized with sharp, which needs real memory and time.
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * One route for every image the site uses.
 *
 * Storage and the media row go through the SERVICE ROLE, after the editor has
 * been authenticated above. That is a deliberate widening: the storage policies
 * in 0003_rls.sql restrict the `logos` bucket to developers, which made managing
 * the client wall impossible for the person whose job it is. `clip` is not in
 * KINDS and is not reachable here, so the developer-only rule still holds for
 * the one bucket where it was actually protecting something.
 */
const KINDS = {
  still: {
    bucket: "stills",
    accept: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"],
    // Deliberately wide, and identical to the database CHECK. It exists to
    // reject a portrait poster, not to enforce 16:9: the site already renders
    // stills from 1.33 to 2.76 and absorbs all of it with aspect-video.
    aspect: [1.3, 2.8] as [number, number],
    maxWidth: 2560,
    format: "jpeg" as const,
    keepOriginal: true,
  },
  logo: {
    bucket: "logos",
    accept: ["image/png", "image/webp", "image/svg+xml"],
    aspect: null,
    maxWidth: 1000,
    // PNG, not JPEG: a client logo is a white mark that has to sit on the dark
    // wall without a rectangle of background around it.
    format: "png" as const,
    keepOriginal: false,
  },
  og: {
    bucket: "og",
    accept: ["image/jpeg", "image/png", "image/webp"],
    aspect: null,
    maxWidth: 1200,
    format: "jpeg" as const,
    keepOriginal: false,
  },
} as const;

type Kind = keyof typeof KINDS;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return bad("Your session expired. Sign in again.", 401);

  const form = await request.formData();
  const file = form.get("file");
  const kind = (String(form.get("kind") ?? "still") || "still") as Kind;
  // "project:the-revenant" | "client:<uuid>" | "seo:/about" | "site" | ""
  const target = String(form.get("target") ?? "").trim();

  if (!(file instanceof File)) return bad("No file was received.");
  if (!(kind in KINDS)) return bad("That kind of image isn't supported here.");

  const spec = KINDS[kind];

  if (file.size > MAX_BYTES)
    return bad(`That image is ${(file.size / 1048576).toFixed(1)} MB. The limit is 25 MB.`);
  if (!spec.accept.includes(file.type as never))
    return bad(
      kind === "logo"
        ? "Logos need to be a PNG, WebP or SVG — ideally a white logo on a transparent background."
        : "That file isn't an image we can use. Try a JPG or PNG.",
    );

  const original = Buffer.from(await file.arrayBuffer());

  let normalized: Buffer;
  let width: number;
  let height: number;
  let mime: string;
  let extension: string;
  let lqip: string | null = null;

  if (file.type === "image/svg+xml") {
    // An SVG is stored untouched — rasterising a vector logo would throw away
    // the only reason to have supplied one.
    normalized = original;
    mime = "image/svg+xml";
    extension = "svg";
    const box = svgDimensions(original.toString("utf8"));
    width = box.width;
    height = box.height;
  } else {
    // .rotate() first, with no argument: it bakes in the EXIF orientation flag.
    // Without it a photo taken on a phone arrives sideways and every later
    // measurement is wrong.
    const upright = sharp(original).rotate();
    const meta = await upright.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (!w || !h) return bad("That image couldn't be read.");

    if (spec.aspect) {
      const aspect = w / h;
      if (aspect < spec.aspect[0])
        return bad(
          "That image is too tall — the site needs a wide, landscape frame like a film still. " +
            "Try a screenshot from the trailer rather than a poster.",
        );
      if (aspect > spec.aspect[1]) return bad("That image is too wide and letterboxed to use.");
    }

    const resized = upright.resize({ width: spec.maxWidth, withoutEnlargement: true });

    normalized =
      spec.format === "png"
        ? // Strips every metadata block by default, and keeps the alpha channel
          // that makes a logo usable on a dark background.
          await resized.png({ compressionLevel: 9, palette: true }).toBuffer()
        : await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();

    const out = await sharp(normalized).metadata();
    width = out.width ?? w;
    height = out.height ?? h;
    mime = spec.format === "png" ? "image/png" : "image/jpeg";
    extension = spec.format === "png" ? "png" : "jpg";

    const lqipBuf = await sharp(normalized)
      .resize(16, null, { fit: "inside" })
      .webp({ quality: 40 })
      .toBuffer();
    lqip = `data:image/webp;base64,${lqipBuf.toString("base64")}`;
  }

  const checksum = createHash("sha256").update(normalized).digest("hex");
  const stem = target.includes(":") ? slugPart(target) : kind;
  const objectPath = `${stem}-${checksum.slice(0, 8)}.${extension}`;

  const admin = supabaseAdmin();
  const up = await admin.storage
    .from(spec.bucket)
    .upload(objectPath, normalized, { contentType: mime, upsert: true });
  if (up.error) return bad("The image couldn't be saved. Try again.", 502);

  if (spec.keepOriginal) {
    // 1 GB free against 25 MB of current assets is enormous headroom, and it is
    // the redo path if the normalization above ever turns out to have been
    // wrong for a particular image.
    await admin.storage
      .from("originals")
      .upload(`${stem}-${checksum.slice(0, 8)}`, original, {
        contentType: file.type,
        upsert: true,
      });
  }

  const { data: media, error: mediaError } = await admin
    .from("media")
    .insert({
      kind,
      bucket: spec.bucket,
      object_path: objectPath,
      width,
      height,
      bytes: normalized.byteLength,
      mime,
      lqip,
      alt: null,
      checksum,
      created_by: user.id,
    } as never)
    .select("id")
    .single();

  if (mediaError || !media) return bad("The image saved but couldn't be recorded.", 502);
  const mediaId = (media as { id: string }).id;

  // Attaching it is a STAGED change like any other, so the website keeps showing
  // the old image until someone publishes. The upload itself is not staged —
  // an unused image in the library is harmless, and it means the editor can see
  // what they uploaded straight away.
  const attached = await attach(target, mediaId, kind);
  if (attached) return bad(attached, 400);

  return NextResponse.json({
    ok: true,
    mediaId,
    width,
    height,
    bytes: normalized.byteLength,
    staged: Boolean(target),
  });
}

// ------------------------------------------------------------------ helpers --

const slugPart = (target: string) =>
  target.split(":").slice(1).join(":").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-|-$/g, "") ||
  "image";

async function attach(target: string, mediaId: string, kind: Kind): Promise<string | null> {
  if (!target) return null;
  const [what, ...rest] = target.split(":");
  const key = rest.join(":");
  const db = await supabaseServer();

  if (what === "project" && kind === "still") {
    const { data } = await db.from("projects").select("title").eq("slug", key).maybeSingle();
    const res = await stageDraft({
      table: "projects",
      rowKey: key,
      patch: { still_media_id: mediaId, _focal: null },
      label: (data as { title: string } | null)?.title ?? key,
      summary: "Changed the poster",
    });
    return res.ok ? null : res.error;
  }

  if (what === "client" && kind === "logo") {
    const { data } = await db.from("clients").select("name").eq("id", key).maybeSingle();
    const res = await stageDraft({
      table: "clients",
      rowId: key,
      patch: { logo_media_id: mediaId },
      label: (data as { name: string } | null)?.name ?? "Client",
      summary: "Changed the logo",
    });
    return res.ok ? null : res.error;
  }

  if (what === "seo" && kind === "og") {
    const res = await stageDraft({
      table: "seo_pages",
      rowKey: key,
      patch: { og_media_id: mediaId },
      label: pageName(key),
      summary: "Changed the sharing image",
    });
    return res.ok ? null : res.error;
  }

  if (what === "site" && kind === "og") {
    const res = await stageDraft({
      table: "site_settings",
      rowKey: "site",
      patch: { og_media_id: mediaId },
      label: "Site settings",
      summary: "Changed the default sharing image",
    });
    return res.ok ? null : res.error;
  }

  return "That image couldn't be attached. Tell your developer.";
}

const PAGE_NAMES: Record<string, string> = {
  "/": "Homepage",
  "/work": "Work",
  "/clients": "Clients",
  "/about": "About",
  "/contact": "Contact",
};
const pageName = (path: string) => PAGE_NAMES[path] ?? path;

/**
 * An SVG has no pixel dimensions, but the media table needs a positive width and
 * height. Read them from the markup, and fall back to a square: the number is
 * only ever used to describe the file in the library, never to lay it out.
 */
function svgDimensions(svg: string): { width: number; height: number } {
  const viewBox = svg.match(/viewBox\s*=\s*["']\s*[\d.-]+[ ,]+[\d.-]+[ ,]+([\d.]+)[ ,]+([\d.]+)/i);
  if (viewBox) {
    const w = Math.round(Number(viewBox[1]));
    const h = Math.round(Number(viewBox[2]));
    if (w > 0 && h > 0) return { width: w, height: h };
  }
  const w = Number(svg.match(/\bwidth\s*=\s*["']([\d.]+)/i)?.[1] ?? 0);
  const h = Number(svg.match(/\bheight\s*=\s*["']([\d.]+)/i)?.[1] ?? 0);
  if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
  return { width: 512, height: 512 };
}
