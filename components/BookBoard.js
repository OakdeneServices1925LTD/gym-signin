'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { SLOTS_BY_DAY } from '@/lib/config';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August',
  'September','October','November','December'];

// A slot is a wall-clock time in Mallusk. Turn that into a real instant.
function slotToISO(ymd, hhmm) {
  const asUtc = new Date(`${ymd}T${hhmm}:00Z`);
  const londonHour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false })
      .format(asUtc),
  );
  let offset = londonHour - Number(hhmm.slice(0, 2));
  if (offset > 12) offset -= 24;
  if (offset < -12) offset += 24;
  return new Date(asUtc.getTime() - offset * 3600000).toISOString();
}

const ymd = (d) => d.toISOString().slice(0, 10);

export default function BookBoard({ me }) {
  const supabase = supabaseBrowser();
  const [sel, setSel] = useState(0);
  const [rows, setRows] = useState([]);
  const [names, setNames] = useState({});
  const [busy, setBusy] = useState('');

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const load = useCallback(async () => {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(from); to.setDate(to.getDate() + 8);
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from('bookings').select('id, slot_at, user_id')
        .gte('slot_at', from.toISOString()).lt('slot_at', to.toISOString()),
      supabase.from('profiles').select('id, full_name'),
    ]);
    setRows(b || []);
    setNames(Object.fromEntries((p || []).map((x) => [x.id, x.full_name])));
  }, [supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, load]);

  const forSlot = (iso) => rows.filter((r) => r.slot_at === iso ||
    new Date(r.slot_at).getTime() === new Date(iso).getTime());

  async function toggle(iso) {
    setBusy(iso);
    const existing = forSlot(iso).find((r) => r.user_id === me.id);
    if (existing) await supabase.from('bookings').delete().eq('id', existing.id);
    else await supabase.from('bookings').insert({ slot_at: iso, user_id: me.id });
    await load();
    setBusy('');
  }

  const day = days[sel];
  const slots = SLOTS_BY_DAY[day.getDay()] || [];

  return (
    <main>
      <h2 style={{ fontSize: 22, color: '#fff', margin: '2px 0 12px' }}>Book a slot</h2>

      <div className="days" role="group" aria-label="Choose a day">
        {days.map((d, i) => {
          const list = SLOTS_BY_DAY[d.getDay()] || [];
          const on = list.filter((t) => forSlot(slotToISO(ymd(d), t)).length >= 2).length;
          const closed = list.length === 0;
          return (
            <button key={i} type="button" className={'day' + (closed ? ' closed' : '')}
              aria-pressed={i === sel} disabled={closed} onClick={() => setSel(i)}>
              <span>{DAYS[d.getDay()].slice(0, 3)}</span>
              <b>{d.getDate()}</b>
              <i>{closed ? 'closed' : on ? `${on} on` : 'free'}</i>
            </button>
          );
        })}
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>
          <span>{DAYS[day.getDay()]} {day.getDate()} {MONTHS[day.getMonth()]}</span>
        </h2>
        {slots.length === 0
          ? <p className="empty-note">Closed on Sundays.</p>
          : slots.map((t) => {
              const iso = slotToISO(ymd(day), t);
              const here = forSlot(iso);
              const joined = here.some((r) => r.user_id === me.id);
              const cls = here.length >= 2 ? ' lit' : here.length === 1 ? ' warn' : '';
              return (
                <div className={'slot' + cls} key={t}>
                  <span className="t">{t}</span>
                  <span className="who">
                    {here.length === 0 ? (
                      <><b>Nobody yet</b>Be first — you need one more.</>
                    ) : here.length === 1 ? (
                      <><b>{names[here[0].user_id] || 'Someone'}</b>
                        <span className="need">Needs one more to run</span></>
                    ) : (
                      <><b>{here.map((r) => names[r.user_id] || 'Someone').join(', ')}</b>
                        <span className="on">Running — {here.length} down</span></>
                    )}
                  </span>
                  <button type="button" className={joined ? 'joined' : ''}
                    disabled={busy === iso} onClick={() => toggle(iso)}>
                    {joined ? 'Booked' : 'Book'}
                  </button>
                </div>
              );
            })}
        <p className="legend">
          A slot is only on when two people are down for it. Booking is not signing in — you still
          sign in at the door.
        </p>
      </section>
    </main>
  );
}
