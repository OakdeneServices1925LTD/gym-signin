-- 0006 — personal bests and leaderboards
-- Run in the Supabase SQL editor after 0005_checkin_policy.sql.
--
-- One row per lift performed. Personal bests and leaderboards are worked out
-- from these rows rather than stored, so a mistyped entry can be deleted and
-- everything corrects itself.
--
-- Boards are gym-wide: everyone can read everyone's records. That is what makes
-- it a leaderboard. Nobody can write a row against anybody else.

create table public.lift_records (
  id            bigserial primary key,
  user_id       uuid not null references auth.users on delete cascade,
  lift          text not null check (lift in
                  ('squat','bench','deadlift','ohp','legpress','chinup','pressup','run5k')),
  weight_kg     numeric(6,2) check (weight_kg is null or (weight_kg > 0 and weight_kg <= 500)),
  reps          int          check (reps is null or (reps between 1 and 200)),
  seconds       int          check (seconds is null or (seconds between 60 and 7200)),
  performed_on  date not null default current_date,
  created_at    timestamptz not null default now(),

  -- a record is either a weight x reps, or reps alone, or a time
  constraint one_kind_of_record check (
    (weight_kg is not null and reps is not null and seconds is null)
    or (weight_kg is null and reps is not null and seconds is null)
    or (weight_kg is null and reps is null and seconds is not null)
  ),
  -- no logging next month's lift
  constraint not_in_the_future check (performed_on <= current_date)
);

create index lift_records_lift on public.lift_records (lift, performed_on desc);
create index lift_records_user on public.lift_records (user_id, performed_on desc);

alter table public.lift_records enable row level security;

-- everyone reads everything: that is the leaderboard
create policy lifts_read on public.lift_records for select to authenticated using (true);

-- you may only log your own, and only if your account is active
create policy lifts_insert on public.lift_records for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and is_active)
  );

-- delete your own mistakes; admins can delete anybody's
create policy lifts_delete on public.lift_records for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Check: should return zero rows and no error.
--   select * from public.lift_records;
