'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import {
  LIFTS, TOTAL_LIFTS, byId, score, lowerIsBetter,
  formatScore, formatEffort, parseTime,
} from '@/lib/lifts';

const shortDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export default function RecordsBoard({ me }) {
  const supabase = supabaseBrowser();
  const [tab, setTab] = useState('mine');
  const [records, setRecords] = useState([]);
  const [names, setNames] = useState({});
  const [board, setBoard] = useState('total');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [lift, setLift] = useState('squat');
  const [weight, setWeight] = useState('100');
  const [reps, setReps] = useState('5');
  const [time, setTime] = useState('25:00');
  const [when, setWhen] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    const [{ data: recs }, { data: people }] = await Promise.all([
      supabase.from('lift_records')
        .select('id, user_id, lift, weight_kg, reps, seconds, performed_on')
        .order('performed_on', { ascending: false }),
      supabase.from('profiles').select('id, full_name'),
    ]);
    setRecords(recs || []);
    setNames(Object.fromEntries((people || []).map((p) => [p.id, p.full_name])));
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const kind = byId(lift).type;

  // Best record for one person on one lift.
  const bestFor = (userId, liftId) => {
    const rows = records.filter((r) => r.user_id === userId && r.lift === liftId);
    if (!rows.length) return null;
    return rows.reduce((a, b) =>
      lowerIsBetter(liftId)
        ? (score(b) < score(a) ? b : a)
        : (score(b) > score(a) ? b : a));
  };

  const totalFor = (userId) =>
    TOTAL_LIFTS.reduce((sum, l) => {
      const b = bestFor(userId, l);
      return sum + (b ? score(b) : 0);
    }, 0);

  const memberIds = Object.keys(names);

  async function save() {
    setBusy(true); setError('');
    const row = { user_id: me.id, lift, performed_on: when };
    if (kind === 'weight') {
      row.weight_kg = Number(weight);
      row.reps = Number(reps);
      if (!row.weight_kg || !row.reps) { setBusy(false); setError('Weight and reps, please.'); return; }
    } else if (kind === 'reps') {
      row.reps = Number(reps);
      if (!row.reps) { setBusy(false); setError('How many reps?'); return; }
    } else {
      row.seconds = parseTime(time);
      if (!row.seconds) { setBusy(false); setError('Time as minutes:seconds, e.g. 24:30.'); return; }
    }
    const { error: e } = await supabase.from('lift_records').insert(row);
    if (e) { setBusy(false); setError('Could not save that. Try again.'); return; }
    await load();
    setBusy(false); setOpen(false);
  }

  async function remove(id) {
    if (!confirm('Delete this entry?')) return;
    await supabase.from('lift_records').delete().eq('id', id);
    await load();
  }

  // live feedback while typing
  let calcLine = null;
  if (open) {
    const current = bestFor(me.id, lift);
    const currentScore = current ? score(current) : 0;
    const draft = kind === 'weight'
      ? score({ lift, weight_kg: Number(weight), reps: Number(reps) })
      : kind === 'reps'
        ? Number(reps) || 0
        : parseTime(time) || 0;
    if (draft) {
      const better = currentScore === 0 ? true
        : lowerIsBetter(lift) ? draft < currentScore : draft > currentScore;
      calcLine = kind === 'weight'
        ? `Counts as ${formatScore(lift, draft)} estimated 1RM. `
        : `${formatScore(lift, draft)}. `;
      calcLine += currentScore === 0
        ? 'First one on the board.'
        : better ? `New personal best — your last was ${formatScore(lift, currentScore)}.`
                 : `Your best stands at ${formatScore(lift, currentScore)}.`;
    }
  }

  const BOARDS = [
    { id: 'total', label: 'Total', note: 'Squat, bench and deadlift added together. The hardest one to fluke.' },
    ...LIFTS.map((l) => ({ id: l.id, label: l.name, note: l.type === 'weight'
      ? 'Best estimated 1RM, worked out from weight and reps.'
      : l.type === 'reps' ? 'Most unbroken reps.' : 'Fastest time.' })),
  ];

  const boardRows = () => {
    if (board === 'total') {
      return memberIds
        .map((id) => ({ id, value: totalFor(id), sub: 'squat + bench + deadlift' }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value);
    }
    return memberIds
      .map((id) => {
        const b = bestFor(id, board);
        return b ? { id, value: score(b), sub: formatEffort(b), raw: b } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (lowerIsBetter(board) ? a.value - b.value : b.value - a.value));
  };

  const myRecent = records.filter((r) => r.user_id === me.id).slice(0, 10);

  return (
    <main>
      <div className="segs">
        <button aria-pressed={tab === 'mine'} onClick={() => setTab('mine')}>My records</button>
        <button aria-pressed={tab === 'board'} onClick={() => setTab('board')}>Leaderboard</button>
      </div>

      {tab === 'mine' ? (
        <>
          <section className="card">
            <h2>Personal bests</h2>
            {LIFTS.map((l) => {
              const b = bestFor(me.id, l.id);
              return (
                <div className={'pb' + (b ? '' : ' none')} key={l.id}>
                  <span className="lift">
                    <b>{l.name}</b>
                    <span>{b ? `${formatEffort(b)} · ${shortDate(b.performed_on)}` : 'Nothing logged'}</span>
                  </span>
                  <span className="val">
                    <b>{b ? formatScore(l.id, score(b)) : '—'}</b>
                    <span>{l.type === 'weight' ? 'est. 1RM' : l.type === 'reps' ? 'reps' : 'time'}</span>
                  </span>
                </div>
              );
            })}
            <div className="addbar">
              <button onClick={() => setOpen(!open)}>{open ? 'Close' : 'Log a lift'}</button>
            </div>
          </section>

          {open && (
            <section className="card">
              <h2>Log a lift</h2>
              <div className="form">
                <label htmlFor="lf">Lift</label>
                <select id="lf" value={lift} onChange={(e) => setLift(e.target.value)}>
                  {LIFTS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>

                {kind === 'weight' && (
                  <div className="two">
                    <div>
                      <label htmlFor="wt">Weight (kg)</label>
                      <input id="wt" type="number" inputMode="decimal" step="2.5"
                        value={weight} onChange={(e) => setWeight(e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="rp">Reps</label>
                      <input id="rp" type="number" inputMode="numeric" min="1" max="12"
                        value={reps} onChange={(e) => setReps(e.target.value)} />
                    </div>
                  </div>
                )}
                {kind === 'reps' && (
                  <>
                    <label htmlFor="rp2">Reps, unbroken</label>
                    <input id="rp2" type="number" inputMode="numeric" min="1"
                      value={reps} onChange={(e) => setReps(e.target.value)} />
                  </>
                )}
                {kind === 'time' && (
                  <>
                    <label htmlFor="tm">Time (minutes:seconds)</label>
                    <input id="tm" type="text" inputMode="numeric" placeholder="24:30"
                      value={time} onChange={(e) => setTime(e.target.value)} />
                  </>
                )}

                {calcLine && <div className="calc">{calcLine}</div>}

                <label htmlFor="dt">Date</label>
                <input id="dt" type="date" value={when} max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setWhen(e.target.value)} />

                {error && <p className="err">{error}</p>}
                <button className="action" onClick={save} disabled={busy}>
                  {busy ? 'Saving…' : 'Save lift'}
                </button>
              </div>
            </section>
          )}

          <section className="card">
            <h2>Recent <em>Last 10</em></h2>
            <div className="hist">
              {myRecent.length === 0
                ? <div><span>Nothing logged yet.</span></div>
                : myRecent.map((r) => (
                    <div key={r.id}>
                      <span className="who">{byId(r.lift)?.name}</span>
                      <span>
                        {formatEffort(r)} · {shortDate(r.performed_on)}
                        <button className="chip" style={{ marginLeft: 8 }}
                          onClick={() => remove(r.id)}>Delete</button>
                      </span>
                    </div>
                  ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="boards">
            {BOARDS.map((b) => (
              <button key={b.id} aria-pressed={board === b.id} onClick={() => setBoard(b.id)}>
                {b.label}
              </button>
            ))}
          </div>
          <section className="card">
            <h2>{BOARDS.find((b) => b.id === board).label}</h2>
            {boardRows().length === 0
              ? <p className="empty-note">Nothing logged on this one yet. Be first.</p>
              : boardRows().map((r, i) => (
                  <div className={'lb p' + (i + 1) + (r.id === me.id ? ' me' : '')} key={r.id}>
                    <span className="pos">{i + 1}</span>
                    <span className="nm"><b>{names[r.id]}</b><span>{r.sub}</span></span>
                    <span className="sc">
                      {board === 'total' ? `${r.value}kg` : formatScore(board, r.value)}
                    </span>
                  </div>
                ))}
            <p className="legend">{BOARDS.find((b) => b.id === board).note}</p>
          </section>
        </>
      )}
    </main>
  );
}
