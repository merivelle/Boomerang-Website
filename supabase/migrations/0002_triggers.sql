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
