// Move every piece of site content out of content/*.ts and into Supabase.
//
// This script IMPORTS the real TypeScript modules rather than regex-parsing
// them, which is the mistake gen-placeholders.mjs and gen-wordmark.mjs both
// make. Node runs .ts directly, so content/projects.ts is the literal source.
//
// Idempotent: every table is reconciled against a natural key, so a re-run
// updates in place rather than duplicating. Run it against a throwaway Supabase
// project first.
//
//   node scripts/migrate-to-supabase.ts [--dry-run]

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

import {
  projects,
  featured,
  HERO_SLUGS,
  PLACEHOLDER_SLUGS,
  OSCAR_SLUGS,
  OSCAR_FILTER,
  CATEGORIES,
} from "../content/projects.ts";
import { clientGroups } from "../content/clients.ts";
import { site } from "../content/site.ts";

const DRY = process.argv.includes("--dry-run");
const ROOT = process.cwd();
const PUBLIC = join(ROOT, "public");

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!DRY && (!URL || !KEY)) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).\n" +
      "The service role key bypasses RLS — never give it a NEXT_PUBLIC_ prefix.",
  );
  process.exit(1);
}
const db = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function step(n: string) {
  console.log(`\n-- ${n}`);
}

/**
 * Reconcile `rows` into `table`, matched on `key`. Returns a key -> id map.
 * Explicit select-then-insert-or-update rather than upsert(): several of these
 * natural keys sit behind partial unique indexes, which ON CONFLICT cannot infer.
 */
async function sync<T extends Record<string, unknown>>(
  table: string,
  key: string,
  rows: T[],
  // seo_pages is keyed by `path`; it has no surrogate id column.
  idColumn = "id",
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  if (DRY || !db) {
    rows.forEach((r, i) => ids.set(String(r[key]), `dry-${i}`));
    console.log(`   ${table}: ${rows.length} rows (dry run)`);
    return ids;
  }

  const { data: existing, error } = await db.from(table).select("*");
  if (error) throw new Error(`${table}: ${error.message}`);

  const byKey = new Map((existing ?? []).map((r) => [String(r[key]), r]));
  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const k = String(row[key]);
    const prev = byKey.get(k);

    if (!prev) {
      const { data, error: e } = await db.from(table).insert(row as never).select(idColumn).single();
      if (e) throw new Error(`${table} insert ${k}: ${e.message}`);
      ids.set(k, String((data as unknown as Record<string, unknown>)[idColumn]));
      inserted++;
      continue;
    }

    ids.set(k, String(prev[idColumn]));
    const changed = Object.keys(row).some(
      (f) => JSON.stringify(prev[f] ?? null) !== JSON.stringify(row[f] ?? null),
    );
    if (changed) {
      const { error: e } = await db.from(table).update(row as never).eq(idColumn, prev[idColumn]);
      if (e) throw new Error(`${table} update ${k}: ${e.message}`);
      updated++;
    }
  }

  console.log(`   ${table}: ${inserted} new, ${updated} updated, ${rows.length} total`);
  return ids;
}

// ------------------------------------------------------------------ media --

type MediaRow = {
  kind: string;
  legacy_public_path: string;
  width: number;
  height: number;
  bytes: number;
  mime: string;
  lqip: string | null;
  alt: string | null;
  checksum: string;
};

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

/** ffprobe if it's on PATH; the clips are the only assets sharp cannot read. */
function videoSize(file: string): { width: number; height: number } {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-select_streams", "v:0", "-show_entries",
       "stream=width,height", "-of", "csv=p=0", file],
      { encoding: "utf8" },
    ).trim();
    const [w, h] = out.split(",").map(Number);
    if (w > 0 && h > 0) return { width: w, height: h };
  } catch {
    /* fall through */
  }
  console.warn(`   ! ffprobe unavailable for ${basename(file)} - recording 1920x1080`);
  return { width: 1920, height: 1080 };
}

async function describe(file: string, kind: string, alt: string | null): Promise<MediaRow> {
  const buf = readFileSync(file);
  const ext = extname(file).toLowerCase();

  let width: number;
  let height: number;
  let lqip: string | null = null;

  if (ext === ".mp4") {
    ({ width, height } = videoSize(file));
  } else {
    const meta = await sharp(buf).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
    // A blur placeholder the site does not have today - next/image gets it free.
    const tiny = await sharp(buf).resize(16, null, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
    lqip = `data:image/webp;base64,${tiny.toString("base64")}`;
  }

  return {
    kind,
    legacy_public_path: "/" + file.slice(PUBLIC.length + 1).split("\\").join("/"),
    width,
    height,
    bytes: statSync(file).size,
    mime: MIME[ext] ?? "application/octet-stream",
    lqip,
    alt,
    checksum: createHash("sha256").update(buf).digest("hex"),
  };
}

const titleOf = (slug: string) => projects.find((p) => p.slug === slug)?.title ?? null;

async function collectMedia(): Promise<MediaRow[]> {
  const out: MediaRow[] = [];
  const dirs: Array<[string, (f: string) => string, (f: string) => string | null]> = [
    // Stills split by whether a real film frame exists. This is what reproduces
    // projectsWithStills, and it is a relation rather than a guessable heuristic:
    // four real stills happen to share the placeholders' 1600x900 dimensions.
    ["assets/stills",
      (f) => (PLACEHOLDER_SLUGS.has(basename(f, extname(f))) ? "placeholder" : "still"),
      (f) => titleOf(basename(f, extname(f)))],
    ["assets/logos", () => "logo", (f) => `${basename(f, extname(f))} logo`],
    ["assets/trailers", () => "clip", (f) => titleOf(basename(f, extname(f)))],
    ["assets/hero", () => "hero", () => "Boomerang"],
  ];

  for (const [rel, kindOf, altOf] of dirs) {
    const dir = join(PUBLIC, rel);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).sort()) {
      if (name.startsWith(".")) continue;
      const file = join(dir, name);
      if (!statSync(file).isFile()) continue;
      out.push(await describe(file, kindOf(name), altOf(name)));
    }
  }
  return out;
}

// ------------------------------------------------------------------- main --

async function main() {
  if (DRY) console.log("DRY RUN - nothing will be written.\n");

  step("categories");
  const categoryIds = await sync(
    "categories",
    "slug",
    CATEGORIES.map((label, i) => ({ slug: slugify(label), label, sort_index: i })),
  );

  step("tags");
  const tagIds = await sync("tags", "slug", [
    { slug: "oscar-nominees", label: OSCAR_FILTER, show_in_filters: true, sort_index: 0 },
  ]);

  step("media");
  const mediaRows = await collectMedia();
  const mediaIds = await sync("media", "legacy_public_path", mediaRows);
  const mediaId = (path: string) => mediaIds.get(path) ?? null;

  step("projects");
  // File order is the ordering the whole site depends on: JS Array.sort is
  // stable, so same-year ties fall back to it, and that decides which 24 films
  // the homepage shows. sort_index preserves it; gaps of 10 make a later insert
  // a single-row update.
  const projectRows = projects.map((p, i) => {
    const hasStill = !PLACEHOLDER_SLUGS.has(p.slug);
    const stillPath = `/assets/stills/${p.slug}.jpg`;
    const featuredIndex = featured.findIndex((f) => f.slug === p.slug);
    const heroIndex = HERO_SLUGS.indexOf(p.slug);

    return {
      slug: p.slug,
      title: p.title,
      category_id: categoryIds.get(slugify(p.category))!,
      studio: p.studio,
      year: p.year,
      role: p.role,
      mood: p.mood ?? null,
      tone: p.tone ?? null,
      trailer_url: p.trailerUrl ?? null,
      still_media_id: hasStill ? mediaId(stillPath) : null,
      placeholder_media_id: hasStill ? null : mediaId(stillPath),
      clip_media_id: p.clip ? mediaId(p.clip) : null,
      sort_index: i * 10,
      featured_rank: featuredIndex >= 0 ? featuredIndex + 1 : null,
      hero_rank: heroIndex >= 0 ? heroIndex + 1 : null,
      published: true,
    };
  });
  const projectIds = await sync("projects", "slug", projectRows);

  step("project_tags");
  const oscarTag = tagIds.get("oscar-nominees")!;
  const tagLinks = [...OSCAR_SLUGS]
    .map((slug) => ({ project_id: projectIds.get(slug), tag_id: oscarTag }))
    .filter((r) => r.project_id);
  if (!DRY && db) {
    const { error } = await db.from("project_tags").upsert(tagLinks, {
      onConflict: "project_id,tag_id",
      ignoreDuplicates: true,
    });
    if (error) throw new Error(`project_tags: ${error.message}`);
  }
  console.log(`   project_tags: ${tagLinks.length} links (of ${OSCAR_SLUGS.size} tagged slugs)`);

  step("clients");
  const groupIds = await sync(
    "client_groups",
    "slug",
    clientGroups.map((g, i) => ({ slug: slugify(g.label), label: g.label, sort_index: i })),
  );
  const clientRows = clientGroups.flatMap((g) =>
    g.clients.map((c, j) => ({
      slug: c.slug,
      name: c.name,
      group_id: groupIds.get(slugify(g.label))!,
      // Resolves the three logo-key-vs-slug mismatches (focus-features -> focus.png,
      // apple-tv -> appletv.png, amazon-studios -> amazon.png) with no special case:
      // the FK carries the real path, so the convention that caused them stops existing.
      logo_media_id: c.logo ? mediaId(`/assets/logos/${c.logo}.png`) : null,
      sort_index: j,
      published: true,
    })),
  );
  await sync("clients", "slug", clientRows);

  step("site");
  const settings = {
    id: 1,
    name: site.name,
    wordmark: site.wordmark,
    founder: site.founder,
    role: site.role,
    location: site.location,
    intro: site.intro,
    bio: site.bio,
    positioning: site.positioning,
    canonical_url: "https://www.boomerang-music.com",
    credits_lead: site.credits.lead,
    phone: site.contact.phone,
    phone_href: site.contact.phoneHref,
    instagram_handle: site.contact.instagram,
    instagram_url: site.contact.instagramHref,
    copyright_year: 2026,
  };
  if (!DRY && db) {
    const settingsRes = await db.from("site_settings").upsert(settings as never, { onConflict: "id" });
    if (settingsRes.error) throw new Error(`site_settings: ${settingsRes.error.message}`);

    // Kept out of site_settings on purpose: Postgres has no column-level RLS,
    // and this address must never reach the client bundle.
    const privateRes = await db
      .from("site_private")
      .upsert({ id: 1, contact_email: site.contact.email } as never, { onConflict: "id" });
    if (privateRes.error) throw new Error(`site_private: ${privateRes.error.message}`);
  }
  console.log("   site_settings + site_private: 1 row each");

  await sync(
    "site_credits",
    "title",
    site.credits.titles.map((title, i) => ({ title, sort_index: i })),
  );
  await sync(
    "nav_items",
    "href",
    site.nav.map((n, i) => ({ label: n.label, href: n.href, sort_index: i, enabled: true })),
  );

  step("seo_pages");
  // Copied verbatim from today's metadata exports so launch changes nothing.
  await sync("seo_pages", "path", [
    { path: "/", title: "Boomerang — Trailer Music, Scoring & Sound Design", description: site.intro, noindex: false },
    { path: "/work", title: "Work", description: "Trailer campaigns, scores and sound design across film, series, games and broadcast.", noindex: false },
    { path: "/clients", title: "Clients", description: "Studios, networks, streamers and game publishers Boomerang Music has scored for.", noindex: false },
    { path: "/about", title: "About", description: site.intro, noindex: false },
    { path: "/contact", title: "Contact", description: "Start a conversation with Boomerang Music.", noindex: false },
  ], "path");

  console.log(
    `\nOK ${DRY ? "Dry run complete" : "Migration complete"} - ` +
      `${projectRows.length} credits, ${clientRows.length} clients, ${mediaRows.length} assets.`,
  );
  if (!DRY) console.log("  Now run: npm run verify:migration");
}

main().catch((e) => {
  console.error("\nFAILED: " + e.message);
  process.exit(1);
});
