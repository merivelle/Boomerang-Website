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
