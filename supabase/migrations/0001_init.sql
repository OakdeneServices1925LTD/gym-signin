-- Shipping & Shredding gym sign-in
-- Oakdene Services (1925) Ltd, Oakdene House, Michelin Road, Mallusk, BT36 4PT
-- Run in Supabase SQL editor, or: supabase db push

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- members
-- ---------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text not null unique
                  check (username ~ '^[a-z]+\.[a-z]+[0-9]*$'),   -- firstname.lastname
  full_name     text not null,
  is_admin      boolean not null default false,
  is_active     boolean not null default true,
  activated_at  timestamptz,                                     -- set when they choose their own PIN
  created_at    timestamptz not null default now()
);

-- PIN state. Never exposed to the client: no RLS policies are granted,
-- so only the service role (the edge function) can touch it.
create table public.pin_state (
  user_id          uuid primary key references auth.users on delete cascade,
  activation_hash  text,          -- bcrypt of the one-time code the admin hands over
  failed_attempts  int not null default 0,
  locked_until     timestamptz,
  pin_set_at       timestamptz
);
alter table public.pin_state enable row level security;   -- deliberately zero policies

-- ---------------------------------------------------------------
-- agreement
-- ---------------------------------------------------------------
create table public.agreement_acceptances (
  id           bigserial primary key,
  user_id      uuid not null references auth.users on delete cascade,
  version      int  not null,
  typed_name   text not null,
  accepted_at  timestamptz not null default now(),
  unique (user_id, version)
);

-- ---------------------------------------------------------------
-- door log
-- ---------------------------------------------------------------
create table public.check_ins (
  id              bigserial primary key,
  user_id         uuid not null references auth.users on delete cascade,
  checked_in_at   timestamptz not null default now(),
  checked_out_at  timestamptz,
  auto_closed     boolean not null default false
);
create unique index one_open_session_per_user
  on public.check_ins (user_id) where checked_out_at is null;
create index check_ins_recent on public.check_ins (checked_in_at desc);

-- ---------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------
create table public.bookings (
  id        bigserial primary key,
  slot_at   timestamptz not null,
  user_id   uuid not null references auth.users on delete cascade,
  unique (slot_at, user_id)
);

-- ---------------------------------------------------------------
-- who is in the gym right now
-- ---------------------------------------------------------------
create view public.current_occupancy
with (security_invoker = true) as
  select c.id, c.user_id, p.username, p.full_name, c.checked_in_at
  from public.check_ins c
  join public.profiles p on p.id = c.user_id
  where c.checked_out_at is null;

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.agreement_acceptances enable row level security;
alter table public.check_ins             enable row level security;
alter table public.bookings              enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- everyone signed in can see who the members are and who is in the gym
create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_admin  on public.profiles for all    to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy agree_own_read  on public.agreement_acceptances for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy agree_own_write on public.agreement_acceptances for insert to authenticated
  with check (user_id = auth.uid());

create policy checkins_read   on public.check_ins for select to authenticated using (true);
-- you may only sign yourself in, only if active, and only if you have signed the current agreement
create policy checkins_insert on public.check_ins for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles     where id = auth.uid() and is_active)
    and exists (select 1 from public.agreement_acceptances
                where user_id = auth.uid() and version = 1)
  );
create policy checkins_update on public.check_ins for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy bookings_read   on public.bookings for select to authenticated using (true);
create policy bookings_write  on public.bookings for all    to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------
-- live updates
-- ---------------------------------------------------------------
alter publication supabase_realtime add table public.check_ins;
alter publication supabase_realtime add table public.bookings;

-- ---------------------------------------------------------------
-- housekeeping: close sessions somebody forgot to end
-- ---------------------------------------------------------------
create extension if not exists pg_cron;
select cron.schedule('close-stale-sessions', '*/15 * * * *', $$
  update public.check_ins
     set checked_out_at = now(), auto_closed = true
   where checked_out_at is null
     and checked_in_at < now() - interval '3 hours';
$$);

-- ---------------------------------------------------------------
-- breach report: anyone who was alone in the gym, and for how long
-- ---------------------------------------------------------------
create or replace function public.alone_periods(since timestamptz default now() - interval '30 days')
returns table (username text, started timestamptz, minutes numeric)
language sql stable as $$
  with s as (
    select c.user_id, c.checked_in_at as a,
           coalesce(c.checked_out_at, now()) as b
    from public.check_ins c where c.checked_in_at >= since
  ),
  overlap as (
    select s.user_id, s.a, s.b,
           (select count(*) from s o
             where o.user_id <> s.user_id and o.a < s.b and o.b > s.a) as others
    from s
  )
  select p.username, o.a, round(extract(epoch from (o.b - o.a))/60)
  from overlap o join public.profiles p on p.id = o.user_id
  where o.others = 0
  order by o.a desc;
$$;
