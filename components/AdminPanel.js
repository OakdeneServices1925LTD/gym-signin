'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

const when = (iso) => new Date(iso).toLocaleString('en-GB', {
  weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
});

export default function AdminPanel({ members, occupancy, log, alone, meId }) {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [issued, setIssued] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const inGym = new Set(occupancy.map((o) => o.user_id));

  async function addMember() {
    setBusy(true); setError(''); setIssued(null);
    const res = await fetch('/api/admin/members', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ first, last }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error); return; }
    setIssued(data);
    setFirst(''); setLast('');
    router.refresh();
  }

  async function resetPin(m) {
    if (!confirm(`Issue ${m.username} a new setup code? Their current PIN stops working.`)) return;
    setBusy(true); setError(''); setIssued(null);
    const res = await fetch('/api/admin/reset', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: m.id }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error); return; }
    setIssued({ username: m.username, full_name: m.full_name, code: data.code });
    router.refresh();
  }

  async function toggleActive(m) {
    setError('');
    const { error: e } = await supabase
      .from('profiles').update({ is_active: !m.is_active }).eq('id', m.id);
    if (e) { setError(e.message); return; }
    router.refresh();
  }

  // An admin can add and remove members, issue codes, and read the whole log.
  // Give it to someone who would be handling those things anyway.
  async function toggleAdmin(m) {
    setError('');
    const making = !m.is_admin;
    const ask = making
      ? `Make ${m.full_name} an admin? They will be able to add and remove members, issue setup codes and see the full session log.`
      : `Remove admin from ${m.full_name}?`;
    if (!confirm(ask)) return;
    const { error: e } = await supabase
      .from('profiles').update({ is_admin: making }).eq('id', m.id);
    if (e) { setError(e.message); return; }
    router.refresh();
  }

  return (
    <main>
      <h2 style={{ fontSize: 22, color: '#fff', margin: '2px 0 4px' }}>Admin</h2>

      {issued && (
        <div className="code">
          <span>Setup code for {issued.full_name} ({issued.username})</span>
          <b>{issued.code}</b>
          <span>Hand this over in person. It works once and is not shown again.</span>
        </div>
      )}
      {error && <p className="err" style={{ textAlign: 'center' }}>{error}</p>}

      <section className="card">
        <h2>Members <em>{members.filter((m) => m.is_active).length} active</em></h2>
        {members.map((m) => (
          <div className="m" key={m.id}>
            <div>
              <div className="name">{m.username}</div>
              <div className="sub">
                {m.full_name}
                {m.is_admin ? ' · admin' : ''}
                {!m.activated_at ? ' · not set up yet' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {inGym.has(m.id) && <span className="chip in">In gym</span>}
              <button className={'chip' + (m.is_admin ? ' ok' : '')}
                onClick={() => toggleAdmin(m)}
                disabled={busy || m.id === meId}
                title={m.id === meId ? 'You cannot change your own admin rights' : ''}>
                {m.is_admin ? 'Admin' : 'Member'}
              </button>
              <button className="chip" onClick={() => resetPin(m)} disabled={busy}>Reset</button>
              <button className={'chip ' + (m.is_active ? 'ok' : '')}
                onClick={() => toggleActive(m)} disabled={busy || m.id === meId}>
                {m.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        ))}
        <div className="addrow">
          <input type="text" placeholder="First name" value={first}
            onChange={(e) => setFirst(e.target.value)} />
          <input type="text" placeholder="Last name" value={last}
            onChange={(e) => setLast(e.target.value)} />
          <button onClick={addMember} disabled={busy}>Add</button>
        </div>
        <p className="legend">
          Adding a member creates the username and a one-time setup code. They choose their own PIN
          — you never see it. Tap <b>Member</b> to make someone an admin. You cannot change your own
          rights, and the last admin cannot be removed.
        </p>
      </section>

      <section className="card">
        <h2>Alone in the gym <em>Last 30 days</em></h2>
        {alone.length === 0
          ? <p className="empty-note">Nobody has trained alone. Keep it that way.</p>
          : <div className="log">
              {alone.slice(0, 12).map((a, i) => (
                <div className="flag" key={i}>
                  <span>{a.username}</span>
                  <span>{when(a.started)} · {a.minutes} min alone</span>
                </div>
              ))}
            </div>}
      </section>

      <section className="card">
        <h2>Session log <em>Last 50</em></h2>
        <div className="log">
          {log.map((c) => (
            <div key={c.id} className={c.auto_closed ? 'flag' : ''}>
              <span>{c.username}</span>
              <span>
                {when(c.checked_in_at)} –{' '}
                {c.checked_out_at
                  ? new Date(c.checked_out_at).toLocaleTimeString('en-GB',
                      { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
                  : 'still in'}
                {c.auto_closed ? ' (auto)' : ''}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
