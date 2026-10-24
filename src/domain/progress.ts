import { findExercise } from '@/data/program';
import { epley, EPLEY_MAX_REPS, roundTo } from './loads';
import type { LiftKey, OneRmEntry, Profile, SessionLog, SetLog } from './types';

/** 1RM stimato da una serie registrata (solo esercizi che contano per un lift). */
export function setE1rm(log: SetLog, bodyweight?: number): { lift: LiftKey; value: number } | null {
  const lift = findExercise(log.exerciseId)?.e1rm;
  if (!lift || log.actual.kg === undefined || log.actual.reps < 1 || log.actual.reps > EPLEY_MAX_REPS) return null;
  const weight = lift === 'pullup' ? (bodyweight ? bodyweight + log.actual.kg : 0) : log.actual.kg;
  if (weight <= 0) return null;
  return { lift, value: epley(weight, log.actual.reps) };
}

export function sessionBest(s: SessionLog, bodyweight?: number, filter: (l: SetLog) => boolean = () => true): Partial<Record<LiftKey, number>> {
  const best: Partial<Record<LiftKey, number>> = {};
  for (const l of s.sets) {
    if (!filter(l)) continue;
    const e = setE1rm(l, bodyweight);
    if (e && e.value > (best[e.lift] ?? 0)) best[e.lift] = e.value;
  }
  return best;
}

export interface Proposal {
  lift: LiftKey;
  current: number;
  proposed: number;
}

/**
 * Proposte di aggiornamento del 1RM (mai automatiche): solo da serie affidabili
 * (≤ 6 ripetizioni o RPE ≥ 8) che superano il 1RM attuale.
 */
export function oneRmProposals(s: SessionLog, profile: Pick<Profile, 'oneRm' | 'bodyweight'>): Proposal[] {
  const best = sessionBest(s, profile.bodyweight, (l) => l.actual.reps <= 6 || (l.rpe ?? 0) >= 8);
  const out: Proposal[] = [];
  for (const [lift, value] of Object.entries(best) as [LiftKey, number][]) {
    const current = profile.oneRm[lift]?.value;
    const proposed = roundTo(value, 0.5);
    if (current && proposed > current) out.push({ lift, current, proposed });
  }
  return out;
}

export interface PrEvent {
  lift: LiftKey;
  value: number;
  at: number;
}

/** Record personali: un 1RM stimato più alto di ogni valore noto fino a quel momento. */
export function prEvents(sessions: SessionLog[], history: OneRmEntry[], bodyweight?: number): PrEvent[] {
  const best: Partial<Record<LiftKey, number>> = {};
  const hist = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const out: PrEvent[] = [];
  let h = 0;
  for (const s of [...sessions].sort((a, b) => a.finishedAt - b.finishedAt)) {
    // i 1RM inseriti prima della seduta sono il riferimento
    while (h < hist.length && Date.parse(hist[h].date) <= s.startedAt) {
      const e = hist[h++];
      best[e.lift] = Math.max(best[e.lift] ?? 0, e.value);
    }
    for (const [lift, value] of Object.entries(sessionBest(s, bodyweight)) as [LiftKey, number][]) {
      const ref = best[lift];
      if (ref !== undefined && value > ref + 0.01) out.push({ lift, value, at: s.finishedAt });
      best[lift] = Math.max(ref ?? 0, value);
    }
  }
  return out;
}

/** Serie temporale del 1RM stimato per il grafico (miglior serie di ogni seduta). */
export function e1rmSeries(sessions: SessionLog[], lift: LiftKey, bodyweight?: number): { t: number; value: number }[] {
  return sessions
    .map((s) => ({ t: s.finishedAt, value: sessionBest(s, bodyweight)[lift] }))
    .filter((p): p is { t: number; value: number } => p.value !== undefined);
}
