import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAdmin, sixDigits } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Issues a fresh setup code and puts the member back to square one.
// The admin never sees, sets, or recovers anybody's PIN.
export async function POST(req) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: 'No member given.' }, { status: 400 });

  const admin = supabaseAdmin();
  const placeholder = crypto.randomUUID() + crypto.randomUUID();
  await admin.auth.admin.updateUserById(user_id, { password: placeholder });
  await admin.from('profiles').update({ activated_at: null }).eq('id', user_id);

  const code = sixDigits();
  await admin.from('pin_state').upsert({
    user_id,
    activation_hash: bcrypt.hashSync(code, 10),
    failed_attempts: 0, locked_until: null, pin_set_at: null,
  });

  return NextResponse.json({ code });
}
