import { redirect } from 'next/navigation';
import { getMember } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// The one gate. Everything else assumes you got past it.
export default async function Home() {
  const { user, profile, signed } = await getMember();
  if (!user) redirect('/signin');
  if (!profile || !profile.is_active) redirect('/signin?inactive=1');
  if (!signed) redirect('/agreement');
  redirect('/gym');
}
