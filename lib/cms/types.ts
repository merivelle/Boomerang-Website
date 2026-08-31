// Shared content types.
//
// This file has ZERO runtime imports on purpose. Client components need
// `import type { Project }`, and if that pulled in a module that touches
// process.env, the service-role key would follow it into the browser bundle.
// Keep it types-only.

export type Media = {
  id: string;
  kind: "still" | "placeholder" | "logo" | "clip" | "hero" | "og";
  /** Resolved by lib/cms/media.ts — never stored. */
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
  category: Category;
  studio: string;
  year: number;
  role: string;
  mood: string | null;
  tone: number | null;
  trailerUrl: string | null;
  /** A real film frame. NULL is what hides a credit from the public site. */
  still: Media | null;
  /** Graded stand-in, shown in the admin only. */
  placeholder: Media | null;
  /** Silent hover loop. Developer-uploaded; encoding is not an editor task. */
  clip: Media | null;
  tags: string[];
  featuredRank: number | null;
  heroRank: number | null;
  published: boolean;
};

export type Client = {
  id: string;
  slug: string;
  name: string;
  websiteUrl: string | null;
  logo: Media | null;
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
  ogImage: Media | null;
  noindex: boolean;
};
