import { redirect } from 'next/navigation';
import { getMember, supabaseServer } from '@/lib/supabase/server';
import AdminPanel from '@/components/AdminPanel';
import Tabs from '@/components/Tabs';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const { user, profile, signed } = await getMember();
  if (!user) redirect('/signin');
  if (!signed) redirect('/agreement');
  if (!profile?.is_admin) redirect('/gym');        // server-side, not a hidden tab

  const supabase = await supabaseServer();
  const [{ data: members }, { data: occupancy }, { data: raw }, { data: alone }] = await Promise.all([
    supabase.from('profiles')
      .select('id, username, full_name, is_admin, is_owner, is_active, activated_at')
      .order('username'),
    supabase.from('current_occupancy').select('user_id'),
    supabase.from('check_ins')
      .select('id, user_id, checked_in_at, checked_out_at, auto_closed')
      .order('checked_in_at', { ascending: false }).limit(50),
    supabase.rpc('alone_periods'),
  ]);

  const names = Object.fromEntries((members || []).map((m) => [m.id, m.username]));
  const log = (raw || []).map((c) => ({ ...c, username: names[c.user_id] || 'unknown' }));

  return (
    <>
      <AdminPanel
        members={members || []}
        occupancy={occupancy || []}
        log={log}
        alone={alone || []}
        meId={user.id}
        isOwner={!!profile.is_owner}
      />
      <Tabs isAdmin />
    </>
  );
}
