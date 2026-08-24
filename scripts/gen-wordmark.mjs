// Hero wordmark strip.
//
// The mobile hero sets BOOMERANG over two lines and shows the current slate
// *inside* the letterforms — the word is a window onto the films, not a label
// above them. This builds that window: the six hero stills joined into one
// horizontal strip, which the component uses as a single background under
// `background-clip: text`.
//
// One composited image rather than six backgrounds, for two reasons: the word
// reads as one continuous object instead of six tiles, and a phone fetches one
// file instead of six.
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
const OUT = join(ROOT, "public", "assets", "hero", "wordmark-strip.jpg");

// 2× the rendered size, so the mask stays sharp on a retina phone.
const CELL_W = 220;
const CELL_H = 440;

const GRADE = "eq=brightness=0.16:contrast=1.45:saturation=1.10";

// Read the slate from HeroC rather than keeping a second copy of it here — the
// strip must always be the films the hero actually shows.
function heroSlugs() {
  const src = readFileSync(join(ROOT, "components", "home", "HeroC.tsx"), "utf8");
  const block = src.match(/const HERO_SLUGS = \[([\s\S]*?)\]/);
  if (!block) throw new Error("HERO_SLUGS not found in components/home/HeroC.tsx");
  return [...block[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
}

function main() {
  const force = process.argv.includes("--force");
  if (existsSync(OUT) && !force) {
    console.log("wordmark-strip.jpg already exists — pass --force to rebuild.");
    return;
  }

  const slugs = heroSlugs();
  const missing = slugs.filter((s) => !existsSync(join(STILLS, `${s}.jpg`)));
  if (missing.length) {
    console.error(`Missing stills: ${missing.join(", ")}`);
    process.exit(1);
  }

  mkdirSync(dirname(OUT), { recursive: true });

  // Centre-crop each landscape still to a portrait slice, then join. 0.62 of the
  // frame height is about the widest slice that still reads as a composition
  // rather than a smear once it's behind a letter.
  const inputs = slugs.flatMap((s) => ["-i", join(STILLS, `${s}.jpg`)]);
  const chains = slugs
    .map((_, i) => `[${i}:v]crop=ih*0.62:ih,scale=${CELL_W}:${CELL_H}[c${i}]`)
    .join(";");
  const joined = slugs.map((_, i) => `[c${i}]`).join("");
  const filter = `${chains};${joined}hstack=inputs=${slugs.length},${GRADE}[out]`;

  execFileSync(
    "ffmpeg",
    [...inputs, "-filter_complex", filter, "-map", "[out]", "-frames:v", "1", "-q:v", "5", "-y", OUT],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  const kb = statSync(OUT).size / 1000;
  const warn = kb > 90 ? "  ⚠ over 90 KB — raise -q:v or drop CELL_W" : "";
  console.log(
    `+ assets/hero/wordmark-strip.jpg  ${kb.toFixed(0)} KB  ` +
      `${CELL_W * slugs.length}×${CELL_H}  (${slugs.join(", ")})${warn}`,
  );
}

main();
