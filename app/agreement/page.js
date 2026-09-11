import { redirect } from 'next/navigation';
import { getMember } from '@/lib/supabase/server';
import AgreementForm from '@/components/AgreementForm';

export const dynamic = 'force-dynamic';

export default async function AgreementPage() {
  const { user, profile, signed } = await getMember();
  if (!user) redirect('/signin');
  if (signed) redirect('/gym');
  return <AgreementForm fullName={profile?.full_name} />;
}
