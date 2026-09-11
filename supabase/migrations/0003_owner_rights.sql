-- 0003 — owner rights
-- Run in the Supabase SQL editor after 0002_admin_guard.sql.
--
-- The question this answers: who can hand out admin?
--
-- Before this migration: any admin could promote anyone, including making
-- another admin who could then do the same. That spreads without you.
--
-- After: there is one owner — you. Only the owner can grant or remove admin.
-- Admins keep everything else (add members, issue codes, reset PINs, delete
-- members, read the log) but cannot create more admins.

alter table public.profiles
  add column if not exists is_owner boolean not null default false;

-- You. Change the username here if you ever hand the business on.
update public.profiles set is_owner = true, is_admin = true
 where username = 'jamie.mcmullan';

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_owner from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.guard_admin_rights()
returns trigger language plpgsql as $$
begin
  -- auth.uid() is null for the service role and the SQL editor, which is how
  -- you get back in if something goes wrong. App requests always have one.
  if auth.uid() is not null then
    if new.is_admin is distinct from old.is_admin and not public.is_owner() then
      raise exception 'Only the owner can change admin rights.';
    end if;
    if new.is_owner is distinct from old.is_owner and not public.is_owner() then
      raise exception 'Only the owner can change ownership.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_admin_rights on public.profiles;
create trigger guard_admin_rights
  before update on public.profiles
  for each row execute function public.guard_admin_rights();

-- Check: should show one row, you, both true.
--   select username, is_admin, is_owner from public.profiles where is_owner;
