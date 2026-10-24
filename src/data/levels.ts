// Ruoli a tema football, con XP cumulativi necessari.
export const LEVELS = [
  { name: 'Rookie', xp: 0 },
  { name: 'Practice Squad', xp: 500 },
  { name: 'Special Teams', xp: 1500 },
  { name: 'Starter', xp: 3500 },
  { name: 'Captain', xp: 7000 },
  { name: 'All-Pro', xp: 12000 },
  { name: 'Thunder Legend', xp: 20000 },
] as const;

export const XP = {
  set: 10,
  waveStep: 5,
  activation: 30,
  complete: 100,
  conditioning: 40,
} as const;
