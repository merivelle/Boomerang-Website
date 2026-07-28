// The credit wall. Each entry is one placement.
// Typos from the old site are fixed here (The Revenant, Zack Snyder's, The Handmaid's Tale, Spider-Man).
//
// To add a credit: copy a block, give it a unique `slug`, and drop a landscape
// still into /public/assets/stills/<slug>.jpg (optional — a tuned placeholder
// shows until then). `trailerUrl` should link to an OFFICIAL host only.
// `audio` should point to a CLEARED cue in /public/assets/audio/ — never studio footage.

export type Category =
  | "Film"
  | "Series"
  | "Superhero"
  | "Horror"
  | "Games"
  | "Branded";

export const CATEGORIES: Category[] = [
  "Film",
  "Series",
  "Superhero",
  "Horror",
  "Games",
  "Branded",
];

export type Project = {
  slug: string;
  title: string;
  category: Category;
  studio: string;
  year: number;
  role: string;
  mood: string;
  composer?: string;
  featured?: boolean;
  // Optional media — layout is designed to look intentional without them.
  still?: string; // /assets/stills/<slug>.jpg
  audio?: string; // /assets/audio/<slug>.mp3  (cleared cues only)
  trailerUrl?: string; // official host only
  // Placeholder tone (0–1) used to tune the graded-frame placeholder.
  tone?: number;
};

export const projects: Project[] = [
  // — Featured / signature —
  { slug: "the-odyssey", title: "The Odyssey", category: "Film", studio: "Universal", year: 2026, role: "Trailer Campaign", mood: "Awe", featured: true, tone: 0.62 },
  { slug: "the-mandalorian-and-grogu", title: "The Mandalorian and Grogu", category: "Film", studio: "Lucasfilm", year: 2026, role: "Trailer Campaign", mood: "Wonder", featured: true, tone: 0.4 },
  { slug: "nope", title: "NOPE", category: "Horror", studio: "Universal", year: 2022, role: "Trailer Campaign", mood: "Dread", featured: true, tone: 0.3 },
  { slug: "sinners", title: "Sinners", category: "Horror", studio: "Warner Bros.", year: 2025, role: "Trailer Campaign", mood: "Fury", featured: true, tone: 0.34 },
  { slug: "killers-of-the-flower-moon", title: "Killers of the Flower Moon", category: "Film", studio: "Apple / Paramount", year: 2023, role: "Trailer Campaign", mood: "Elegy", featured: true, tone: 0.5 },
  { slug: "barbie", title: "Barbie", category: "Film", studio: "Warner Bros.", year: 2023, role: "Trailer Campaign", mood: "Momentum", featured: true, tone: 0.72 },

  // — Current slate (Hero columns). Studios/years marked TODO are best guesses
  //   pending confirmation; stills drop in at /public/assets/stills/<slug>.jpg. —
  { slug: "the-hunger-games", title: "The Hunger Games", category: "Film", studio: "Lionsgate", year: 2026, role: "Trailer Campaign", mood: "Defiance", tone: 0.34 },
  { slug: "the-dog-stars", title: "The Dog Stars", category: "Film", studio: "20th Century", year: 2026, role: "Trailer Campaign", mood: "Solitude", tone: 0.5 }, // TODO: confirm studio
  { slug: "the-end-of-oak-street", title: "The End of Oak Street", category: "Film", studio: "Independent", year: 2025, role: "Trailer Campaign", mood: "Reverie", tone: 0.56 }, // TODO: confirm studio + year
  { slug: "masters-of-the-universe", title: "Masters of the Universe", category: "Film", studio: "Amazon MGM", year: 2026, role: "Trailer Campaign", mood: "Power", tone: 0.44 }, // TODO: confirm studio

  // — Film —
  { slug: "john-wick-4", title: "John Wick: Chapter 4", category: "Film", studio: "Lionsgate", year: 2023, role: "Trailer Campaign", mood: "Fury", tone: 0.28 },
  { slug: "the-irishman", title: "The Irishman", category: "Film", studio: "Netflix", year: 2019, role: "Trailer Campaign", mood: "Elegy", tone: 0.42 },
  { slug: "roma", title: "Roma", category: "Film", studio: "Netflix", year: 2018, role: "Trailer Campaign", mood: "Grief", tone: 0.55 },
  { slug: "the-revenant", title: "The Revenant", category: "Film", studio: "20th Century", year: 2015, role: "Trailer Campaign", mood: "Awe", tone: 0.6 },
  { slug: "dunkirk", title: "Dunkirk", category: "Film", studio: "Warner Bros.", year: 2017, role: "Trailer Campaign", mood: "Tension", tone: 0.58 },
  { slug: "1917", title: "1917", category: "Film", studio: "Universal", year: 2019, role: "Trailer Campaign", mood: "Tension", tone: 0.44 },
  { slug: "past-lives", title: "Past Lives", category: "Film", studio: "A24", year: 2023, role: "Trailer Campaign", mood: "Reverie", tone: 0.66 },
  { slug: "inception", title: "Inception", category: "Film", studio: "Warner Bros.", year: 2010, role: "Trailer Campaign", mood: "Awe", tone: 0.36 },
  { slug: "mad-max-fury-road", title: "Mad Max: Fury Road", category: "Film", studio: "Warner Bros.", year: 2015, role: "Trailer Campaign", mood: "Fury", tone: 0.7 },
  { slug: "the-trial-of-the-chicago-7", title: "The Trial of the Chicago 7", category: "Film", studio: "Netflix", year: 2020, role: "Trailer Campaign", mood: "Momentum", tone: 0.48 },
  { slug: "cocaine-bear", title: "Cocaine Bear", category: "Film", studio: "Universal", year: 2023, role: "Trailer Campaign", mood: "Momentum", tone: 0.4 },
  { slug: "the-color-purple", title: "The Color Purple", category: "Film", studio: "Warner Bros.", year: 2023, role: "Trailer Campaign", mood: "Triumph", tone: 0.6 },
  { slug: "glass-onion", title: "Glass Onion: A Knives Out Mystery", category: "Film", studio: "Netflix", year: 2022, role: "Trailer Campaign", mood: "Momentum", tone: 0.58 },
  { slug: "elvis", title: "Elvis", category: "Film", studio: "Warner Bros.", year: 2022, role: "Trailer Campaign", mood: "Rapture", tone: 0.58 },
  { slug: "imaginary", title: "Imaginary", category: "Horror", studio: "Lionsgate", year: 2024, role: "Trailer Campaign", mood: "Dread", tone: 0.3 },

  // — Series —
  { slug: "3-body-problem", title: "3 Body Problem", category: "Series", studio: "Netflix", year: 2024, role: "Trailer Campaign", mood: "Dread", tone: 0.3 },
  { slug: "breaking-bad", title: "Breaking Bad", category: "Series", studio: "AMC", year: 2013, role: "Trailer Campaign", mood: "Tension", tone: 0.5 },
  { slug: "game-of-thrones", title: "Game of Thrones", category: "Series", studio: "HBO", year: 2019, role: "Trailer Campaign", mood: "Awe", tone: 0.38 },
  { slug: "the-walking-dead", title: "The Walking Dead", category: "Series", studio: "AMC", year: 2018, role: "Trailer Campaign", mood: "Dread", tone: 0.32 },
  { slug: "the-handmaids-tale", title: "The Handmaid's Tale", category: "Series", studio: "Hulu", year: 2021, role: "Trailer Campaign", mood: "Grief", tone: 0.44 },
  { slug: "the-underground-railroad", title: "The Underground Railroad", category: "Series", studio: "Amazon", year: 2021, role: "Trailer Campaign", mood: "Elegy", tone: 0.4 },

  // — Superhero —
  { slug: "guardians-of-the-galaxy", title: "Guardians of the Galaxy Vol. 3", category: "Superhero", studio: "Marvel", year: 2023, role: "Trailer Campaign", mood: "Triumph", tone: 0.52 },
  { slug: "loki", title: "Loki", category: "Superhero", studio: "Marvel", year: 2021, role: "Trailer Campaign", mood: "Wonder", tone: 0.46 },
  { slug: "wandavision", title: "WandaVision", category: "Superhero", studio: "Marvel", year: 2021, role: "Trailer Campaign", mood: "Reverie", tone: 0.5 },
  { slug: "zack-snyders-justice-league", title: "Zack Snyder's Justice League", category: "Superhero", studio: "Warner Bros.", year: 2021, role: "Trailer Campaign", mood: "Awe", tone: 0.3 },
  { slug: "the-dark-knight", title: "The Dark Knight", category: "Superhero", studio: "Warner Bros.", year: 2008, role: "Trailer Campaign", mood: "Dread", tone: 0.28 },
  { slug: "the-amazing-spider-man", title: "The Amazing Spider-Man", category: "Superhero", studio: "Sony", year: 2012, role: "Trailer Campaign", mood: "Momentum", tone: 0.48 },

  // — Horror —
  { slug: "us", title: "Us", category: "Horror", studio: "Universal", year: 2019, role: "Trailer Campaign", mood: "Dread", tone: 0.26 },
  { slug: "midsommar", title: "Midsommar", category: "Horror", studio: "A24", year: 2019, role: "Trailer Campaign", mood: "Tension", tone: 0.68 },
  { slug: "a-quiet-place", title: "A Quiet Place", category: "Horror", studio: "Paramount", year: 2018, role: "Trailer Campaign", mood: "Tension", tone: 0.36 },
  { slug: "knives-out", title: "Knives Out", category: "Film", studio: "Lionsgate", year: 2019, role: "Trailer Campaign", mood: "Momentum", tone: 0.5 },
  { slug: "m3gan", title: "M3GAN", category: "Horror", studio: "Universal", year: 2023, role: "Trailer Campaign", mood: "Dread", tone: 0.34 },
  { slug: "promising-young-woman", title: "Promising Young Woman", category: "Film", studio: "Focus Features", year: 2020, role: "Trailer Campaign", mood: "Fury", tone: 0.64 },

  // — Games —
  { slug: "assassins-creed", title: "Assassin's Creed", category: "Games", studio: "Ubisoft", year: 2020, role: "Trailer Campaign", mood: "Awe", tone: 0.4 },
  { slug: "call-of-duty-modern-warfare", title: "Call of Duty: Modern Warfare", category: "Games", studio: "Activision", year: 2019, role: "Trailer Campaign", mood: "Fury", tone: 0.3 },

  // — Branded —
  { slug: "cirque-du-soleil", title: "Cirque du Soleil", category: "Branded", studio: "Cirque du Soleil", year: 2019, role: "Sound Design", mood: "Wonder", tone: 0.56 },
  { slug: "oscars-2016", title: "The 88th Academy Awards", category: "Branded", studio: "ABC", year: 2016, role: "Broadcast", mood: "Triumph", tone: 0.6 },

  // — Archive — the wider trailer wall (from boomerang-music.com). No stills yet;
  //   each shows a tone-graded placeholder until a real frame is dropped in. —
  { slug: "dumb-money", title: "Dumb Money", category: "Film", studio: "Sony", year: 2023, role: "Trailer Campaign", mood: "Momentum", tone: 0.6 },
  { slug: "spotlight", title: "Spotlight", category: "Film", studio: "Open Road Films", year: 2015, role: "Trailer Campaign", mood: "Tension", tone: 0.42 },
  { slug: "jackie", title: "Jackie", category: "Film", studio: "Fox Searchlight", year: 2016, role: "Trailer Campaign", mood: "Grief", tone: 0.5 },
  { slug: "brooklyn", title: "Brooklyn", category: "Film", studio: "Fox Searchlight", year: 2015, role: "Trailer Campaign", mood: "Reverie", tone: 0.64 },
  { slug: "there-will-be-blood", title: "There Will Be Blood", category: "Film", studio: "Paramount Vantage", year: 2007, role: "Trailer Campaign", mood: "Dread", tone: 0.34 },
  { slug: "silence", title: "Silence", category: "Film", studio: "Paramount", year: 2016, role: "Trailer Campaign", mood: "Elegy", tone: 0.4 },
  { slug: "creed", title: "Creed", category: "Film", studio: "MGM", year: 2015, role: "Trailer Campaign", mood: "Triumph", tone: 0.44 },
  { slug: "a-beautiful-day-in-the-neighborhood", title: "A Beautiful Day in the Neighborhood", category: "Film", studio: "Sony", year: 2019, role: "Trailer Campaign", mood: "Reverie", tone: 0.66 },
  { slug: "ad-astra", title: "Ad Astra", category: "Film", studio: "20th Century", year: 2019, role: "Trailer Campaign", mood: "Awe", tone: 0.3 },
  { slug: "let-him-go", title: "Let Him Go", category: "Film", studio: "Focus Features", year: 2020, role: "Trailer Campaign", mood: "Tension", tone: 0.4 },
  { slug: "enola-holmes", title: "Enola Holmes", category: "Film", studio: "Netflix", year: 2020, role: "Trailer Campaign", mood: "Momentum", tone: 0.6 },
  { slug: "onward", title: "Onward", category: "Film", studio: "Disney / Pixar", year: 2020, role: "Trailer Campaign", mood: "Wonder", tone: 0.58 },
  { slug: "unhinged", title: "Unhinged", category: "Film", studio: "Solstice Studios", year: 2020, role: "Trailer Campaign", mood: "Fury", tone: 0.32 },
  { slug: "the-post", title: "The Post", category: "Film", studio: "20th Century", year: 2017, role: "Trailer Campaign", mood: "Tension", tone: 0.48 },
  { slug: "lion", title: "Lion", category: "Film", studio: "The Weinstein Company", year: 2016, role: "Trailer Campaign", mood: "Grief", tone: 0.52 },
  { slug: "fantastic-beasts", title: "Fantastic Beasts and Where to Find Them", category: "Film", studio: "Warner Bros.", year: 2016, role: "Trailer Campaign", mood: "Wonder", tone: 0.42 },
  { slug: "minions", title: "Minions", category: "Film", studio: "Universal", year: 2015, role: "Trailer Campaign", mood: "Momentum", tone: 0.72 },
  { slug: "the-secret-life-of-pets", title: "The Secret Life of Pets", category: "Film", studio: "Universal", year: 2016, role: "Trailer Campaign", mood: "Momentum", tone: 0.7 },
  { slug: "cinderella", title: "Cinderella", category: "Film", studio: "Disney", year: 2015, role: "Trailer Campaign", mood: "Wonder", tone: 0.68 },
  { slug: "the-bfg", title: "The BFG", category: "Film", studio: "Disney", year: 2016, role: "Trailer Campaign", mood: "Wonder", tone: 0.6 },
  { slug: "gravity", title: "Gravity", category: "Film", studio: "Warner Bros.", year: 2013, role: "Trailer Campaign", mood: "Tension", tone: 0.36 },
  { slug: "argo", title: "Argo", category: "Film", studio: "Warner Bros.", year: 2012, role: "Trailer Campaign", mood: "Tension", tone: 0.46 },
  { slug: "hugo", title: "Hugo", category: "Film", studio: "Paramount", year: 2011, role: "Trailer Campaign", mood: "Wonder", tone: 0.5 },
  { slug: "dawn-of-the-planet-of-the-apes", title: "Dawn of the Planet of the Apes", category: "Film", studio: "20th Century", year: 2014, role: "Trailer Campaign", mood: "Dread", tone: 0.34 },
  { slug: "127-hours", title: "127 Hours", category: "Film", studio: "Fox Searchlight", year: 2010, role: "Trailer Campaign", mood: "Tension", tone: 0.5 },
  { slug: "zero-dark-thirty", title: "Zero Dark Thirty", category: "Film", studio: "Sony", year: 2012, role: "Trailer Campaign", mood: "Tension", tone: 0.36 },
  { slug: "no-country-for-old-men", title: "No Country for Old Men", category: "Film", studio: "Miramax", year: 2007, role: "Trailer Campaign", mood: "Dread", tone: 0.4 },
  { slug: "snake-eyes", title: "Snake Eyes: G.I. Joe Origins", category: "Film", studio: "Paramount", year: 2021, role: "Trailer Campaign", mood: "Fury", tone: 0.34 },
  { slug: "at-the-gates", title: "At the Gates", category: "Horror", studio: "Saban Films", year: 2023, role: "Trailer Campaign", mood: "Dread", tone: 0.3 }, // TODO confirm studio/year
  { slug: "knock-at-the-cabin", title: "Knock at the Cabin", category: "Horror", studio: "Universal", year: 2023, role: "Trailer Campaign", mood: "Dread", tone: 0.3 },
  { slug: "it", title: "IT", category: "Horror", studio: "Warner Bros.", year: 2017, role: "Trailer Campaign", mood: "Dread", tone: 0.26 },
  { slug: "last-night-in-soho", title: "Last Night in Soho", category: "Horror", studio: "Focus Features", year: 2021, role: "Trailer Campaign", mood: "Dread", tone: 0.44 },
  { slug: "birds-of-prey", title: "Birds of Prey", category: "Superhero", studio: "Warner Bros.", year: 2020, role: "Trailer Campaign", mood: "Fury", tone: 0.5 },
  { slug: "them", title: "Them", category: "Series", studio: "Amazon", year: 2021, role: "Trailer Campaign", mood: "Dread", tone: 0.3 },
  { slug: "nhl", title: "NHL", category: "Branded", studio: "NHL", year: 2020, role: "Broadcast", mood: "Momentum", tone: 0.5 },
];

export const featured = projects.filter((p) => p.featured);
export const getProject = (slug: string) =>
  projects.find((p) => p.slug === slug);

// Newest-first by release year. Stable sort keeps the curated order within a
// year (films only carry `year`, so same-year ties can't be date-ordered).
export const projectsByReleaseNewest: Project[] = [...projects].sort(
  (a, b) => b.year - a.year,
);

// Credits still on a generated tone-placeholder (no real film frame yet). They
// stay in `projects` (the full credit list) but are hidden from the gallery and
// /work until a real still is added. To bring one back: drop the real frame at
// public/assets/stills/<slug>.jpg and delete its slug from this set.
export const PLACEHOLDER_SLUGS = new Set<string>([
  "unhinged",
  "at-the-gates",
  "knock-at-the-cabin",
  "them",
  "dawn-of-the-planet-of-the-apes",
  "snake-eyes",
  "last-night-in-soho",
  "let-him-go",
  "argo",
  "127-hours",
  "birds-of-prey",
  "hugo",
  "nhl",
  "onward",
  "dumb-money",
  "enola-holmes",
  "the-bfg",
  "the-secret-life-of-pets",
  "cinderella",
  "a-beautiful-day-in-the-neighborhood",
  "minions",
]);

// Films with a real still, newest-first — what the gallery and /work show.
export const projectsWithStills: Project[] = projectsByReleaseNewest.filter(
  (p) => !PLACEHOLDER_SLUGS.has(p.slug),
);

// Credits that earned Academy Award nominations. A cross-cutting tag — each film
// keeps its own category — powering the "Oscar Nominees" filter on /work.
export const OSCAR_FILTER = "Oscar Nominees";
export const OSCAR_SLUGS = new Set<string>([
  "killers-of-the-flower-moon",
  "barbie",
  "elvis",
  "past-lives",
  "the-color-purple",
  "glass-onion",
  "the-irishman",
  "roma",
  "1917",
  "the-revenant",
  "dunkirk",
  "mad-max-fury-road",
  "inception",
  "the-dark-knight",
  "the-trial-of-the-chicago-7",
  "promising-young-woman",
  "knives-out",
  "a-quiet-place",
  "spotlight",
  "jackie",
  "brooklyn",
  "silence",
  "creed",
  "ad-astra",
  "the-post",
  "lion",
  "fantastic-beasts",
  "gravity",
  "zero-dark-thirty",
  "no-country-for-old-men",
  "there-will-be-blood",
  // Pre-tagged but currently on placeholder stills (hidden until a real frame):
  "argo",
  "hugo",
  "127-hours",
  "a-beautiful-day-in-the-neighborhood",
]);

export type Studio = {
  name: string;
  films: Project[];
  count: number;
};

// Studios that actually have credits, ranked by how many. Derived from the real
// data — a studio with no listed film simply never appears (no invented rows).
export function groupByStudio(list: Project[] = projects): Studio[] {
  const map = new Map<string, Project[]>();
  for (const p of list) {
    const arr = map.get(p.studio) ?? [];
    arr.push(p);
    map.set(p.studio, arr);
  }
  return [...map.entries()]
    .map(([name, films]) => ({ name, films, count: films.length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
