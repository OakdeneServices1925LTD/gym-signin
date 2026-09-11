# Shipping & Shredding — gym sign-in

Phone-first sign-in board for the gym at Oakdene House, Michelin Road, Mallusk.
Built so the two-person rule is visible to everyone in the building, live.

## Run it

```
npm install
copy .env.local.example .env.local     # then fill in your keys
npm run dev
```

Full setup — Supabase project, SQL, edge function, first admin, deploy — is in
**Gym-build-guide.pdf**. How the build is run is in **Gym_Ways_of_Working.md**.

## What's where

| Path | |
|---|---|
| `supabase/migrations/0001_init.sql` | Schema, RLS, realtime, cron, `alone_periods()`. Run this first. |
| `supabase/migrations/0002_admin_guard.sql` | Stops the last admin being removed. Run after 0001. |
| `supabase/functions/pin-auth/` | PIN activation and login. The only thing that ever sees a raw PIN. |
| `proxy.js` | Session refresh (Next 16's rename of middleware). |
| `app/page.js` | The routing gate: no session → signin, agreement unsigned → agreement. |
| `components/GymBoard.js` | The status panel. The product. |
| `lib/config.js` | Agreement version, access hours, bookable slots. |

## Rules that are not obvious

- **`AGREEMENT_VERSION` in `lib/config.js`** — bump it when you change the wording and
  everyone is made to re-sign before they can check in again.
- **`PIN_PEPPER` is set once.** Change it and every PIN in the system stops working at once.
- **`pin_state` has RLS on and no policies.** Deliberate — service role only.
- **The service-role key never goes near the browser.** Supabase and Vercel settings only.
- **A new table driving a live screen** has to be added to the realtime publication or it
  silently never updates.
- **Only an admin can make an admin,** and only via the one write policy on `profiles`.
  The button in the UI is convenience; `is_admin()` in RLS is the guarantee.
- **Admins never see a PIN.** They issue a one-time setup code; the member chooses their own.
  A PIN an admin knows makes that member's signature on the agreement worthless.
