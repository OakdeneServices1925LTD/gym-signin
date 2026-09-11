'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { HOURS } from '@/lib/config';

const time = (iso) =>
  new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  });

export default function GymBoard({ initial, me }) {
  const [people, setPeople] = useState(initial || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supabase = supabaseBrowser();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('current_occupancy')
      .select('id, user_id, username, full_name, guest_name, host_name, checked_in_at')
      .order('checked_in_at');
    if (data) setPeople(data);
  }, [supabase]);

  // The whole point of the app: everyone's screen changes when anyone signs in or out.
  useEffect(() => {
    const channel = supabase
      .channel('occupancy')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, load)
      .subscribe();
    const poll = setInterval(load, 60000);   // belt and braces if the socket drops
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [supabase, load]);

  const mine = people.find((p) => p.user_id === me.id && !p.guest_name);
  const myGuests = people.filter((p) => p.user_id === me.id && p.guest_name);
  const total = people.length;

  // A guest has signed nothing, so the member carries them. Name and
  // acknowledgement are both required before the row is written.
  async function signInGuest() {
    const name = prompt('Guest name (first and last):');
    if (!name || name.trim().length < 2) return;
    const ok = confirm(
      `Sign ${name.trim()} in as your guest?\n\n` +
      'They have not signed the gym agreement, so you are responsible for them ' +
      'for the whole visit. They do not train on their own, and they leave when you do.',
    );
    if (!ok) return;
    setBusy(true); setError('');
    const { error: e } = await supabase
      .from('check_ins').insert({ user_id: me.id, guest_name: name.trim() });
    if (e) setError(e.message.includes('two guests')
      ? 'You can have two guests signed in at once.'
      : 'Could not sign your guest in. Try again.');
    await load();
    setBusy(false);
  }

  async function signOutRow(id) {
    setBusy(true); setError('');
    const { error: e } = await supabase
      .from('check_ins').update({ checked_out_at: new Date().toISOString() }).eq('id', id);
    if (e) setError('Could not sign them out. Try again.');
    await load();
    setBusy(false);
  }

  async function toggle() {
    setBusy(true); setError('');
    if (mine) {
      // Signing yourself out takes your guests with you — they leave when you do.
      const { error: e } = await supabase
        .from('check_ins')
        .update({ checked_out_at: new Date().toISOString() })
        .eq('user_id', me.id)
        .is('checked_out_at', null);
      if (e) setError('Could not sign you out. Try again.');
    } else {
      const { error: e } = await supabase.from('check_ins').insert({ user_id: me.id });
      if (e) setError('Could not sign you in. Try again.');
    }
    await load();
    setBusy(false);
  }

  let cls = 's-empty', count = 'Nobody signed in', head = 'Gym empty';
  let sub = 'Sign in when you arrive. Wait for a second person before you start.';
  if (total === 1) {
    cls = 's-alone'; count = '1 person signed in'; head = 'Not a valid session';
    sub = mine
      ? 'You are on your own. Do not train until someone else signs in.'
      : `${people[0].full_name} is on their own and waiting for a second person.`;
  } else if (total > 1) {
    cls = 's-valid'; count = `${total} people signed in`; head = 'Session valid';
    sub = 'Two or more present. If it drops to one, everyone stops.';
  }

  return (
    <main>
      <section className={'status ' + cls} aria-live="polite">
        <span className="count">{count}</span>
        <h1>{head}</h1>
        <p>{sub}</p>
      </section>

      <section className="card">
        <h2>In the gym now</h2>
        {total === 0
          ? <p className="empty-note">Nobody is signed in.</p>
          : people.map((p) => (
              <div key={p.id} className={'row' + (p.user_id === me.id && !p.guest_name ? ' me' : '')}>
                <span className="who">
                  {p.full_name}
                  {p.guest_name && (
                    <em style={{ fontStyle: 'normal', fontWeight: 400, color: 'var(--dim)' }}>
                      {' '}— guest of {p.host_name}
                    </em>
                  )}
                </span>
                <span className="when">
                  since {time(p.checked_in_at)}
                  {p.guest_name && p.user_id === me.id && (
                    <button className="chip" style={{ marginLeft: 8 }}
                      disabled={busy} onClick={() => signOutRow(p.id)}>Out</button>
                  )}
                </span>
              </div>
            ))}
      </section>

      <p className="err" style={{ textAlign: 'center' }}>{error}</p>

      <button className={'action' + (mine ? ' out' : '')} type="button"
        onClick={toggle} disabled={busy}>
        {busy ? 'One second…' : mine ? 'Sign out' : 'Sign in'}
      </button>

      {mine && myGuests.length < 2 && (
        <button className="action out" type="button" style={{ fontSize: 15, padding: 14 }}
          onClick={signInGuest} disabled={busy}>
          Sign in a guest
        </button>
      )}

      <section className="hours">
        <b>Access hours</b>
        <table><tbody>
          {HOURS.map(([d, h]) => (<tr key={d}><td>{d}</td><td>{h}</td></tr>))}
        </tbody></table>
      </section>

      <p className="foot">
        Last one out: yard gates locked.<br />
        <Link href="/welcome">Add this to your home screen</Link>
      </p>
    </main>
  );
}
