// Tone-graded placeholder generator.
//
// Every credit in content/projects.ts renders /assets/stills/<slug>.jpg. Real
// film frames are dropped in over time; until then this fills the gap with a
// dark, cinematic graded frame derived from the project's `tone` (0–1). It only
// writes files that DON'T already exist, so real stills are never overwritten —
// drop a real frame at the same path and it simply wins. Re-run any time credits
// are added: `npm run placeholders`.
//
// Requires `sharp` (already a dependency). Run from the repo root.

import { readFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const PROJECTS = join(ROOT, "content", "projects.ts");
const OUT = join(ROOT, "public", "assets", "stills");
const W = 1600;
const H = 900;

// Pull { slug, tone } out of each one-line project entry. Every project sits on
// its own line, so a per-line regex is enough — no TS parsing needed.
function readProjects() {
  const src = readFileSync(PROJECTS, "utf8");
  const out = [];
  for (const line of src.split("\n")) {
    const slug = line.match(/slug:\s*"([^"]+)"/);
    if (!slug) continue;
    const tone = line.match(/tone:\s*([0-9.]+)/);
    out.push({ slug: slug[1], tone: tone ? parseFloat(tone[1]) : 0.4 });
  }
  return out;
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// tone 0 → cold near-black; tone 1 → warmer graded charcoal. Very low saturation
// keeps it in the same desaturated register as the real stills at rest.
function svgFor(tone) {
  const t = clamp(tone, 0, 1);
  const hue = Math.round(220 - t * 190); // 220 (cool) → 30 (warm)
  const sat = (8 + t * 6).toFixed(1); // 8% → 14%
  const lTop = (9 + t * 13).toFixed(1); // brighter corner
  const lMid = (6 + t * 9).toFixed(1);
  const lBot = (3 + t * 5).toFixed(1); // near-black corner
  const c = (l) => `hsl(${hue}, ${sat}%, ${l}%)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c(lTop)}"/>
      <stop offset="0.55" stop-color="${c(lMid)}"/>
      <stop offset="1" stop-color="${c(lBot)}"/>
    </linearGradient>
    <radialGradient id="v" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0.55" stop-color="rgba(0,0,0,0)"/>
      <stop offset="1" stop-color="rgba(0,0,0,0.55)"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.05"/>
  <rect width="${W}" height="${H}" fill="url(#v)"/>
</svg>`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const existing = new Set(readdirSync(OUT));
  const projects = readProjects();

  let made = 0;
  let skipped = 0;
  for (const { slug, tone } of projects) {
    const name = `${slug}.jpg`;
    if (existing.has(name)) {
      skipped++;
      continue;
    }
    const buf = Buffer.from(svgFor(tone));
    await sharp(buf).jpeg({ quality: 82, mozjpeg: true }).toFile(join(OUT, name));
    made++;
    console.log(`+ ${name}  (tone ${tone})`);
  }
  console.log(`\nplaceholders: ${made} created, ${skipped} already had a still, ${projects.length} total credits.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
