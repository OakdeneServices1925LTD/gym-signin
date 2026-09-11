import { redirect } from 'next/navigation';
import { getMember } from '@/lib/supabase/server';
import BookBoard from '@/components/BookBoard';
import Tabs from '@/components/Tabs';

export const dynamic = 'force-dynamic';

export default async function BookPage() {
  const { user, profile, signed } = await getMember();
  if (!user) redirect('/signin');
  if (!profile || !profile.is_active) redirect('/signin?inactive=1');
  if (!signed) redirect('/agreement');

  return (
    <>
      <BookBoard me={{ id: user.id }} />
      <Tabs isAdmin={profile.is_admin} />
    </>
  );
}
