-- Boomerang Music CMS — complete setup
-- Generated from supabase/migrations/*.sql. Paste into the Supabase SQL Editor.


-- ═══════════════════════════════════════════════════════════════════════
-- 0001_schema.sql
-- ═══════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════
-- 0002_triggers.sql
-- ═══════════════════════════════════════════════════════════════════════

-- Boomerang Music CMS — triggers
--
-- Two jobs: keep updated_at honest, and snapshot every destructive change into
-- content_revisions so a bad edit is recoverable without a database restore.

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_touch      before update on projects
  for each row execute function public.touch_updated_at();
create trigger site_settings_touch before update on site_settings
  for each row execute function public.touch_updated_at();
create trigger seo_pages_touch     before update on seo_pages
  for each row execute function public.touch_updated_at();

-- Snapshots the OLD row, so the revision log answers "what did it used to say".
-- security definer so it can insert into a table the caller cannot write to
-- directly (see 0003_rls.sql).
create or replace function public.log_content_revision()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_id uuid;
begin
  begin
    old_id := (to_jsonb(old) ->> 'id')::uuid;
  exception when others then
    old_id := null;  -- site_settings/site_private use a smallint id
  end;

  insert into content_revisions (table_name, row_id, snapshot, action, actor)
  values (tg_table_name, old_id, to_jsonb(old), lower(tg_op), auth.uid());

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger projects_revisions      after update or delete on projects
  for each row execute function public.log_content_revision();
create trigger clients_revisions       after update or delete on clients
  for each row execute function public.log_content_revision();
create trigger client_groups_revisions after update or delete on client_groups
  for each row execute function public.log_content_revision();
create trigger site_settings_revisions after update or delete on site_settings
  for each row execute function public.log_content_revision();
create trigger site_credits_revisions  after update or delete on site_credits
  for each row execute function public.log_content_revision();
create trigger seo_pages_revisions     after update or delete on seo_pages
  for each row execute function public.log_content_revision();

-- New auth users get an 'editor' profile automatically. Promotion to
-- 'developer' is a manual UPDATE — never something a signup can grant.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════
-- 0003_rls.sql
-- ═══════════════════════════════════════════════════════════════════════

-- Boomerang Music CMS — row level security
--
-- RLS is enabled on EVERY table. A table with RLS on and no policy is deny-all,
-- which is the correct default for anything forgotten here.
--
-- The anon (publishable) key gets SELECT on published content and nothing else,
-- anywhere. It ships in the client bundle by design, so treat it as public.

-- ------------------------------------------------------------------ helpers --

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid());
$$;

create or replace function public.is_developer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'developer');
$$;

alter table categories        enable row level security;
alter table tags              enable row level security;
alter table media             enable row level security;
alter table projects          enable row level security;
alter table project_tags      enable row level security;
alter table client_groups     enable row level security;
alter table clients           enable row level security;
alter table site_settings     enable row level security;
alter table site_private      enable row level security;
alter table site_credits      enable row level security;
alter table nav_items         enable row level security;
alter table seo_pages         enable row level security;
alter table inquiries         enable row level security;
alter table profiles          enable row level security;
alter table content_revisions enable row level security;

-- --------------------------------------------------------------- anon read --

create policy anon_read_categories    on categories    for select to anon, authenticated using (true);
create policy anon_read_tags          on tags          for select to anon, authenticated using (true);
create policy anon_read_media         on media         for select to anon, authenticated using (true);
create policy anon_read_project_tags  on project_tags  for select to anon, authenticated using (true);
create policy anon_read_client_groups on client_groups for select to anon, authenticated using (true);
create policy anon_read_site_credits  on site_credits  for select to anon, authenticated using (true);
create policy anon_read_seo_pages     on seo_pages     for select to anon, authenticated using (true);

create policy anon_read_projects  on projects  for select to anon, authenticated using (published);
create policy anon_read_clients   on clients   for select to anon, authenticated using (published);
create policy anon_read_nav_items on nav_items for select to anon, authenticated using (enabled);

-- site_settings has NO anon policy. It is reached through a view instead, so
-- that a column added later is not automatically public.
--
-- Deliberately NOT security_invoker. The view is the security boundary: it runs
-- with its owner's rights, so it can read site_settings while anon cannot, and
-- anon sees exactly the columns listed here. With security_invoker = on the
-- view would be evaluated as anon against a table anon has no policy for, and
-- every public page would silently render empty site copy.
create view site_public as
  select name, wordmark, founder, role, location, intro, bio, positioning,
         canonical_url, credits_lead, phone, phone_href,
         instagram_handle, instagram_url, copyright_year
  from site_settings;

create policy admin_read_site_settings on site_settings for select to authenticated using (is_admin());

-- site_private, inquiries, content_revisions: no anon policy at all.

-- ------------------------------------------------------------ admin writes --

create policy admin_all_categories    on categories    for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_tags          on tags          for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_projects      on projects      for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_project_tags  on project_tags  for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_client_groups on client_groups for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_clients       on clients       for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_site_credits  on site_credits  for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_nav_items     on nav_items     for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_seo_pages     on seo_pages     for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_write_site_settings on site_settings for update to authenticated using (is_admin()) with check (is_admin());
create policy admin_rw_site_private   on site_private  for all to authenticated using (is_admin()) with check (is_admin());

-- Media: editors may add and manage stills and share images. Logos and hover
-- clips are developer-only — the 21 existing logos are hand-normalized white
-- PNGs and no automated pipeline reliably matches them, and clips need source
-- trailers plus a hand-picked start-second. Enforced here, not just in the UI.
create policy admin_read_media_all on media for select to authenticated using (is_admin());
create policy admin_insert_media   on media for insert to authenticated
  with check (is_admin() and (kind not in ('logo','clip') or is_developer()));
create policy admin_update_media   on media for update to authenticated
  using (is_admin()) with check (is_admin() and (kind not in ('logo','clip') or is_developer()));
create policy admin_delete_media   on media for delete to authenticated
  using (is_admin() and (kind not in ('logo','clip') or is_developer()));

-- Inquiries: admins may read and re-status. No INSERT policy for anyone —
-- rows are written server-side with the service role from app/api/contact/route.ts,
-- so the honeypot and validation cannot be bypassed by POSTing PostgREST directly.
-- No DELETE either; 'archived' is how a lead goes away.
create policy admin_read_inquiries   on inquiries for select to authenticated using (is_admin());
create policy admin_update_inquiries on inquiries for update to authenticated using (is_admin()) with check (is_admin());

-- Profiles: own row, plus everything for a developer. Deliberately no self-update
-- policy — otherwise an editor promotes themselves to developer.
create policy read_own_profile  on profiles for select to authenticated using (id = auth.uid() or is_developer());
create policy dev_write_profile on profiles for all    to authenticated using (is_developer()) with check (is_developer());

-- Revisions are readable by admins and written only by the trigger (which runs
-- security definer as the owner).
create policy admin_read_revisions on content_revisions for select to authenticated using (is_admin());

-- ------------------------------------------------------------------ grants --
-- The project is created with "Automatically expose new tables" OFF, so nothing
-- reaches the Data API without an explicit grant. RLS decides which ROWS a role
-- sees; these decide whether the role may address the table at all. A table
-- added later and left out of this block is invisible rather than public, which
-- is the failure direction we want.

grant usage on schema public to anon, authenticated, service_role;

-- service_role is the trusted backend identity: the migration script, the admin
-- write path, and the contact route's inquiry insert. It bypasses RLS, but with
-- "Automatically expose new tables" off it still needs table privileges, and
-- without them every server-side write fails with a bare 42501.
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Public reads. Row filtering is handled by the policies above.
grant select on
  categories, tags, media, projects, project_tags,
  client_groups, clients, site_credits, nav_items, seo_pages
to anon, authenticated;

grant select on site_public to anon, authenticated;

-- Admin writes. Still gated row-by-row by is_admin() / is_developer().
grant select, insert, update, delete on
  categories, tags, media, projects, project_tags,
  client_groups, clients, site_credits, nav_items, seo_pages
to authenticated;

grant select, update on site_settings to authenticated;
grant select, insert, update, delete on site_private to authenticated;

-- No insert: inquiry rows are written server-side with the service role, so the
-- honeypot cannot be bypassed. No delete: 'archived' is how a lead goes away.
grant select, update on inquiries to authenticated;

grant select, insert, update, delete on profiles to authenticated;
grant select on content_revisions to authenticated;

-- ----------------------------------------------------------------- storage --
-- Buckets are created in 0004_storage.sql; these policies gate them.

create policy storage_public_read on storage.objects for select to anon, authenticated
  using (bucket_id in ('stills','logos','og','hero','clips'));

create policy storage_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'originals' and is_admin());

create policy storage_admin_write on storage.objects for insert to authenticated
  with check (
    is_admin()
    and bucket_id in ('stills','logos','og','hero','clips','originals')
    and (bucket_id not in ('logos','clips') or is_developer())
  );

create policy storage_admin_update on storage.objects for update to authenticated
  using (is_admin() and (bucket_id not in ('logos','clips') or is_developer()));

create policy storage_admin_delete on storage.objects for delete to authenticated
  using (is_admin() and (bucket_id not in ('logos','clips') or is_developer()));

-- ═══════════════════════════════════════════════════════════════════════
-- 0004_storage.sql
-- ═══════════════════════════════════════════════════════════════════════

-- Boomerang Music CMS — storage buckets
--
-- Size and MIME limits are set per bucket: a server-side check you get for free
-- and cannot forget to write.
--
-- Note: the 110 assets already in /public STAY there. They are served free from
-- Vercel's edge; Supabase Storage reads count against a 5 GB/month egress quota
-- on the free tier, and Supabase image transformations are a paid feature — so
-- moving them buys nothing but a URL change. New uploads land here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('stills',    'stills',    true,  26214400, array['image/jpeg','image/png','image/webp','image/avif']),
  ('logos',     'logos',     true,   5242880, array['image/png','image/webp','image/svg+xml']),
  ('og',        'og',        true,   5242880, array['image/jpeg','image/png']),
  ('hero',      'hero',      true,   5242880, array['image/jpeg']),
  ('clips',     'clips',     true,  52428800, array['video/mp4']),
  -- Private. The untouched upload, kept as the redo path when a normalization
  -- pass turns out to have been wrong. 1 GB free against 25 MB of current assets.
  ('originals', 'originals', false, 52428800, array['image/jpeg','image/png','image/webp','image/avif','image/tiff'])
on conflict (id) do nothing;
