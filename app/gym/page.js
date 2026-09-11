import { redirect } from 'next/navigation';
import { getMember, supabaseServer } from '@/lib/supabase/server';
import GymBoard from '@/components/GymBoard';
import Tabs from '@/components/Tabs';

export const dynamic = 'force-dynamic';

export default async function GymPage() {
  const { user, profile, signed } = await getMember();
  if (!user) redirect('/signin');
  if (!profile || !profile.is_active) redirect('/signin?inactive=1');
  if (!signed) redirect('/agreement');

  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('current_occupancy')
    .select('user_id, username, full_name, checked_in_at')
    .order('checked_in_at');

  return (
    <>
      <GymBoard initial={data || []} me={{ id: user.id, username: profile.username }} />
      <Tabs isAdmin={profile.is_admin} />
    </>
  );
}
