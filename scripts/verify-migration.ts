// Check the live content is structurally sound.
//
//   node scripts/verify-migration.ts              structural invariants only
//   node scripts/verify-migration.ts --baseline   also diff against content/*.ts
//
// It runs THE EXACT QUERIES the server components run (imported from
// lib/cms/sql.ts, not rewritten here) — separate verification queries would
// verify nothing.
//
// --baseline compares the database to the frozen content/*.ts files. That was
// the migration gate and it passed 30/30. It is NOT a regression test any more:
// the moment an editor adds a client or tags a credit, the database is supposed
// to diverge from those files, and a check that fails on correct behaviour is a
// check nobody believes the day it matters. Use it only to re-audit the original
// migration.
//
// The default mode asserts what must hold no matter who edits what — above all
// the ordering, because JS Array.sort is stable and Postgres is not.

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
  mood?: string; tone?: number; trailerUrl?: string;
  category: string; tags: string[];
}) => ({
  slug: p.slug, title: p.title, studio: p.studio, year: p.year, role: p.role,
  mood: p.mood ?? null, tone: p.tone ?? null, trailerUrl: p.trailerUrl ?? null,
  category: p.category, tags: p.tags,
});

const canonOld = (p: (typeof projects)[number]) => ({
  slug: p.slug, title: p.title, studio: p.studio, year: p.year, role: p.role,
  mood: p.mood ?? null, tone: p.tone ?? null, trailerUrl: p.trailerUrl ?? null,
  category: p.category,
  tags: OSCAR_SLUGS.has(p.slug) ? ["oscar-nominees"] : [],
});

const BASELINE = process.argv.includes("--baseline");

async function main() {
  console.log(BASELINE ? "Structural + baseline diff\n" : "Structural invariants\n");

  // -- what /work renders ---------------------------------------------------
  console.log("Work");
  const work = await getWorkProjects(fetcher);
  // Always: the query must return credits newest-first with a stable tiebreak.
  // Without `, sort_index asc` Postgres reshuffles same-year films and the
  // homepage silently shows a different 24.
  const years = work.map((p) => p.year);
  check("work - sorted newest first", [...years].sort((a, b) => b - a), years);
  check("work - every credit has a real poster", work.filter((p) => !p.still).length, 0);
  check("work - every credit is published", work.filter((p) => !p.published).length, 0);

  if (BASELINE) {
    check("baseline - projectsWithStills count", work.length, projectsWithStills.length);
    check(
      "baseline - slugs IN ORDER",
      work.map((p) => p.slug),
      projectsWithStills.map((p) => p.slug),
    );
    check("baseline - every field of every credit", work.map(canon), projectsWithStills.map(canonOld));
    check(
      "baseline - hidden credits stay hidden",
      work.filter((p) => PLACEHOLDER_SLUGS.has(p.slug)).map((p) => p.slug),
      [],
    );
  }

  // -- the homepage contact sheet -------------------------------------------
  console.log("\nHomepage grid");
  const HERO = new Set(HERO_SLUGS);
  const REST = projectsWithStills.filter((p) => !HERO.has(p.slug));
  const home = await getHomeGrid(fetcher, 24);
  // The badge WorkGallery renders is REST.length (55), not the 24 rows shown.
  // The badge counts every non-hero credit; the grid shows 24 of them. Using
  // rows.length for the badge would print a plausible wrong number.
  check("home grid - shows at most 24", home.rows.length <= 24, true);
  check("home grid - total exceeds what is rendered", home.total >= home.rows.length, true);
  check("home grid - no hero film appears twice", home.rows.filter((p) => p.heroRank).length, 0);
  if (BASELINE) {
    check("baseline - badge total", home.total, REST.length);
    check("baseline - HOME 24 slugs IN ORDER", home.rows.map((p) => p.slug), REST.slice(0, 24).map((p) => p.slug));
  }

  // -- curated order --------------------------------------------------------
  console.log("\nCuration");
  const hero = await getHeroColumns(fetcher);
  check("hero - exactly 6 columns", hero.length, 6);
  check("hero - slots are 1..6 with no gaps", hero.map((p) => p.heroRank), [1, 2, 3, 4, 5, 6]);
  check("hero - every column has a poster", hero.filter((p) => !p.still).length, 0);
  if (BASELINE) {
    check("baseline - hero slugs IN SLOT ORDER", hero.map((p) => p.slug), [...HERO_SLUGS]);
    check("baseline - hero resolves", hero.length, HERO_SLUGS.map(getProject).filter(Boolean).length);
  }

  const feat = await getFeatured(fetcher);
  // File order, not year order: The Revenant (2015) is row 01, Cocaine Bear (2023) is 02.
  check("featured - ranks are contiguous from 1", feat.map((p) => p.featuredRank), feat.map((_, i) => i + 1));
  check("featured - every film has a poster", feat.filter((p) => !p.still).length, 0);
  if (BASELINE) {
    check("baseline - featured IN CURATED ORDER", feat.map((p) => p.slug), featured.map((p) => p.slug));
    check("baseline - all featured have a clip", feat.filter((p) => p.clip).length, 5);
  }

  // -- filters --------------------------------------------------------------
  console.log("\nFilters");
  const cats = await getCategories(fetcher);
  check("categories - at least one", cats.length > 0, true);
  check("categories - every credit has one", work.filter((p) => !p.category).length, 0);
  if (BASELINE) {
    check("baseline - category labels IN CHIP ORDER", cats.map((c) => c.label), [...CATEGORIES]);
    check(
      "baseline - oscar tagged count",
      work.filter((p) => p.tags.includes("oscar-nominees")).length,
      [...OSCAR_SLUGS].filter((s) => !PLACEHOLDER_SLUGS.has(s)).length,
    );
  }

  // -- clients --------------------------------------------------------------
  console.log("\nClients");
  const groups = await getClientGroups(fetcher);
  check("client groups - at least one", groups.length > 0, true);
  check(
    "clients - sort order is unique within every group",
    groups.filter((g) => new Set(g.clients.map((c) => c.slug)).size !== g.clients.length).length,
    0,
  );
  const logos = await getLogoClients(fetcher);
  if (BASELINE) {
    check("baseline - group labels IN ORDER", groups.map((g) => g.label), clientGroups.map((g) => g.label));
    check(
      "baseline - client names IN ORDER, per group",
      groups.map((g) => g.clients.map((c) => c.name)),
      clientGroups.map((g) => g.clients.map((c) => c.name)),
    );
    check("baseline - logoClients IN ORDER", logos.map((c) => c.name), logoClients.map((c) => c.name));
  }
  // ClientsMarquee renders [...logoClients, ...logoClients] and translates -50%,
  // so the track is always an even 2x by construction - the source count itself
  // is free to be odd (it is 21). What must hold is that the DB returns exactly
  // the same set the file did, or the two halves stop matching.
  check("logoClients - every logo resolves", logos.filter((c) => !c.logo).length, 0);
  if (BASELINE) {
    check("baseline - logo count matches source", logos.length, logoClients.length);
    check(
      "baseline - logo paths survived the key-vs-slug mismatch",
      logos.map((c) => c.logo!),
      logoClients.map((c) => `/assets/logos/${c.logo}.png`),
    );
  }

  // -- site copy ------------------------------------------------------------
  console.log("\nSite");
  const s = await getSite(fetcher);
  check("site - bio is not empty", s.bio.length > 0, true);
  if (BASELINE) check("baseline - bio", s.bio, site.bio);
  check("site - description is not empty", s.intro.length > 0, true);
  if (BASELINE) check("baseline - intro", s.intro, site.intro);
  check("site - founder is set", s.founder.length > 0, true);
  if (BASELINE) check("baseline - founder/role/location", [s.founder, s.role, s.location], [site.founder, site.role, site.location]);
  check("site - phone link is a tel: URL", !s.phone || !!s.phoneHref?.startsWith("tel:"), true);
  if (BASELINE) check("baseline - contact", [s.phone, s.phoneHref, s.instagramUrl], [site.contact.phone, site.contact.phoneHref, site.contact.instagramHref]);
  if (BASELINE) check("baseline - credits lead-in", s.creditsLead, site.credits.lead);
  check("site - has credit titles", (await getSiteCredits(fetcher)).length > 0, true);
  if (BASELINE) check("baseline - credit titles IN ORDER", await getSiteCredits(fetcher), [...site.credits.titles]);
  if (BASELINE) check("baseline - nav IN ORDER", (await getNav(fetcher)).map((n) => `${n.label}|${n.href}`), site.nav.map((n) => `${n.label}|${n.href}`));
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
  if (BASELINE) check("baseline - asset count", rows.length, files);
  if (BASELINE) {
    check("baseline - placeholder count", rows.filter((r) => r.kind === "placeholder").length, PLACEHOLDER_SLUGS.size);
  }

  console.log(
    `\n${failures === 0 ? "PASS" : "FAIL"} - ${checks - failures}/${checks} checks passed.`,
  );
  if (failures) {
    console.log(
      BASELINE
        ? "\nSomething diverges from content/*.ts. Expected if editors have made changes."
        : "\nA structural invariant is broken. This one is real - investigate.",
    );
    process.exit(1);
  }
  console.log(
    BASELINE
      ? "Live content still matches content/*.ts exactly."
      : "Content is structurally sound.",
  );
}

main().catch((e) => {
  console.error("\nFAILED: " + (e as Error).message);
  process.exit(1);
});
