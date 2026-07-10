// Global site copy & facts. Edit here to update the site — no component changes needed.

export const site = {
  name: "Boomerang",
  wordmark: "boomerang",
  founder: "Mark Hannah",
  role: "Composer & Owner",
  location: "Burbank · Los Angeles",

  // The founder's own voice. Used on the About page only — nowhere is there an
  // invented tagline. The site's words are film titles, studios, the company
  // name, and facts that can be checked.
  positioning:
    "Film is the marathon. The trailer is the hundred-metre dash. I score both.",

  intro:
    "Boomerang is a trailer-music, scoring and sound-design house. Orchestral, electronic, hard rock, post-rock, and experimental sound design — built to move an audience in ninety seconds.",

  // Above-the-fold credibility (Zealot pattern).
  // Non-breaking hyphens (U+2011) keep "Spider‑Man" from splitting across lines.
  stats: [
    { value: "1,000+", label: "Trailer placements" },
    { value: "X‑Men · Spider‑Man", label: "Franchise origins" },
    { value: "Oscars · Olympics", label: "Broadcast telecasts" },
  ],

  bio: [
    "Mark Hannah founded Boomerang Music in Los Angeles and launched it alongside the X-Men and Spider-Man franchises. Two decades and more than a thousand placements later, his music and sound design have shaped campaigns for blockbusters, Academy Award–winning films, animated features, video games, and broadcast events including the Oscars and the Olympic Games.",
    "The work spans orchestral scores, electronic textures, hard rock, post-rock, and experimental sound design — whatever the cut demands. Every piece is built for the specific job of a trailer: tension, release, and a moment you remember.",
  ],

  quote: {
    text: "The difference between film and trailer is that film is the marathon runner, the trailer is the hundred-metre dash guy — and I love creating music and sound design for both.",
    attribution: "Mark Hannah",
  },

  contact: {
    phone: "310.801.4142",
    phoneHref: "tel:+13108014142",
    email: "info@boomerang-music.com", // TODO: confirm real inbox
    instagram: "boomerangmusicofficial",
    instagramHref: "https://www.instagram.com/boomerangmusicofficial/",
  },

  nav: [
    { label: "Work", href: "/work" },
    { label: "Clients", href: "/clients" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
} as const;
