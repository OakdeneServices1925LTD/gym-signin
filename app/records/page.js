import { redirect } from 'next/navigation';
import { getMember } from '@/lib/supabase/server';
import RecordsBoard from '@/components/RecordsBoard';
import Tabs from '@/components/Tabs';

export const dynamic = 'force-dynamic';

export default async function RecordsPage() {
  const { user, profile, signed } = await getMember();
  if (!user) redirect('/signin');
  if (!profile || !profile.is_active) redirect('/signin?inactive=1');
  if (!signed) redirect('/agreement');

  return (
    <>
      <RecordsBoard me={{ id: user.id }} />
      <Tabs isAdmin={profile.is_admin} />
    </>
  );
}
