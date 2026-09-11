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
      .select('user_id, username, full_name, checked_in_at')
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

  const mine = people.find((p) => p.user_id === me.id);
  const total = people.length;

  async function toggle() {
    setBusy(true); setError('');
    if (mine) {
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
              <div key={p.user_id} className={'row' + (p.user_id === me.id ? ' me' : '')}>
                <span className="who">{p.full_name}</span>
                <span className="when">since {time(p.checked_in_at)}</span>
              </div>
            ))}
      </section>

      <p className="err" style={{ textAlign: 'center' }}>{error}</p>

      <button className={'action' + (mine ? ' out' : '')} type="button"
        onClick={toggle} disabled={busy}>
        {busy ? 'One second…' : mine ? 'Sign out' : 'Sign in'}
      </button>

      <section className="hours">
        <b>Access hours</b>
        <table><tbody>
          {HOURS.map(([d, h]) => (<tr key={d}><td>{d}</td><td>{h}</td></tr>))}
        </tbody></table>
      </section>

      <p className="foot">
        Last one out: alarm on, yard gates locked.<br />
        <Link href="/welcome">Add this to your home screen</Link>
      </p>
    </main>
  );
}
