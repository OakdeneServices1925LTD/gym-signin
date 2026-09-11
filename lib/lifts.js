// What gets tracked, and how each kind of record is scored.
//
// Three scoring types, because a gym record is not always a weight:
//   weight — logged as weight x reps, scored as an estimated 1RM
//   reps   — max unbroken reps, scored as the number
//   time   — a fixed distance, scored on the clock, lowest wins
//
// Estimated 1RM (Epley) exists so nobody has to attempt a true max to get on
// the board. A true one-rep max needs a spotter, and the whole point of this
// app is that people are not in here on their own taking chances.

export const LIFTS = [
  { id: 'squat',     name: 'Back squat',      type: 'weight', group: 'Barbell' },
  { id: 'bench',     name: 'Bench press',     type: 'weight', group: 'Barbell' },
  { id: 'deadlift',  name: 'Deadlift',        type: 'weight', group: 'Barbell' },
  { id: 'ohp',       name: 'Overhead press',  type: 'weight', group: 'Barbell' },
  { id: 'legpress',  name: 'Leg press',       type: 'weight', group: 'Machine' },
  { id: 'pullup',    name: 'Pull-ups',        type: 'reps',   group: 'Bodyweight' },
  { id: 'pressup',   name: 'Press-ups',       type: 'reps',   group: 'Bodyweight' },
  { id: 'run5k',     name: 'Treadmill 5k',    type: 'time',   group: 'Cardio' },
];

export const byId = (id) => LIFTS.find((l) => l.id === id);

// The three that make up a powerlifting total.
export const TOTAL_LIFTS = ['squat', 'bench', 'deadlift'];

export function e1rm(weightKg, reps) {
  if (!weightKg || !reps) return 0;
  return reps <= 1 ? Math.round(weightKg) : Math.round(weightKg * (1 + reps / 30));
}

// One comparable number per record, whatever its type.
export function score(rec) {
  const lift = byId(rec.lift);
  if (!lift) return 0;
  if (lift.type === 'weight') return e1rm(Number(rec.weight_kg), rec.reps);
  if (lift.type === 'reps') return rec.reps || 0;
  return rec.seconds || 0;             // time: lower is better, handled at sort
}

export const lowerIsBetter = (liftId) => byId(liftId)?.type === 'time';

export function formatScore(liftId, value) {
  const lift = byId(liftId);
  if (!lift || !value) return '—';
  if (lift.type === 'weight') return `${value}kg`;
  if (lift.type === 'reps') return `${value}`;
  const m = Math.floor(value / 60);
  const s = String(value % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// What the person actually did, for the line under their name.
export function formatEffort(rec) {
  const lift = byId(rec.lift);
  if (!lift) return '';
  if (lift.type === 'weight') return `${rec.weight_kg}kg × ${rec.reps}`;
  if (lift.type === 'reps') return `${rec.reps} unbroken`;
  return formatScore(rec.lift, rec.seconds);
}

export function parseTime(text) {
  const m = String(text).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
