-- 0007 — chin-ups renamed to pull-ups
-- Only needed if you already ran 0006_lift_records.sql with the old name.
-- If 0006 has not been run yet, skip this: 0006 already says pullup.

alter table public.lift_records drop constraint if exists lift_records_lift_check;

update public.lift_records set lift = 'pullup' where lift = 'chinup';

alter table public.lift_records add constraint lift_records_lift_check
  check (lift in ('squat','bench','deadlift','ohp','legpress','pullup','pressup','run5k'));
