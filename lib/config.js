// Bump this when the wording of the agreement changes.
// Everyone is required to re-sign before they can check in again.
export const AGREEMENT_VERSION = 1;

export const GYM_NAME = 'Shipping & Shredding';
export const OWNER = 'Oakdene Services (1925) Ltd';
export const ADDRESS = 'Oakdene House, Michelin Road, Mallusk, BT36 4PT';

export const HOURS = [
  ['Every day', 'Open 24 hours'],
];

// Bookable slots: every half hour, round the clock, every day.
// To restrict a day, replace SLOTS with a shorter list for that weekday.
const HALF_HOURLY = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

export const SLOTS_BY_DAY = {
  0: HALF_HOURLY, 1: HALF_HOURLY, 2: HALF_HOURLY, 3: HALF_HOURLY,
  4: HALF_HOURLY, 5: HALF_HOURLY, 6: HALF_HOURLY,
};
