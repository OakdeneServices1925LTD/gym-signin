// PIN activation + login.
// The raw PIN never touches the browser's storage and is never compared client-side.
// Deploy: supabase functions deploy pin-auth --no-verify-jwt
// Secrets: supabase secrets set PIN_PEPPER="<long random string>"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const EMAIL_DOMAIN = "members.gym.local";   // synthetic, never receives mail
const MAX_ATTEMPTS  = 5;
const LOCKOUT_MINS  = 15;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const pepper = () => Deno.env.get("PIN_PEPPER")!;
const secretFor = (pin: string) => `${pin}:${pepper()}`;   // >6 chars, satisfies Supabase
const emailFor  = (u: string) => `${u}@${EMAIL_DOMAIN}`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });

Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch (err) {
    console.error("pin-auth failed:", err);
    return json({ error: "Something went wrong at our end. Tell Jamie." }, 500);
  }
});

async function handle(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
        "access-control-max-age": "86400",
        "access-control-allow-methods": "POST, OPTIONS",
      },
    });
  }

  const { action, username, pin, code } = await req.json().catch(() => ({}));
  if (!username || !/^[a-z]+\.[a-z]+[0-9]*$/.test(username)) {
    return json({ error: "Check your username. It looks like firstname.lastname." }, 400);
  }
  if (!/^[0-9]{4}$/.test(pin ?? "")) {
    return json({ error: "PIN must be 4 digits." }, 400);
  }

  const { data: profile } = await admin
    .from("profiles").select("id, is_active, activated_at").eq("username", username).maybeSingle();

  // Same message whether the username is wrong or the PIN is wrong —
  // don't confirm to a stranger which usernames exist.
  const badCreds = () => json({ error: "Username or PIN not recognised." }, 401);
  if (!profile) return badCreds();
  if (!profile.is_active) return json({ error: "This account is not active. Speak to an admin." }, 403);

  const { data: st } = await admin
    .from("pin_state").select("*").eq("user_id", profile.id).maybeSingle();

  if (st?.locked_until && new Date(st.locked_until) > new Date()) {
    return json({ error: `Locked for ${LOCKOUT_MINS} minutes after too many wrong PINs. An admin can reset it.` }, 429);
  }

  const fail = async () => {
    const n = (st?.failed_attempts ?? 0) + 1;
    await admin.from("pin_state").upsert({
      user_id: profile.id,
      failed_attempts: n,
      locked_until: n >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINS * 60_000).toISOString()
        : null,
    });
    return n >= MAX_ATTEMPTS
      ? json({ error: "Too many wrong attempts. Locked for 15 minutes." }, 429)
      : json({ error: `Wrong PIN. ${MAX_ATTEMPTS - n} attempts left.` }, 401);
  };

  const signIn = async () => {
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false },
    });
    const { data, error } = await anon.auth.signInWithPassword({
      email: emailFor(username),
      password: secretFor(pin),
    });
    if (error) return badCreds();
    await admin.from("pin_state")
      .upsert({ user_id: profile.id, failed_attempts: 0, locked_until: null });
    return json({ session: data.session });
  };

  // ---- first time: exchange the one-time code for a PIN of their own ----
  if (action === "activate") {
    if (profile.activated_at) {
      return json({ error: "This account is already set up. Sign in with your PIN." }, 409);
    }
    if (!st?.activation_hash || !code) return badCreds();
    if (!bcrypt.compareSync(String(code), st.activation_hash)) return await fail();

    const { error } = await admin.auth.admin.updateUserById(profile.id, {
      password: secretFor(pin),
    });
    if (error) return json({ error: "Could not set that PIN. Try again." }, 500);

    await admin.from("profiles").update({ activated_at: new Date().toISOString() }).eq("id", profile.id);
    await admin.from("pin_state").upsert({
      user_id: profile.id,
      activation_hash: null,
      failed_attempts: 0,
      locked_until: null,
      pin_set_at: new Date().toISOString(),
    });
    return await signIn();
  }

  // ---- every time after that ----
  if (action === "login") {
    if (!profile.activated_at) {
      return json({ error: "Set your account up first with the code your admin gave you." }, 409);
    }
    const res = await signIn();
    if (res.status === 401) return await fail();
    return res;
  }

  return json({ error: "Unknown action." }, 400);
}
