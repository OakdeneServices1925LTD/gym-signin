import { redirect } from 'next/navigation';
import { getMember } from '@/lib/supabase/server';
import AddToHomeScreen from '@/components/AddToHomeScreen';

export const dynamic = 'force-dynamic';

export default async function WelcomePage() {
  const { user, signed } = await getMember();
  if (!user) redirect('/signin');
  if (!signed) redirect('/agreement');
  return <AddToHomeScreen />;
}
