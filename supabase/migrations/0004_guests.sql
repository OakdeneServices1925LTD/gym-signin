-- 0004 — guests
-- Run in the Supabase SQL editor after 0003_owner_rights.sql.
--
-- A guest does not get a login. A member signs their guest in against their own
-- account and takes responsibility for them. The guest row carries the guest's
-- name and the member's user_id, so the log always shows who brought whom.
--
-- Guests DO count toward the two-person rule. The rule exists so that nobody is
-- alone if something goes wrong, and a guest can call an ambulance the same as
-- anyone else.

alter table public.check_ins
  add column if not exists guest_name text
    check (guest_name is null or length(btrim(guest_name)) between 2 and 60);

-- A member may have one open session of their own, plus guests alongside it.
drop index if exists one_open_session_per_user;
create unique index one_open_session_per_user
  on public.check_ins (user_id)
  where checked_out_at is null and guest_name is null;

-- Cap it, so nobody signs in a five-a-side team.
create or replace function public.limit_guests()
returns trigger language plpgsql as $$
declare open_guests int;
begin
  if new.guest_name is not null then
    select count(*) into open_guests
      from public.check_ins
     where user_id = new.user_id and checked_out_at is null and guest_name is not null;
    if open_guests >= 2 then
      raise exception 'You can have two guests signed in at once.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists limit_guests on public.check_ins;
create trigger limit_guests
  before insert on public.check_ins
  for each row execute function public.limit_guests();

-- The occupancy view now shows guests by name, and who brought them.
drop view if exists public.current_occupancy;
create view public.current_occupancy
with (security_invoker = true) as
  select c.id,
         c.user_id,
         p.username,
         coalesce(c.guest_name, p.full_name) as full_name,
         c.guest_name,
         p.full_name as host_name,
         c.checked_in_at
    from public.check_ins c
    join public.profiles p on p.id = c.user_id
   where c.checked_out_at is null;

-- alone_periods() still works: a member with a guest is not alone, because the
-- guest is a separate open row overlapping theirs.
