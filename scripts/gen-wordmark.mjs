// Hero wordmark strip.
//
// The mobile hero sets BOOMERANG over two lines and shows the current slate
// *inside* the letterforms — the word is a window onto the films, not a label
// above them. This builds that window.
//
// Two triptychs, three films each. The component stacks them and cross-dissolves
// between the pair, so at any moment three films fill the word in clean left /
// centre / right thirds. Each triptych is one composited file rather than three
// backgrounds: the word reads as a single continuous window, and a phone fetches
// one image per state instead of three.
//
// The grade runs the opposite way to the rest of the site. Everywhere else
// stills are pushed down (`brightness-[0.5]`) so type can sit over them; here
// they sit *inside* thin letterforms on black, and a dark frame just reads as a
// solid letter. So they get brighter and harder.
//
// Requires ffmpeg on PATH. Run from the repo root: `npm run wordmark`.
// Re-run whenever the hero slate changes: `npm run wordmark -- --force`.

import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const STILLS = join(ROOT, "public", "assets", "stills");
const OUT_DIR = join(ROOT, "public", "assets", "hero");

// One third of the wordmark block is roughly 112 × 154 at 375px. These are 2×
// that, so the mask stays sharp on a retina phone.
//
// CROP_ASPECT must equal CELL_W / CELL_H. Crop to the cell's shape first and
// only then scale, or a 16:9 frame gets squeezed into a portrait box — the whole
// point of this treatment is frames that are cropped, never distorted.
const CELL_W = 240;
const CELL_H = 320;
const CROP_ASPECT = (CELL_W / CELL_H).toFixed(4); // 0.75

const GRADE = "eq=brightness=0.16:contrast=1.45:saturation=1.10";

// Read the slate from content/projects.ts rather than keeping a second copy of
// it here — the strip must always be the films the hero actually shows.
function heroSlugs() {
  const src = readFileSync(join(ROOT, "content", "projects.ts"), "utf8");
  const block = src.match(/export const HERO_SLUGS = \[([\s\S]*?)\]/);
  if (!block) throw new Error("HERO_SLUGS not found in content/projects.ts");
  return [...block[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
}

// Films 1–3 are the resting state, 4–6 the one it dissolves to.
const GROUPS = [
  { name: "a", from: 0 },
  { name: "b", from: 3 },
];

function main() {
  const force = process.argv.includes("--force");
  const slugs = heroSlugs();
  if (slugs.length < 6) {
    console.error(`Need 6 hero slugs to build two triptychs, found ${slugs.length}.`);
    process.exit(1);
  }
  const missing = slugs.filter((s) => !existsSync(join(STILLS, `${s}.jpg`)));
  if (missing.length) {
    console.error(`Missing stills: ${missing.join(", ")}`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  for (const group of GROUPS) {
    const out = join(OUT_DIR, `wordmark-${group.name}.jpg`);
    const cells = slugs.slice(group.from, group.from + 3);

    if (existsSync(out) && !force) {
      console.log(`- wordmark-${group.name}.jpg exists — pass --force to rebuild.`);
      continue;
    }

    const inputs = cells.flatMap((s) => ["-i", join(STILLS, `${s}.jpg`)]);
    const chains = cells
      .map((_, i) => `[${i}:v]crop=ih*${CROP_ASPECT}:ih,scale=${CELL_W}:${CELL_H}[c${i}]`)
      .join(";");
    const joined = cells.map((_, i) => `[c${i}]`).join("");
    const filter = `${chains};${joined}hstack=inputs=3,${GRADE}[out]`;

    execFileSync(
      "ffmpeg",
      [...inputs, "-filter_complex", filter, "-map", "[out]", "-frames:v", "1", "-q:v", "5", "-y", out],
      { stdio: ["ignore", "ignore", "pipe"] },
    );

    const kb = statSync(out).size / 1000;
    const warn = kb > 70 ? "  ⚠ over 70 KB — raise -q:v" : "";
    console.log(
      `+ assets/hero/wordmark-${group.name}.jpg  ${kb.toFixed(0)} KB  ` +
        `${CELL_W * 3}×${CELL_H}  ${cells.join(" | ")}${warn}`,
    );
  }
}

main();
