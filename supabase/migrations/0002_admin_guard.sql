-- 0002 — admin rights
-- Run this in the Supabase SQL editor after 0001_init.sql.
--
-- Who can promote: only an existing admin. The profiles table has exactly one
-- write policy (profiles_admin) and it requires public.is_admin(), so a member
-- cannot make themselves an admin — the button is not the protection, this is.
--
-- What this migration adds: you cannot end up with no admins. The UI stops you
-- changing your own rights; this stops every other route to the same place,
-- including a direct SQL edit.

create or replace function public.protect_last_admin()
returns trigger language plpgsql as $$
declare remaining int;
begin
  if tg_op = 'DELETE' then
    if old.is_admin and old.is_active then
      select count(*) into remaining
        from public.profiles
       where is_admin and is_active and id <> old.id;
      if remaining = 0 then
        raise exception 'That is the last active admin. Make someone else an admin first.';
      end if;
    end if;
    return old;
  end if;

  -- demoted, or deactivated while still holding admin
  if old.is_admin and old.is_active
     and (new.is_admin is false or new.is_active is false) then
    select count(*) into remaining
      from public.profiles
     where is_admin and is_active and id <> old.id;
    if remaining = 0 then
      raise exception 'That is the last active admin. Make someone else an admin first.';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists protect_last_admin on public.profiles;
create trigger protect_last_admin
  before update or delete on public.profiles
  for each row execute function public.protect_last_admin();

-- Handy check: who currently holds admin.
--   select username, full_name, is_admin, is_active from public.profiles where is_admin;
