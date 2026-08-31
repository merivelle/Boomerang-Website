-- Boomerang Music CMS — schema
--
-- ~82 rows total. The value of Postgres here is INTEGRITY, not throughput:
-- every constraint below removes a class of mistake the editors can then not make.
--
-- Two rules hold throughout:
--   1. Ordering is an explicit integer column, never an array. A single-row edit
--      is a single-row update, and uniqueness is enforced by the database.
--   2. A nullable rank column encodes membership AND position at once, so a
--      boolean and an order can never disagree.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- taxonomy --

-- A lookup table, not a PG enum: the row order IS the /work filter-chip order
-- (WorkExplorer.tsx renders ["All", ...CATEGORIES, tags]), and an enum's order
-- is fixed at creation.
create table categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text    not null unique,
  label      text    not null,
  sort_index integer not null unique
);

-- Cross-cutting tags, seeded with 'oscar-nominees'. A boolean would give exactly
-- one such set forever; "Clio Award-winning" is already sitting in site.ts.
create table tags (
  id              uuid primary key default gen_random_uuid(),
  slug            text    not null unique,
  label           text    not null,
  show_in_filters boolean not null default true,
  sort_index      integer not null
);

-- ------------------------------------------------------------------- media --

-- Never store a full URL: buckets and project refs change. One resolver
-- (lib/cms/media.ts) builds the URL from bucket+object_path or legacy_public_path.
create table media (
  id                 uuid primary key default gen_random_uuid(),
  kind               text not null check (kind in ('still','placeholder','logo','clip','hero','og')),
  bucket             text,
  object_path        text,
  legacy_public_path text,
  width              integer not null check (width  > 0),
  height             integer not null check (height > 0),
  bytes              integer not null check (bytes  > 0),
  mime               text    not null,
  lqip               text,
  -- 0.38 is not arbitrary: it is what HeroC.tsx hard-codes as object-[50%_38%].
  -- The focal point is a generalization of a decision the design already made.
  focal_x            numeric(4,3) not null default 0.5   check (focal_x between 0 and 1),
  focal_y            numeric(4,3) not null default 0.38  check (focal_y between 0 and 1),
  alt                text,
  checksum           text not null,
  created_at         timestamptz not null default now(),
  created_by         uuid references auth.users(id) on delete set null,

  constraint media_has_a_location check (
    (bucket is not null and object_path is not null) or legacy_public_path is not null
  ),
  -- Deliberately wide. 1.30 clears the existing 4:3 outlier, 2.80 clears the
  -- 2.755 one. This rejects a portrait poster; it does not enforce 16:9.
  constraint still_aspect_is_sane check (
    kind not in ('still','placeholder')
    or ((width::numeric / height) between 1.30 and 2.80)
  )
);
create unique index media_object_key   on media (bucket, object_path)  where bucket is not null;
create unique index media_legacy_key   on media (legacy_public_path)   where legacy_public_path is not null;
create index        media_checksum_idx on media (checksum);
create index        media_kind_idx     on media (kind);

-- ---------------------------------------------------------------- projects --

create table projects (
  id          uuid    primary key default gen_random_uuid(),
  slug        text    not null unique,
  title       text    not null,
  category_id uuid    not null references categories(id) on delete restrict,
  studio      text    not null,
  year        smallint not null check (year between 1900 and 2100),
  role        text    not null,
  -- Migrated losslessly (it is recorded editorial intent) but rendered nowhere
  -- and hidden from the editor form: a field with no visible effect is a support call.
  mood        text,
  -- numeric, NOT real: 0.26 through a float returns 0.25999999 and drifts the
  -- placeholder gradient hue.
  tone        numeric(3,2) check (tone between 0 and 1),
  -- https-only: this value lands in an <iframe src> in Lightbox.tsx.
  trailer_url text check (trailer_url is null or trailer_url ~ '^https://'),

  -- Public visibility is still_media_id IS NOT NULL — this reproduces
  -- projectsWithStills exactly, with no boolean to drift out of sync with the
  -- file that actually exists. placeholder_media_id is admin-only.
  still_media_id       uuid references media(id) on delete set null,
  placeholder_media_id uuid references media(id) on delete set null,
  clip_media_id        uuid references media(id) on delete set null,

  sort_index    integer  not null,
  featured_rank smallint check (featured_rank > 0),
  hero_rank     smallint check (hero_rank between 1 and 6),
  published     boolean  not null default true,

  seo_title       text,
  seo_description text,
  og_media_id     uuid references media(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The four highest-value lines in this file. Today a typo'd hero slug silently
  -- drops a column (HeroC.tsx does .map(getProject).filter(Boolean)). Here the
  -- equivalent state is unrepresentable, and that holds even if the admin UI has
  -- a bug.
  constraint hero_needs_a_real_still     check (hero_rank     is null or still_media_id is not null),
  constraint featured_needs_a_real_still check (featured_rank is null or still_media_id is not null),
  constraint hero_must_be_published      check (hero_rank     is null or published),
  constraint featured_must_be_published  check (featured_rank is null or published)
);

create unique index projects_sort_index_key    on projects (sort_index);
create unique index projects_featured_rank_key on projects (featured_rank) where featured_rank is not null;
create unique index projects_hero_rank_key     on projects (hero_rank)     where hero_rank     is not null;
-- The tiebreak in this index is load-bearing: JS Array.sort is stable and
-- Postgres is not, so `order by year desc` alone silently reshuffles same-year
-- films and changes which 24 appear on the homepage.
create index projects_public_order on projects (year desc, sort_index asc) where published;
create index projects_category_idx on projects (category_id);

create table project_tags (
  project_id uuid not null references projects(id) on delete cascade,
  tag_id     uuid not null references tags(id)     on delete cascade,
  primary key (project_id, tag_id)
);
create index project_tags_tag_idx on project_tags (tag_id);

-- ----------------------------------------------------------------- clients --

create table client_groups (
  id         uuid primary key default gen_random_uuid(),
  slug       text    not null unique,
  label      text    not null,
  sort_index integer not null unique
);

create table clients (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references client_groups(id) on delete restrict,
  name          text not null,
  slug          text not null unique,
  website_url   text check (website_url is null or website_url ~ '^https?://'),
  -- NULL is a first-class designed state: 13 of the 34 clients render as a text
  -- wordmark today (app/clients/page.tsx). Adding a client does not require a logo.
  logo_media_id uuid references media(id) on delete set null,
  sort_index    integer not null,
  published     boolean not null default true,
  unique (group_id, sort_index)
);

-- ------------------------------------------------------------------- site --

create table site_settings (
  id               smallint primary key default 1 check (id = 1),
  name             text not null,
  wordmark         text not null,
  founder          text not null,
  role             text not null,
  location         text not null,
  intro            text not null,
  bio              text not null,
  positioning      text,
  canonical_url    text not null,
  credits_lead     text not null,
  phone            text,
  phone_href       text,
  instagram_handle text,
  instagram_url    text,
  copyright_year   smallint,
  updated_at       timestamptz not null default now()
);

-- A SEPARATE TABLE, not a column, because Postgres has no column-level RLS.
-- info@boomerang-music.com is verifiably absent from the client bundle today
-- (app/contact/page.tsx documents the anti-scrape intent). The moment `site`
-- becomes a fetched row passed into Nav (a client component), every column of
-- that row is serialized into the HTML. This split is the mechanism that
-- prevents it; a code convention would not survive the first refactor.
create table site_private (
  id            smallint primary key default 1 check (id = 1),
  contact_email text not null,
  contact_to    text,
  contact_from  text
);

create table site_credits (
  id         uuid primary key default gen_random_uuid(),
  title      text    not null,
  sort_index integer not null unique
);

create table nav_items (
  id         uuid primary key default gen_random_uuid(),
  label      text    not null,
  href       text    not null,
  sort_index integer not null unique,
  enabled    boolean not null default true
);

create table seo_pages (
  path        text primary key,
  title       text,
  description text,
  og_media_id uuid references media(id) on delete set null,
  noindex     boolean not null default false,
  json_ld     jsonb,
  updated_at  timestamptz not null default now()
);

-- -------------------------------------------------------------- inquiries --

create type inquiry_status as enum ('new','read','replied','archived','spam');

create table inquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  subject     text,
  message     text not null,
  source_path text,
  referer     text,
  user_agent  text,
  -- sha256(ip + salt). You want rate-limiting and dedupe, not a log of who visited.
  ip_hash     text,
  status      inquiry_status not null default 'new',
  resend_id   text,
  delivery    jsonb,
  read_at     timestamptz,
  read_by     uuid references auth.users(id) on delete set null
);
create index inquiries_created_idx on inquiries (created_at desc);
create index inquiries_status_idx  on inquiries (status) where status = 'new';

-- ------------------------------------------------------------ operational --

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  role         text not null default 'editor' check (role in ('editor','developer')),
  created_at   timestamptz not null default now()
);

-- The entire answer to "Mark deleted The Revenant". At this row count the
-- storage is noise.
create table content_revisions (
  id         bigserial primary key,
  table_name text not null,
  row_id     uuid,
  snapshot   jsonb not null,
  action     text not null check (action in ('insert','update','delete')),
  actor      uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index content_revisions_row_idx on content_revisions (table_name, row_id, created_at desc);
