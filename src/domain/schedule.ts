import type { DayId, SessionLog } from './types';

export const MIN_HOURS_BETWEEN = 48;

/** Il giorno successivo della rotazione 1 → 2 → 3 → 1. */
export function nextDay(sessions: Pick<SessionLog, 'dayId' | 'finishedAt'>[]): DayId {
  if (!sessions.length) return 1;
  const last = sessions.reduce((a, b) => (b.finishedAt > a.finishedAt ? b : a));
  return ((last.dayId % 3) + 1) as DayId;
}

/** Ore trascorse dall'ultima seduta (Infinity se nessuna). */
export function hoursSinceLast(sessions: Pick<SessionLog, 'finishedAt'>[], now = Date.now()): number {
  if (!sessions.length) return Infinity;
  return (now - Math.max(...sessions.map((s) => s.finishedAt))) / 3_600_000;
}

/** Giorni di allenamento troppo vicini (meno di 48 h, considerando la settimana ciclica). */
export function tooClosePairs(days: number[]): [number, number][] {
  const sorted = [...days].sort((a, b) => a - b);
  const out: [number, number][] = [];
  sorted.forEach((d, i) => {
    const next = sorted[(i + 1) % sorted.length];
    const gap = (next - d + 7) % 7 || 7;
    if (sorted.length > 1 && gap < 2) out.push([d, next]);
  });
  return out;
}

export function volumeKg(s: Pick<SessionLog, 'sets'>): number {
  return s.sets.reduce((v, l) => v + (l.actual.kg && l.actual.kg > 0 ? l.actual.kg * l.actual.reps : 0), 0);
}
