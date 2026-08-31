// Shared content types.
//
// This file has ZERO runtime imports on purpose. Client components need
// `import type { Project }`, and if that pulled in a module that touches
// process.env, the service-role key would follow it into the browser bundle.
// Keep it types-only.
//
// `Project` is deliberately shaped as a drop-in for the old
// content/projects.ts type: `category` is the label string, and the media
// fields are plain URLs. That keeps the rendered markup identical when the
// data source swaps underneath. Richer media (focal point, blur placeholder)
// arrives in a later phase, where a visual change is the point.

export type Media = {
  id: string;
  kind: "still" | "placeholder" | "logo" | "clip" | "hero" | "og";
  /** Resolved by lib/cms/sql.ts — never stored. */
  url: string;
  width: number;
  height: number;
  lqip: string | null;
  focalX: number;
  focalY: number;
  alt: string | null;
};

export type Category = {
  slug: string;
  label: string;
};

export type Tag = {
  slug: string;
  label: string;
  showInFilters: boolean;
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  /** The chip label, e.g. "Film" — matches the old union's runtime value. */
  category: string;
  studio: string;
  year: number;
  role: string;
  mood?: string;
  tone?: number;
  trailerUrl?: string;
  /** A real film frame. Absent is what hides a credit from the public site. */
  still?: string;
  /** Silent hover loop. Developer-uploaded; encoding is not an editor task. */
  clip?: string;
  tags: string[];
  featuredRank?: number;
  heroRank?: number;
  published: boolean;
};

export type Client = {
  id: string;
  slug: string;
  name: string;
  websiteUrl?: string;
  /** Absent renders a text wordmark — a designed state, not a fallback. */
  logo?: string;
};

export type ClientGroup = {
  slug: string;
  label: string;
  clients: Client[];
};

export type SiteSettings = {
  name: string;
  wordmark: string;
  founder: string;
  role: string;
  location: string;
  intro: string;
  bio: string;
  positioning: string | null;
  canonicalUrl: string;
  creditsLead: string;
  phone: string | null;
  phoneHref: string | null;
  instagramHandle: string | null;
  instagramUrl: string | null;
  copyrightYear: number | null;
};

export type NavItem = { label: string; href: string };

export type SeoPage = {
  path: string;
  title: string | null;
  description: string | null;
  ogImage: string | null;
  noindex: boolean;
};
