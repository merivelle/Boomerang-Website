// Prove the migration was lossless.
//
// Layer 1 of the three in the plan: a derived-value diff. It rebuilds every
// list the site actually renders from content/*.ts, then runs THE EXACT
// QUERIES the new server components will run (imported from lib/cms/sql.ts,
// not rewritten here) and deep-compares them.
//
// Writing separate verification queries would verify nothing.
//
//   node scripts/verify-migration.ts
//
// Layer 2 (the byte-identical HTML diff) is the phase 2 gate and lives in
// scripts/snapshot-pages.sh. Layer 3 (media checksums) runs at the end here.

import { deepStrictEqual } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";

import {
  projects,
  featured,
  HERO_SLUGS,
  PLACEHOLDER_SLUGS,
  OSCAR_SLUGS,
  CATEGORIES,
  projectsWithStills,
  getProject,
} from "../content/projects.ts";
import { clientGroups, logoClients } from "../content/clients.ts";
import { site } from "../content/site.ts";

import {
  getWorkProjects,
  getHomeGrid,
  getHeroColumns,
  getFeatured,
  getCategories,
  getClientGroups,
  getLogoClients,
  getSite,
  getSiteCredits,
  getNav,
  type FetchOpts,
} from "../lib/cms/sql.ts";

const URL = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error("Set SUPABASE_URL and a Supabase key (see .env.example).");
  process.exit(1);
}

/** Plain fetch. The Next wrapper adds cache tags; the shape of the call is identical. */
const fetcher = async (path: string, opts: FetchOpts) =>
  fetch(`${URL}/rest/v1${path}`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      ...(opts.count ? { Prefer: "count=exact" } : {}),
    },
  });

let failures = 0;
let checks = 0;

function check(name: string, actual: unknown, expected: unknown) {
  checks++;
  try {
    deepStrictEqual(actual, expected);
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL ${name}`);
    const err = e as { actual?: unknown; expected?: unknown };
    console.log(`       expected: ${JSON.stringify(err.expected)?.slice(0, 220)}`);
    console.log(`       actual:   ${JSON.stringify(err.actual)?.slice(0, 220)}`);
  }
}

/** The identity of a credit as the site renders it, ignoring storage details. */
const canon = (p: {
  slug: string; title: string; studio: string; year: number; role: string;
  mood: string | null; tone: number | null; trailerUrl: string | null;
  category: { label: string }; tags: string[];
}) => ({
  slug: p.slug, title: p.title, studio: p.studio, year: p.year, role: p.role,
  mood: p.mood, tone: p.tone, trailerUrl: p.trailerUrl,
  category: p.category.label, tags: p.tags,
});

const canonOld = (p: (typeof projects)[number]) => ({
  slug: p.slug, title: p.title, studio: p.studio, year: p.year, role: p.role,
  mood: p.mood ?? null, tone: p.tone ?? null, trailerUrl: p.trailerUrl ?? null,
  category: p.category,
  tags: OSCAR_SLUGS.has(p.slug) ? ["oscar-nominees"] : [],
});

async function main() {
  console.log("Layer 1 - derived-value diff\n");

  // -- what /work renders ---------------------------------------------------
  console.log("Work");
  const work = await getWorkProjects(fetcher);
  check("projectsWithStills - count", work.length, projectsWithStills.length);
  check(
    "projectsWithStills - slugs IN ORDER",
    work.map((p) => p.slug),
    projectsWithStills.map((p) => p.slug),
  );
  check("every field of every credit", work.map(canon), projectsWithStills.map(canonOld));
  check(
    "hidden credits stay hidden",
    work.filter((p) => PLACEHOLDER_SLUGS.has(p.slug)).map((p) => p.slug),
    [],
  );

  // -- the homepage contact sheet -------------------------------------------
  console.log("\nHomepage grid");
  const HERO = new Set(HERO_SLUGS);
  const REST = projectsWithStills.filter((p) => !HERO.has(p.slug));
  const home = await getHomeGrid(fetcher, 24);
  // The badge WorkGallery renders is REST.length (55), not the 24 rows shown.
  check("total - the count in the badge", home.total, REST.length);
  check(
    "HOME - 24 slugs IN ORDER",
    home.rows.map((p) => p.slug),
    REST.slice(0, 24).map((p) => p.slug),
  );

  // -- curated order --------------------------------------------------------
  console.log("\nCuration");
  const hero = await getHeroColumns(fetcher);
  check("hero - 6 slugs IN SLOT ORDER", hero.map((p) => p.slug), [...HERO_SLUGS]);
  check(
    "hero - every column resolves (today a typo silently drops one)",
    hero.length,
    HERO_SLUGS.map(getProject).filter(Boolean).length,
  );

  const feat = await getFeatured(fetcher);
  // File order, not year order: The Revenant (2015) is row 01, Cocaine Bear (2023) is 02.
  check("featured - 5 slugs IN CURATED ORDER", feat.map((p) => p.slug), featured.map((p) => p.slug));
  check("featured - all have a hover clip", feat.filter((p) => p.clip).length, 5);

  // -- filters --------------------------------------------------------------
  console.log("\nFilters");
  const cats = await getCategories(fetcher);
  check("categories - labels IN CHIP ORDER", cats.map((c) => c.label), [...CATEGORIES]);
  check(
    "oscar-nominees - tagged count",
    work.filter((p) => p.tags.includes("oscar-nominees")).length,
    // 4 of the 35 are on placeholders and so are invisible today.
    [...OSCAR_SLUGS].filter((s) => !PLACEHOLDER_SLUGS.has(s)).length,
  );

  // -- clients --------------------------------------------------------------
  console.log("\nClients");
  const groups = await getClientGroups(fetcher);
  check("groups - labels IN ORDER", groups.map((g) => g.label), clientGroups.map((g) => g.label));
  check(
    "clients - names IN ORDER, per group",
    groups.map((g) => g.clients.map((c) => c.name)),
    clientGroups.map((g) => g.clients.map((c) => c.name)),
  );
  const logos = await getLogoClients(fetcher);
  check("logoClients - names IN ORDER", logos.map((c) => c.name), logoClients.map((c) => c.name));
  // ClientsMarquee renders [...logoClients, ...logoClients] and translates -50%,
  // so the track is always an even 2x by construction - the source count itself
  // is free to be odd (it is 21). What must hold is that the DB returns exactly
  // the same set the file did, or the two halves stop matching.
  check("logoClients - count matches source exactly", logos.length, logoClients.length);
  check("logoClients - every logo resolves to a file", logos.filter((c) => !c.logo?.url).length, 0);
  check(
    "logo paths survived the logo-key-vs-slug mismatch",
    logos.map((c) => c.logo!.url),
    logoClients.map((c) => `/assets/logos/${c.logo}.png`),
  );

  // -- site copy ------------------------------------------------------------
  console.log("\nSite");
  const s = await getSite(fetcher);
  check("bio", s.bio, site.bio);
  check("intro", s.intro, site.intro);
  check("founder / role / location", [s.founder, s.role, s.location], [site.founder, site.role, site.location]);
  check("contact", [s.phone, s.phoneHref, s.instagramUrl], [site.contact.phone, site.contact.phoneHref, site.contact.instagramHref]);
  check("credits lead-in", s.creditsLead, site.credits.lead);
  check("credit titles IN ORDER", await getSiteCredits(fetcher), [...site.credits.titles]);
  check("nav IN ORDER", (await getNav(fetcher)).map((n) => `${n.label}|${n.href}`), site.nav.map((n) => `${n.label}|${n.href}`));
  // The anti-scrape guarantee: site_public has no email column at all.
  check("contact email is NOT in the public view", "email" in (s as object), false);
  check(
    "no field of site_public contains the address",
    Object.values(s).some((v) => typeof v === "string" && v.includes("@")),
    false,
  );

  // -- layer 3: media manifest ---------------------------------------------
  console.log("\nLayer 3 - media manifest");
  const res = await fetcher("/media?select=legacy_public_path,checksum,kind", {});
  const rows = (await res.json()) as Array<{ legacy_public_path: string; checksum: string; kind: string }>;
  const byPath = new Map(rows.map((r) => [r.legacy_public_path, r]));

  let files = 0;
  let mismatched: string[] = [];
  for (const dir of ["assets/stills", "assets/logos", "assets/trailers", "assets/hero"]) {
    const abs = join(process.cwd(), "public", dir);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs)) {
      if (name.startsWith(".")) continue;
      const file = join(abs, name);
      if (!statSync(file).isFile()) continue;
      files++;
      const path = `/${dir}/${name}`;
      const sum = createHash("sha256").update(readFileSync(file)).digest("hex");
      if (byPath.get(path)?.checksum !== sum) mismatched.push(path);
    }
  }
  check("every asset on disk is recorded, byte for byte", mismatched, []);
  check("asset count", rows.length, files);
  check(
    "placeholder count - the credits hidden from the site",
    rows.filter((r) => r.kind === "placeholder").length,
    PLACEHOLDER_SLUGS.size,
  );

  console.log(
    `\n${failures === 0 ? "PASS" : "FAIL"} - ${checks - failures}/${checks} checks passed.`,
  );
  if (failures) {
    console.log("\nThe migration is NOT lossless. Do not start phase 2.");
    process.exit(1);
  }
  console.log("Migration is lossless for every value the site renders.");
}

main().catch((e) => {
  console.error("\nFAILED: " + (e as Error).message);
  process.exit(1);
});
