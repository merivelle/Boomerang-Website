// The client wall — studio / network / streaming / games / brand logos.
// `logo` points to a normalized white PNG in /public/assets/logos/<logo>.png.
// Clients without a usable logo file render as a text wordmark.

export type Client = { name: string; slug: string; logo?: string };
export type ClientGroup = { label: string; clients: Client[] };

const c = (name: string, slug: string, logo?: string): Client => ({ name, slug, logo });

export const clientGroups: ClientGroup[] = [
  {
    label: "Studios",
    clients: [
      c("Universal", "universal", "universal"),
      c("Sony Pictures", "sony", "sony"),
      c("Paramount", "paramount", "paramount"),
      c("Walt Disney", "disney", "disney"),
      c("Lionsgate", "lionsgate", "lionsgate"),
      c("Marvel", "marvel", "marvel"),
      c("Focus Features", "focus-features", "focus"),
      c("NEON", "neon", "neon"),
      c("Amazon Studios", "amazon-studios", "amazon"),
      c("Warner Bros.", "warner-bros", "warner-bros"),
      c("20th Century", "20th-century", "20th-century"),
      c("TriStar", "tristar", "tristar"),
    ],
  },
  {
    label: "Networks",
    clients: [
      c("HBO", "hbo", "hbo"),
      c("NBC", "nbc", "nbc"),
      c("FX", "fx", "fx"),
      c("AMC", "amc", "amc"),
      c("A&E", "ae", "ae"),
      c("Cinemax", "cinemax", "cinemax"),
      c("Travel Channel", "travel-channel"),
    ],
  },
  {
    label: "Streaming",
    clients: [
      c("Netflix", "netflix", "netflix"),
      c("Apple TV", "apple-tv", "appletv"),
      c("Hulu", "hulu", "hulu"),
    ],
  },
  {
    label: "Production",
    clients: [
      c("Village Roadshow", "village-roadshow"),
      c("FilmNation", "filmnation"),
      c("LAIKA", "laika"),
    ],
  },
  {
    label: "Games",
    clients: [
      c("Ubisoft", "ubisoft"),
      c("SEGA", "sega"),
      c("Electronic Arts", "ea"),
      c("Eidos Montréal", "eidos"),
      c("BioWare", "bioware"),
      c("Bethesda", "bethesda"),
      c("Activision", "activision"),
      c("THQ", "thq"),
    ],
  },
  {
    label: "Brands",
    clients: [c("Alfa Romeo", "alfa-romeo")],
  },
];

// Just the clients that have a real logo — for the homepage marquee.
export const logoClients: Client[] = clientGroups
  .flatMap((g) => g.clients)
  .filter((x) => x.logo);

// Text-only fallback list (used elsewhere if needed).
export const clientMarquee = clientGroups.flatMap((g) =>
  g.clients.map((x) => x.name),
);
