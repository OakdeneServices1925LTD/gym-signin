import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { getMember } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Deleting removes the person AND their signed agreement and check-in history,
// because both hang off the auth user. Deactivating keeps the record.
export async function POST(req) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: 'No member given.' }, { status: 400 });

  const { user } = await getMember();
  if (user_id === user.id) {
    return NextResponse.json({ error: 'You cannot delete yourself.' }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: target } = await admin
    .from('profiles').select('is_owner, is_admin, username').eq('id', user_id).maybeSingle();
  if (!target) return NextResponse.json({ error: 'No such member.' }, { status: 404 });
  if (target.is_owner) {
    return NextResponse.json({ error: 'The owner cannot be deleted.' }, { status: 400 });
  }

  const { error } = await admin.auth.admin.deleteUser(user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: target.username });
}
