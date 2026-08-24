// Hover-loop clip encoder.
//
// Every credit marked `featured` in content/projects.ts plays a short silent
// loop behind the Selected Work index while its row is hovered. This turns a
// full trailer into that loop: a ~10s cut, no audio track, 1280px wide, small
// enough to start playing the moment someone's cursor lands on the row.
//
// Source trailers live in /trailers (gitignored, never served). Outputs land in
// /public/assets/trailers/<slug>.mp4, which IS committed. Like the placeholder
// generator, this only writes files that don't already exist — pass --force to
// re-encode. Run from the repo root: `npm run clips`.
//
// Requires ffmpeg on PATH.
//
// WHICH ten seconds to use is an editorial call, so it lives here rather than
// being guessed: set `start` to the second the cut should open on. Preview a
// candidate without encoding the whole set by passing a slug:
//   npm run clips -- the-revenant --force

import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "trailers");
const OUT = join(ROOT, "public", "assets", "trailers");

// slug → which trailer in /trailers to cut, and the moment to cut from.
//
// `match` is a case-insensitive substring of the filename rather than the whole
// name: trailers downloaded from YouTube arrive with the video title as their
// filename, full of fullwidth ｜ and ： characters that differ per download.
// `start` is seconds into the trailer; `duration` is the length of the loop.
//
// The chosen moments avoid title cards and studio idents, and favour wide,
// slow shots — the clip plays under list type behind a scrim, so a busy cut
// fights the text.
const CLIPS = [
  // Snowbound vista, then into the trees. Matches the "Awe" mood on the credit.
  { slug: "the-revenant", match: "Revenant", start: 15, duration: 10 },
  // Forest wides mid-chase — mid-tone, so it survives the 0.5 brightness grade.
  { slug: "cocaine-bear", match: "Cocaine Bear", start: 75, duration: 10 },
  // The figure at the end of the lamplit driveway. Starts past the daylit
  // interior at ~73s, which breaks the dread.
  { slug: "us", match: "Us - Official", start: 78, duration: 10 },
  // Eiffel plaza wide into the red-lit street. Clears the "2023" card at ~75s.
  { slug: "john-wick-4", match: "John Wick", start: 80, duration: 10 },
  // Backlit crowd into Rocket. Ends before the "Next summer" card at ~59s.
  { slug: "guardians-of-the-galaxy", match: "Guardians of the Galaxy", start: 48, duration: 8 },
];

// 1280px wide at CRF 26 lands around 1.5–2 MB for ten seconds. `-an` drops the
// audio track: browsers only autoplay muted video, and it halves the file.
// `+faststart` moves the moov atom to the front so playback can begin before
// the download finishes — the whole point of a hover loop.
function encode({ slug, input, start, duration }) {
  const output = join(OUT, `${slug}.mp4`);
  execFileSync(
    "ffmpeg",
    [
      "-ss", String(start),
      "-i", input,
      "-t", String(duration),
      "-an",
      "-vf", "scale=1280:-2,fps=24",
      "-c:v", "libx264",
      "-profile:v", "high",
      "-crf", "26",
      "-preset", "slow",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-y", output,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  return output;
}

function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.find((a) => !a.startsWith("--"));

  mkdirSync(OUT, { recursive: true });
  const wanted = only ? CLIPS.filter((c) => c.slug === only) : CLIPS;
  if (only && wanted.length === 0) {
    console.error(`No clip defined for "${only}". Known: ${CLIPS.map((c) => c.slug).join(", ")}`);
    process.exit(1);
  }

  const sources = existsSync(SRC_DIR)
    ? readdirSync(SRC_DIR).filter((f) => /\.(mp4|mov|mkv|webm)$/i.test(f))
    : [];

  let made = 0;
  let skipped = 0;
  let missing = 0;

  for (const clip of wanted) {
    const output = join(OUT, `${clip.slug}.mp4`);
    if (existsSync(output) && !force) {
      skipped++;
      continue;
    }
    const hits = sources.filter((f) =>
      f.toLowerCase().includes(clip.match.toLowerCase()),
    );
    if (hits.length === 0) {
      console.log(`- ${clip.slug}  no file in trailers/ matching "${clip.match}"`);
      missing++;
      continue;
    }
    if (hits.length > 1) {
      console.log(`! ${clip.slug}  "${clip.match}" matches ${hits.length} files — narrow it:\n    ${hits.join("\n    ")}`);
      missing++;
      continue;
    }
    try {
      encode({ ...clip, input: join(SRC_DIR, hits[0]) });
    } catch (e) {
      console.error(`! ${clip.slug}  ffmpeg failed\n${e.stderr?.toString().trim().split("\n").slice(-4).join("\n")}`);
      missing++;
      continue;
    }
    const mb = statSync(output).size / 1e6;
    const warn = mb > 3 ? "  ⚠ over 3 MB — raise crf or shorten the cut" : "";
    console.log(`+ ${clip.slug}.mp4  ${mb.toFixed(1)} MB  (from ${clip.start}s, ${clip.duration}s)${warn}`);
    made++;
  }

  console.log(
    `\nclips: ${made} encoded, ${skipped} already present, ${missing} missing a source.`,
  );
  if (missing) {
    console.log(
      `Drop the full trailers into trailers/ — the CLIPS list at the top of this script matches them by name substring,\n` +
      `then re-run. Rows without a clip keep showing their still — nothing breaks.`,
    );
  }
}

main();
