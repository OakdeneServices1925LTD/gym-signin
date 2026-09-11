import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAdmin, emailFor, sixDigits } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const { first, last } = await req.json();
  const clean = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z]/g, '');
  const username = `${clean(first)}.${clean(last)}`;
  if (!/^[a-z]+\.[a-z]+$/.test(username)) {
    return NextResponse.json({ error: 'Need a first and last name, letters only.' }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: taken } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
  if (taken) return NextResponse.json({ error: `${username} already exists.` }, { status: 409 });

  // A long random password nobody knows. It is replaced by the member's own PIN at activation.
  const placeholder = crypto.randomUUID() + crypto.randomUUID();
  const { data: created, error: e1 } = await admin.auth.admin.createUser({
    email: emailFor(username),
    password: placeholder,
    email_confirm: true,
  });
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const fullName = `${String(first).trim()} ${String(last).trim()}`.replace(/\s+/g, ' ');
  const { error: e2 } = await admin.from('profiles').insert({
    id: created.user.id, username, full_name: fullName,
  });
  if (e2) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  const code = sixDigits();
  await admin.from('pin_state').upsert({
    user_id: created.user.id,
    activation_hash: bcrypt.hashSync(code, 10),
    failed_attempts: 0, locked_until: null,
  });

  return NextResponse.json({ username, full_name: fullName, code });
}
