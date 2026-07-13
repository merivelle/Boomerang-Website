// Global site copy & facts. Edit here to update the site — no component changes needed.

export const site = {
  name: "Boomerang",
  wordmark: "boomerang",
  founder: "Mark Hannah",
  role: "Composer, Creative Director, Founder",
  location: "Los Angeles",

  // The founder's own voice. Used on the About page only — nowhere is there an
  // invented tagline. The site's words are film titles, studios, the company
  // name, and facts that can be checked.
  positioning:
    "Film is the marathon. The trailer is the hundred-metre dash. I score both.",

  intro:
    "Boomerang is a trailer-music, scoring and sound-design house. Orchestral, electronic, hard rock, post-rock, and experimental sound design, built to move an audience in ninety seconds.",

  bio: [
    "Mark Hannah is the founder and artistic director of Boomerang Music in Los Angeles, and a composer and music producer. Over the past 20+ years, Boomerang has created music and sound design for thousands of motion picture, video game, and brand advertising campaigns.",
    "Notable credits include Clio Award-winning campaigns for “Furiosa: A Mad Max Saga,” “John Wick 4,” “Cocaine Bear,” “Elvis,” “Guardians of the Galaxy Vol. 3,” “The Revenant,” “Barbie,” and “Us.”",
  ],

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
