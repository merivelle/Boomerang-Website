-- Boomerang Music CMS — staged edits, publish history, default social image.
--
-- Additive only. No existing column changes, no existing policy changes, so
-- every public query in lib/cms/sql.ts keeps working byte-for-byte.

-- ------------------------------------------------------------------ drafts --
--
-- One table rather than a `draft jsonb` column per content table, because a
-- draft has to be able to describe three things a column cannot:
--   * a row that does not exist live yet (a new credit),
--   * a change to an ordered collection (hero order, Selected Work, credits),
--   * "N unpublished changes" as one countable number.
--
-- `patch` is partial: only the fields the editor actually touched. Publishing
-- merges it onto the live row, so two people editing different fields of the
-- same credit do not clobber each other's work.

create table public.drafts (
  id          uuid primary key default gen_random_uuid(),
  table_name  text not null check (table_name in
                ('projects','clients','site_settings','seo_pages','site_credits','homepage',
                 'categories','tags')),
  -- row_id for an existing row; row_key is the human handle (slug or path) and
  -- is what a pending insert is addressed by, since it has no id yet.
  row_id      uuid,
  row_key     text,
  op          text not null check (op in ('insert','update','delete')),
  patch       jsonb not null default '{}'::jsonb,
  -- What the editor reads on the Review screen. Written by the admin, never
  -- derived from a column name.
  label       text not null,
  summary     text,
  actor       uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint drafts_addressable check (row_id is not null or row_key is not null)
);

-- One open draft per record. coalesce() rather than a plain unique(a,b) because
-- Postgres treats NULLs as distinct, which would let the same row accumulate
-- unlimited drafts.
create unique index drafts_one_per_row on public.drafts
  (table_name, coalesce(row_id::text, row_key, '~'));
create index drafts_updated_idx on public.drafts (updated_at desc);

create trigger drafts_touch before update on public.drafts
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------- publish log --

create table public.publish_log (
  id           bigserial primary key,
  published_at timestamptz not null default now(),
  actor        uuid references auth.users(id) on delete set null,
  item_count   integer not null,
  items        jsonb not null default '[]'::jsonb
);

create index publish_log_recent_idx on public.publish_log (published_at desc);

-- --------------------------------------------------- default social image --
-- Replaces the hardcoded /og.jpg in app/layout.tsx.

alter table public.site_settings
  add column og_media_id uuid references public.media(id) on delete set null;

-- The public view is rebuilt to carry it. Still not security_invoker, for the
-- same reason as 0003: the view is the security boundary.
--
-- It emits the media row's LOCATION columns rather than og_media_id, so getSite
-- can feed them straight into the existing mediaUrl() resolver in lib/cms/sql.ts
-- with no second query and no new resolver. The uuid itself stays private --
-- nothing on the public site has any use for it.
drop view if exists public.site_public;
create view public.site_public as
  select s.name, s.wordmark, s.founder, s.role, s.location, s.intro, s.bio,
         s.positioning, s.canonical_url, s.credits_lead, s.phone, s.phone_href,
         s.instagram_handle, s.instagram_url, s.copyright_year,
         m.bucket             as og_bucket,
         m.object_path        as og_object_path,
         m.legacy_public_path as og_legacy_public_path
  from public.site_settings s
  left join public.media m on m.id = s.og_media_id;

grant select on public.site_public to anon, authenticated;

-- ---------------------------------------------------------------------- RLS --
-- Admins only. Anon gets nothing: a draft is by definition not published.

alter table public.drafts      enable row level security;
alter table public.publish_log enable row level security;

create policy admin_all_drafts on public.drafts for all to authenticated
  using (is_admin()) with check (is_admin());

create policy admin_read_publish_log on public.publish_log for select to authenticated
  using (is_admin());
create policy admin_write_publish_log on public.publish_log for insert to authenticated
  with check (is_admin());

grant select, insert, update, delete on public.drafts to authenticated;
grant select, insert on public.publish_log to authenticated;
grant usage on sequence public.publish_log_id_seq to authenticated;

grant all on public.drafts, public.publish_log to service_role;
grant all on sequence public.publish_log_id_seq to service_role;
