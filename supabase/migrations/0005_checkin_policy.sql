-- 0005 — stop the check-in rule breaking every time the agreement changes
-- Run in the Supabase SQL editor after 0004_guests.sql.
--
-- The old policy required agreement version 1 specifically. Bumping
-- AGREEMENT_VERSION to 2 meant anyone who signed the new wording was refused
-- at the door, because the database was still looking for a version-1 row.
--
-- Now the database asks only "have they signed the agreement at all?" and the
-- app decides which version is current. Bumping the version still forces
-- everyone to re-sign before they reach the gym screen — that gate lives in
-- app/page.js and app/gym/page.js, where it can change without a migration.

drop policy if exists checkins_insert on public.check_ins;

create policy checkins_insert on public.check_ins for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles
                 where id = auth.uid() and is_active)
    and exists (select 1 from public.agreement_acceptances
                 where user_id = auth.uid())
  );

-- Check: should list one policy with no version number in it.
--   select polname from pg_policy where polname = 'checkins_insert';
