# Gym Sign-In — Ways of Working

**What this is:** the working agreement between Jamie and Claude for building the Shipping &
Shredding gym sign-in app. Drop it in project knowledge and point any new chat at it. It captures
how we work; what we're building lives in `CLAUDE.md` and the prototype.

**Owner:** Jamie McMullan. Windows + VS Code + PowerShell. Claude writes the code and the exact
commands; Jamie runs them and reports back.

**Relationship to the BMS document.** This is the same working agreement with three sections
deliberately dropped and two added. Read §0 before assuming anything carries over — several BMS
rules exist for reasons that don't apply here, and importing them wholesale adds ceremony without
protection.

---

## 0. What is different from the BMS, and why

| BMS rule | Here | Why |
|---|---|---|
| PowerShell patch scripts as the default transfer method | **Dropped.** Claude Code writes files directly | Those scripts exist because chat can't write to your disk. This is greenfield — no anchors, no CRLF traps, nothing live to half-patch |
| Two Supabase projects, dev and prod | **One project** | Five to fifteen users and one screen that matters. Dual-run doubles the migration work and doubles the drift risk it's meant to prevent |
| Per-user feature grants (P11 access model) | **Two roles: member and admin** | `is_admin` boolean, enforced in RLS. The grants architecture is right for an ERP with a dozen modules and wrong for an app with three tabs |
| Three-part feature rule (registry row + grant check + RLS) | **Two-part: RLS + route guard** | No feature registry exists here and none should |
| `Oakdene_Design_Schema.md` house style | **Dropped.** Separate design system | The BMS reads like a spec sheet. This reads like a gym. Black, chrome, hazard amber — see the prototype |
| Cost isolation as an architectural concern | **Not applicable** | Nothing commercial in this database |

**Added for this project:** the live-status rule (§6) and the members-are-not-staff rule (§7).

Everything else in the BMS document carries over unchanged: one piece per chat, migration before
code, step-and-report, commit hygiene, probe before building, don't push without a prompt.

---

## 1. The collaboration model

- **One discrete piece per chat.** Open with a handover so context starts clean. When the scope is
  done, the next piece gets a fresh chat.
- **Claude makes the technical calls.** Independent judgement over approval-seeking. Claude states
  assumptions explicitly so Jamie corrects them during testing rather than blessing every decision
  up front.
- **Batch change requests, then build.** Jamie collects what he wants; Claude logs it; nothing gets
  built until Jamie says go.
- **Logic playback before spec commits.** Claude replays the logic for Jamie to confirm before
  writing it into `CLAUDE.md` or the schema.
- **Step-by-step, report-back loop.** One step or a tight group at a time. Don't dump ten steps and
  hope.
- **Sessions run an hour at most**, and mix task types. Five in total — see §9.

## 2. Claude Code, and what replaces the script workflow

Claude Code runs in the repo folder and edits files itself. No probe scripts, no bundle scripts, no
base64, no `working\` round-trip for code.

What survives from the old workflow:

- **The working folder** `C:\Users\JamieMcMullanOakdene\Downloads\working\` stays, for `.txt` dumps
  of long output you want to paste back into chat. It is outside the repo.
- **Long output goes to a file, not the scrollback.** `npm run build > working\build.txt` then open
  it. Short output — a `git status`, a one-file diff, an `OK:` line — paste straight from the
  terminal.
- **Run scripts with `-File`,** never by pasting multi-line blocks into the prompt. Still true for
  any one-off script.

What does not survive: literal `.Replace()` anchors, CRLF checks, idempotency guards, UTF-8 no-BOM
writes, `.NET IO` for `[id]` paths. All of it was scaffolding around a constraint that's gone.

**Claude Code still needs supervising.** Left alone it will build all five sessions in one run and
hand you something you cannot verify. Hold it to one step at a time, exactly as in §1.

## 3. Git and commit hygiene

Unchanged from the BMS:

- Commit at each verified milestone. One logical change per commit, clear message, no "misc fixes".
- `git status` and `git diff --cached` before every commit. Confirm the staged diff is only what you
  intend.
- File-scoped `git add`. Never `git add .` once the repo has anything in it worth protecting.
- Don't trust the working tree to be empty — triage everything before committing anything.
- **Do not push without an explicit prompt from Jamie.**
- Reverting a pushed commit is `git revert <sha>`, never `git checkout`.
- Push, then verify on the Vercel deploy before calling anything done.

New here: `.env.local` must be in `.gitignore` before the first commit, not after. Check it
yourself; don't assume Claude Code did it.

## 4. Database and migrations

One Supabase project, separate from both BMS projects. Same account, new project, new repo, new
Vercel project.

- **SQL runs in the Supabase editor before the code that uses it.** Unchanged, and the failure mode
  is the same: no column, no error, no write, and an afternoon chasing a ghost.
- **Numbered migration files live in the repo** at `supabase/migrations/`. `0001_init.sql` is
  written. Every schema change after it gets `0002_`, `0003_`, and so on — even though there's only
  one environment, because the file is how the database gets rebuilt if the project is ever lost.
- **The moment the first member activates, the database is the record.** There is no "wipe the test
  data" event. Break things freely before that point; after it, treat every migration as
  production. Manual backup before anything destructive.
- **`pin_state` has RLS on and zero policies.** That is deliberate, not an oversight. Only the edge
  function's service-role client touches it. Any future policy on that table needs a specific reason
  and a second look.
- **`PIN_PEPPER` is set once and never changed.** Changing it invalidates every PIN in the system
  simultaneously and there is no recovery except resetting everyone by hand. Save it with the keys.

## 5. Discovery and verification

- **Probe before building against anything live.** Throwaway routes to confirm shapes, torn down
  once the real feature is verified.
- **Confirm the live schema before writing RLS.** Read the database, not the design doc.
- **A clean build is a syntax gate, not a behaviour gate.** `npm run build` proves it compiles. It
  proves nothing about whether a policy actually blocks anyone. Prove behaviour by signing in as a
  non-admin member and trying to reach `/admin`.
- **Grep before you delete**, and re-grep with a term you know is on the same line to prove the
  search actually ran before trusting a zero result.

## 6. The live-status rule

**The status panel flipping colour in real time is the product.** Everything else — bookings, the
admin log, the agreement — is supporting furniture.

So: it gets verified on every session that touches the app, not just the session that builds it.
The test is two phones on the gym page, and it takes twenty seconds:

1. Sign in on phone one. Both screens go amber.
2. Sign in on phone two. Both go green.
3. Sign out on phone two. Phone one returns to amber **without a refresh**.

If step 3 needs a refresh, the realtime subscription isn't firing and the session is not done, no
matter what else got built. A sign-in app that only updates when you pull to refresh is a sign-in
book with extra steps.

## 7. Members are not staff

The people in this database are not Oakdene employees acting in a work capacity. Treat their data
accordingly:

- **Collect nothing you don't need.** Username, name, PIN hash, agreement signature, check-in times.
  No phone numbers, no addresses, no health information, no emergency contacts in the app. If you
  want emergency contact details, keep them on paper in the gym.
- **PINs are never visible to anyone, including you.** The admin issues a one-time setup code; the
  member chooses their own PIN. If an admin can read a member's PIN, the signature on that member's
  agreement is worth nothing.
- **The session log is a safety record, not a monitoring tool.** It exists to show whether the
  two-person rule held. Don't grow it into attendance tracking, and don't let it leak into anything
  employment-related.
- **The gym is not an Oakdene asset.** Separate database, separate repo, separate Vercel project, so
  it never has to be untangled from the company later.

## 8. Standing gotchas

- **Supabase views need `security_invoker = true`** or they run as the view's owner and bypass RLS
  entirely. `current_occupancy` has it. Any new view needs it too.
- **Hiding the admin tab is not access control.** `/admin` checks `is_admin` server-side.
- **The service-role key never reaches the browser.** Supabase and Vercel settings only. If it ever
  appears in a client component, rotate it.
- **Realtime needs the table added to the publication.** `check_ins` and `bookings` are in
  `0001_init.sql`. A new table that drives a live screen has to be added explicitly or it just
  silently never updates.
- **Long-lived sessions are a feature, not a leak.** Members should not re-enter a PIN every visit,
  or they'll stop signing in. Persist the session and refresh it in the background.
- **Test the home-screen icon specifically.** A page that works in Safari and drops the session when
  launched from the home screen is the single most likely reason this gets abandoned.
- **WhatsApp will not open an `.html` file.** Share a URL, never the file.

## 9. The build, step by step

One session per chat. Verify before moving on.

| # | Session | Done when |
|---|---|---|
| 1 | Supabase project, run `0001_init.sql`, create the first admin by hand | Tables and policies visible in the dashboard; you can sign in as `jamie.mcmullan` via curl |
| 2 | Edge function deployed, pepper set, activation and lockout tested | Right PIN returns a session; five wrong PINs locks for 15 minutes |
| 3 | Auth screens and the gym status panel — nothing else | The §6 two-phone test passes |
| 4 | Booking calendar and admin screens | A non-admin account is bounced from `/admin` |
| 5 | Vercel deploy, real phones, first two members added | Both can activate, sign the agreement, add to home screen, and sign in and out |

Session 3 is the one that matters. If the status panel doesn't flip live, stop and fix it before
anything gets built on top of it.

## 10. Environment quick reference

- **Repo:** new, private, separate from `oakdene-app`.
- **Working scratch:** `C:\Users\JamieMcMullanOakdene\Downloads\working\` — `.txt` dumps only,
  outside the repo.
- **Stack:** Next.js (App Router), Supabase, Vercel. Plain CSS, no Tailwind, no component library —
  the prototype is the design system.
- **Database:** one Supabase project, London region.
- **Secrets:** `PIN_PEPPER` in Supabase function secrets. `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` and in Vercel. Service-role key in Supabase and
  Vercel settings only.
- **Shell:** PowerShell 5.1.

## 11. House style

Black `#08090a`, panel `#131518`, steel `#c9cdd2`, hazard amber `#f2c230`, valid green `#5fce85`.
Display type is heavy condensed block caps, echoing the logo; body is Archivo or system sans.
Hazard stripes appear in exactly one place — the one-person status panel — and nowhere else, which
is what makes them mean something.

Deliberately not the BMS palette. Do not import `Oakdene_Design_Schema.md`.
