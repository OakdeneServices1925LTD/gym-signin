# Shipping & Shredding — gym sign-in

A phone-first web app for a private gym. Members sign in and out at the door so
everyone can see whether the two-person rule is being kept.

Gym space provided by **Oakdene Services (1925) Ltd**, Oakdene House, Michelin Road,
Mallusk, BT36 4PT.

## The one rule the app exists to enforce

**Two or more people must be present for the whole session.** One person signed in
is a breach, and the app must say so loudly, on every phone in the building, the
moment it happens.

## Stack

Next.js (App Router, TypeScript) · Supabase (Postgres, Auth, Realtime, Edge Functions) ·
deployed on Vercel. No CSS framework — plain CSS, copy the tokens from the reference
design. No component library.

## Already written — do not redesign these

| File | What it is |
|---|---|
| `supabase/migrations/0001_init.sql` | Schema, RLS, realtime, cron, `alone_periods()` |
| `supabase/functions/pin-auth/index.ts` | PIN activation + login |
| `design/prototype.html` | The visual reference. Match it closely. |
| `Gym_Ways_of_Working.md` | How this build runs. Session gates, git rules, standing gotchas. |

Read all four before writing any app code. `Gym_Ways_of_Working.md` governs how you
work: one session at a time, verified before the next, and no push without Jamie
asking for one. The prototype is a working
single-file mock of every screen — colours, type scale, spacing, wording and
states are all in there, and it is the design brief.

## Auth model

Username is `firstname.lastname`. Password is a 4-digit PIN. Underneath, Supabase
password auth with a synthetic email (`username@members.gym.local`) and the PIN
peppered server-side.

- The browser never compares a PIN and never stores one. It POSTs to `pin-auth` and
  gets back a session, then calls `supabase.auth.setSession()`.
- 5 wrong PINs locks the account for 15 minutes. The edge function owns that.
- Sessions must be long-lived — the lads should not have to re-enter a PIN every
  visit. Persist the session, refresh it in the background.

## Screens

1. **Sign in** — username + 4-digit keypad. Big touch targets, bottom of screen.
2. **Set up account** (first time only) — username + one-time code from the admin,
   choose a PIN, confirm it, then the agreement.
3. **Agreement** — the gym agreement, tick box, typed full name. Records
   `user_id, version, typed_name, accepted_at`. Version it: if `version` changes,
   everyone re-signs before they can check in again.
4. **Add to home screen** — shown once after setup, with the correct instructions
   for the phone they are on (Share → Add to Home Screen on iPhone, ⋮ → Add to
   Home screen on Android).
5. **Gym** — the status panel, who is in, and one big sign in / sign out button.
6. **Book** — 7-day strip, slots down the page, tap to book or cancel.
7. **Admin** — add members, issue and reset codes and PINs, session log,
   breaches from `alone_periods()`.

## Status panel — the whole product

Driven by `count(*)` from `current_occupancy`, live over Realtime:

- **0** — grey. "Gym empty."
- **1** — black-and-amber hazard stripes. "Not a valid session." Name who is alone.
- **2+** — green. "Session valid."

When someone signs out and the count drops to 1, the remaining member's screen must
flip to amber without a refresh. Subscribe to `check_ins`.

## Rules for the build

- Server components by default; client components only where there is state.
- Middleware gate: not signed in → sign in. Signed in but agreement version not
  accepted → agreement. Never let anyone reach `/gym` around it.
- `/admin` checks `is_admin` server-side. Hiding the tab is not access control.
- PWA: `manifest.json`, `apple-touch-icon`, standalone display, black theme, so the
  home screen icon opens without browser chrome.
- Never expose the service role key to the browser. Only `NEXT_PUBLIC_SUPABASE_URL`
  and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public.
- Times display in Europe/London. Store UTC.
- Access hours: Mon–Fri 05:00–08:00 and 17:00–22:00; Sat 06:00–20:00; Sun closed.
  Show them; don't block sign-in outside them, but flag it in the admin log.

## Definition of done

Two phones, same page. One signs in — both screens go amber within a second or two.
The second signs in — both go green. One signs out — the other goes amber again.
