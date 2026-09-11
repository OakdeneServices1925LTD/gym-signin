import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { AGREEMENT_VERSION } from '@/lib/config';

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try { list.forEach(({ name, value, options }) => store.set(name, value, options)); }
          catch { /* called from a server component; middleware/route handlers refresh instead */ }
        },
      },
    },
  );
}

// One place that decides where a person is allowed to be.
// Returns { user, profile, signed } or nulls.
export async function getMember() {
  const supabase = await supabaseServer();
  let user = null;
  try { ({ data: { user } } = await supabase.auth.getUser()); } catch { user = null; }
  if (!user) return { user: null, profile: null, signed: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name, is_admin, is_owner, is_active')
    .eq('id', user.id)
    .maybeSingle();

  const { data: accepted } = await supabase
    .from('agreement_acceptances')
    .select('id')
    .eq('user_id', user.id)
    .eq('version', AGREEMENT_VERSION)
    .maybeSingle();

  return { user, profile, signed: !!accepted };
}
