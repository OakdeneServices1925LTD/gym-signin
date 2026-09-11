// Bump this when the wording of the agreement changes.
// Everyone is required to re-sign before they can check in again.
export const AGREEMENT_VERSION = 1;

export const GYM_NAME = 'Shipping & Shredding';
export const OWNER = 'Oakdene Services (1925) Ltd';
export const ADDRESS = 'Oakdene House, Michelin Road, Mallusk, BT36 4PT';

export const HOURS = [
  ['Monday to Friday', '5:00-8:00, 17:00-22:00'],
  ['Saturday', '6:00-20:00'],
  ['Sunday', 'Closed'],
];

// Bookable slots, local time. Index 0 = Sunday.
export const SLOTS_BY_DAY = {
  0: [],
  1: ['05:00','06:00','07:00','17:00','18:00','19:00','20:00','21:00'],
  2: ['05:00','06:00','07:00','17:00','18:00','19:00','20:00','21:00'],
  3: ['05:00','06:00','07:00','17:00','18:00','19:00','20:00','21:00'],
  4: ['05:00','06:00','07:00','17:00','18:00','19:00','20:00','21:00'],
  5: ['05:00','06:00','07:00','17:00','18:00','19:00','20:00','21:00'],
  6: ['06:00','07:00','08:00','09:00','10:00','11:00'],
};
