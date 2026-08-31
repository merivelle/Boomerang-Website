import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// The mobile hero shows the slate *inside* the BOOMERANG letterforms — the word
// is a window onto the films, not a label above them. Two triptychs of three,
// cross-dissolved, so three films fill the word at any moment.
//
// This is scripts/gen-wordmark.mjs's ffmpeg graph ported to sharp, so the strip
// can be rebuilt the moment an editor changes the hero rather than requiring a
// developer to run a command with ffmpeg installed.
//
//   crop=ih*0.75:ih, scale=240:320   ->  resize(240, 320, { fit: "cover" })
//   hstack=inputs=3                  ->  composite onto a 720x320 canvas
//   eq=brightness=.16:contrast=1.45  ->  linear(a, b), see below
//      :saturation=1.10              ->  modulate({ saturation })

const CELL_W = 240;
const CELL_H = 320;

// ffmpeg's eq is out = (in - 0.5) * contrast + 0.5 + brightness, on 0–1 values.
// sharp's linear is out = in * a + b on 0–255, so:
//   a = contrast
//   b = 255 * (0.5 - 0.5 * contrast + brightness)
const CONTRAST = 1.45;
const BRIGHTNESS = 0.16;
const SATURATION = 1.1;
const LINEAR_A = CONTRAST;
const LINEAR_B = 255 * (0.5 - 0.5 * CONTRAST + BRIGHTNESS);

/**
 * The grade runs opposite to the rest of the site. Everywhere else stills are
 * pushed down so type can sit over them; here they sit inside thin letterforms
 * on black, where a dark frame just reads as a solid letter. So: brighter and
 * harder.
 */
async function cell(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes)
    .rotate()
    // cover crops to the cell's shape before scaling, which is the whole point:
    // frames are cropped, never squeezed.
    .resize(CELL_W, CELL_H, { fit: "cover", position: "centre" })
    .modulate({ saturation: SATURATION })
    .linear(LINEAR_A, LINEAR_B)
    .toBuffer();
}

/** Fetch a still's bytes whether it is a committed asset or an uploaded one. */
export async function stillBytes(url: string): Promise<Buffer> {
  if (url.startsWith("/")) {
    return readFile(join(process.cwd(), "public", url.replace(/^\//, "")));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not read ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** One triptych: three stills side by side, graded, as a single 720x320 JPEG. */
export async function buildTriptych(urls: string[]): Promise<Buffer> {
  if (urls.length !== 3) throw new Error("A triptych needs exactly 3 films.");

  const cells = await Promise.all(urls.map(async (u) => cell(await stillBytes(u))));

  return sharp({
    create: {
      width: CELL_W * 3,
      height: CELL_H,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite(cells.map((input, i) => ({ input, left: i * CELL_W, top: 0 })))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
