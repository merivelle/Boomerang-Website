// Favicon and share image, generated from the B mark so they cannot drift from
// the site's own artwork. Run once, or after the logo changes:
//   node scripts/gen-brand-assets.mjs

import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const MARK = join(ROOT, "public/assets/logo/boom-b.png");
const INK = { r: 11, g: 11, b: 11 }; // matches themeColor and the oklch(14%) ink

const mark = await readFile(MARK);

// ---- favicon: the B, centred on ink, square -------------------------------
const ICON = 512;
const glyph = await sharp(mark).resize({ height: Math.round(ICON * 0.62), fit: "inside" }).toBuffer();
const icon = await sharp({ create: { width: ICON, height: ICON, channels: 4, background: INK } })
  .composite([{ input: glyph, gravity: "centre" }])
  .png()
  .toBuffer();
await writeFile(join(ROOT, "app/icon.png"), icon);
await writeFile(join(ROOT, "app/apple-icon.png"), await sharp(icon).resize(180, 180).png().toBuffer());

// ---- share image: 1200x630, the mark plus the name ------------------------
const W = 1200, H = 630;
const shareGlyph = await sharp(mark).resize({ height: 200, fit: "inside" }).toBuffer();
const wordmark = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
     <text x="${W / 2}" y="${H / 2 + 130}" text-anchor="middle"
           font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
           font-size="60" letter-spacing="14" fill="#f7f7f7">BOOMERANG</text>
     <text x="${W / 2}" y="${H / 2 + 186}" text-anchor="middle"
           font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
           font-size="21" letter-spacing="7" fill="#8a8a8a">TRAILER MUSIC · SCORING · SOUND DESIGN</text>
   </svg>`,
);
const og = await sharp({ create: { width: W, height: H, channels: 4, background: INK } })
  .composite([
    { input: shareGlyph, top: 150, left: Math.round(W / 2 - 60) },
    { input: wordmark, top: 0, left: 0 },
  ])
  .jpeg({ quality: 88, mozjpeg: true })
  .toBuffer();

await mkdir(join(ROOT, "public"), { recursive: true });
await writeFile(join(ROOT, "public/og.jpg"), og);

console.log(`app/icon.png          ${(icon.length / 1024).toFixed(0)} KB  ${ICON}x${ICON}`);
console.log(`app/apple-icon.png    180x180`);
console.log(`public/og.jpg         ${(og.length / 1024).toFixed(0)} KB  ${W}x${H}`);
