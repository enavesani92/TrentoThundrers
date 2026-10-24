import { ACTIVATION_BASE_SETS } from '@/data/activation';
import { BADGES } from '@/data/badges';
import { COSMETICS } from '@/data/cosmetics';
import { LEVELS, XP } from '@/data/levels';
import { DAY_IDS, PROGRAM } from '@/data/program';
import { isoDate, weekKey } from '@/lib/time';
import { prEvents } from './progress';
import type { BlockKind, OneRmEntry, SessionLog, StatKey } from './types';

// Gamification: premia costanza ed esecuzione, mai il carico oltre la prescrizione.

export interface XpBreakdown {
  sets: number;
  activation: number;
  complete: number;
  conditioning: number;
  total: number;
}

export function activationExpected(s: Pick<SessionLog, 'activation'>): number {
  return s.activation.pairs.length * 2 * (ACTIVATION_BASE_SETS + s.activation.extraSets);
}

export function isComplete(s: SessionLog): boolean {
  return s.sets.filter((l) => l.block !== 'conditioning').length >= s.totalWorkSteps;
}

export function sessionXp(s: SessionLog): XpBreakdown {
  let sets = 0;
  let act = 0;
  for (const l of s.sets) {
    if (l.block === 'activation') act++;
    else sets += l.waveIndex !== undefined ? XP.waveStep : XP.set;
  }
  const activation = act >= activationExpected(s) && act > 0 ? XP.activation : 0;
  const complete = isComplete(s) ? XP.complete : 0;
  const c = s.conditioning;
  const conditioning = c ? Math.floor((XP.conditioning * Math.min(c.roundsDone, c.rounds)) / c.rounds) : 0;
  return { sets, activation, complete, conditioning, total: sets + activation + complete + conditioning };
}

export function totalXp(sessions: SessionLog[]): number {
  return sessions.reduce((n, s) => n + sessionXp(s).total, 0);
}

export interface LevelInfo {
  index: number;
  name: string;
  xp: number;
  floor: number;
  next?: { name: string; xp: number };
  progress: number; // 0–1 verso il livello successivo
}

export function levelFor(xp: number): LevelInfo {
  let index = 0;
  LEVELS.forEach((l, i) => xp >= l.xp && (index = i));
  const cur = LEVELS[index];
  const next = LEVELS[index + 1];
  return {
    index,
    name: cur.name,
    xp,
    floor: cur.xp,
    next: next ? { name: next.name, xp: next.xp } : undefined,
    progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1,
  };
}

// ---- statistiche dell'avatar --------------------------------------------------

export const STAT_OF: Record<BlockKind, StatKey> = {
  plyo: 'power',
  strength: 'strength',
  hypertrophy: 'mass',
  conditioning: 'endurance',
  activation: 'mobility',
};

export const STAT_LABEL: Record<StatKey, string> = {
  power: 'Potenza',
  strength: 'Forza',
  mass: 'Massa',
  endurance: 'Resistenza',
  mobility: 'Mobilità',
};

export const STAT_KEYS: StatKey[] = ['power', 'strength', 'mass', 'endurance', 'mobility'];
const WINDOW_WEEKS = 8;

function statPoints(s: SessionLog): Record<StatKey, number> {
  const p: Record<StatKey, number> = { power: 0, strength: 0, mass: 0, endurance: 0, mobility: 0 };
  for (const l of s.sets) p[STAT_OF[l.block]] += 1;
  if (s.conditioning) p.endurance += s.conditioning.roundsDone;
  return p;
}

/** Punti attesi a settimana per statistica seguendo la scheda (3 sedute, conditioning incluso). */
function expectedPerWeek(): Record<StatKey, number> {
  const p: Record<StatKey, number> = { power: 0, strength: 0, mass: 0, endurance: 0, mobility: 0 };
  for (const d of DAY_IDS) {
    for (const b of PROGRAM[d].blocks) {
      for (const ex of b.exercises) {
        const pr = ex.prescription;
        if (pr.kind === 'interval') p.endurance += pr.rounds;
        else if (pr.kind === 'wave') p[STAT_OF[b.kind]] += pr.sets * pr.steps.length;
        else p[STAT_OF[b.kind]] += pr.sets;
      }
    }
    p.mobility += 2 * 2 * ACTIVATION_BASE_SETS;
  }
  return p;
}

/** Statistiche 0–100: quanto della scheda hai svolto nelle ultime 8 settimane (premia la costanza recente). */
export function avatarStats(sessions: SessionLog[], now = Date.now()): Record<StatKey, number> {
  const from = now - WINDOW_WEEKS * 7 * 86_400_000;
  const exp = expectedPerWeek();
  const got: Record<StatKey, number> = { power: 0, strength: 0, mass: 0, endurance: 0, mobility: 0 };
  for (const s of sessions) {
    if (s.finishedAt < from) continue;
    const p = statPoints(s);
    for (const k of STAT_KEYS) got[k] += p[k];
  }
  const out = {} as Record<StatKey, number>;
  for (const k of STAT_KEYS) out[k] = Math.min(100, Math.round((got[k] / (exp[k] * WINDOW_WEEKS)) * 100));
  return out;
}

// ---- drive settimanale e streak ---------------------------------------------

export const SESSIONS_PER_WEEK = 3;

export function sessionsInWeek(sessions: Pick<SessionLog, 'finishedAt'>[], key: string): number {
  return sessions.filter((s) => weekKey(s.finishedAt) === key).length;
}

/** Yard del drive (0–100): ogni seduta della settimana fa avanzare la palla, la terza è touchdown. */
export function driveYards(count: number): number {
  return Math.min(100, Math.round((count * 100) / SESSIONS_PER_WEEK));
}

function prevWeek(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return weekKey(new Date(y, m - 1, d - 7));
}

/**
 * Streak in settimane complete. La settimana in corso conta solo se già completa;
 * una settimana in "timeout" non interrompe la serie (ma non la allunga).
 */
export function streak(sessions: Pick<SessionLog, 'finishedAt'>[], timeouts: string[], now = Date.now()): { current: number; best: number } {
  const counts = new Map<string, number>();
  for (const s of sessions) counts.set(weekKey(s.finishedAt), (counts.get(weekKey(s.finishedAt)) ?? 0) + 1);
  const complete = (k: string) => (counts.get(k) ?? 0) >= SESSIONS_PER_WEEK;
  const frozen = new Set(timeouts);

  const thisWeek = weekKey(now);
  let current = 0;
  let k = thisWeek;
  if (complete(k)) current++;
  k = prevWeek(k);
  const oldest = sessions.length ? weekKey(Math.min(...sessions.map((s) => s.finishedAt))) : thisWeek;
  while (k >= oldest) {
    if (complete(k)) current++;
    else if (!frozen.has(k)) break;
    k = prevWeek(k);
  }

  // record storico
  let best = 0;
  let run = 0;
  for (let w = oldest; w <= thisWeek; ) {
    if (complete(w)) best = Math.max(best, ++run);
    else if (!frozen.has(w) && w !== thisWeek) run = 0;
    const [y, m, d] = w.split('-').map(Number);
    w = weekKey(new Date(y, m - 1, d + 7));
  }
  return { current, best: Math.max(best, current) };
}

/** Un timeout al mese (mese del lunedì della settimana congelata). */
export function canUseTimeout(timeouts: string[], key: string): boolean {
  if (timeouts.includes(key)) return false;
  return !timeouts.some((t) => t.slice(0, 7) === key.slice(0, 7));
}

// ---- badge e sblocchi ---------------------------------------------------------

export interface EarnedBadge {
  id: string;
  at: number;
}

export function earnedBadges(sessions: SessionLog[], history: OneRmEntry[], timeouts: string[], bodyweight?: number): EarnedBadge[] {
  const sorted = [...sessions].sort((a, b) => a.finishedAt - b.finishedAt);
  const earned = new Map<string, number>();
  const give = (id: string, at: number) => !earned.has(id) && earned.set(id, at);

  const weekCount = new Map<string, number>();
  const weekActivation = new Map<string, boolean>();
  const sprintMonths = new Map<string, number>();
  let conditioningDone = 0;

  sorted.forEach((s, i) => {
    give('primo-snap', s.finishedAt);
    if (i + 1 >= 10) give('doppia-cifra', s.finishedAt);
    if (i + 1 >= 50) give('veterano', s.finishedAt);

    const wk = weekKey(s.finishedAt);
    weekCount.set(wk, (weekCount.get(wk) ?? 0) + 1);
    if ((weekCount.get(wk) ?? 0) >= SESSIONS_PER_WEEK) give('touchdown', s.finishedAt);

    if (s.sets.filter((l) => l.exerciseId === 'd2-squat').length >= 18) give('wave-rider', s.finishedAt);

    if (s.dayId === 1 && s.sets.filter((l) => l.exerciseId === 'd1-sprint').length >= 5) {
      const month = isoDate(new Date(s.finishedAt)).slice(0, 7);
      sprintMonths.set(month, (sprintMonths.get(month) ?? 0) + 1);
      if ((sprintMonths.get(month) ?? 0) >= 4) give('pista-fersina', s.finishedAt);
    }

    const actOk = s.sets.filter((l) => l.block === 'activation').length >= activationExpected(s);
    weekActivation.set(wk, (weekActivation.get(wk) ?? true) && actOk);
    let run = 0;
    for (let k = wk, n = 0; n < 4; n++) {
      if (weekCount.has(k) && weekActivation.get(k)) run++;
      else break;
      k = prevWeek(k);
    }
    if (run >= 4) give('mai-a-freddo', s.finishedAt);

    if (s.conditioning && s.conditioning.roundsDone >= s.conditioning.rounds) conditioningDone++;
    if (conditioningDone >= 10) give('motore', s.finishedAt);

    if (streak(sorted.slice(0, i + 1), timeouts, s.finishedAt).current >= 4) give('drive-lungo', s.finishedAt);
  });

  const pr = prEvents(sorted, history, bodyweight)[0];
  if (pr) give('iron-thunder', pr.at);

  return BADGES.filter((b) => earned.has(b.id)).map((b) => ({ id: b.id, at: earned.get(b.id)! }));
}

export function unlockedCosmetics(levelIndex: number, badges: string[]): string[] {
  return COSMETICS.filter((c) => ('level' in c.unlock ? levelIndex >= c.unlock.level : badges.includes(c.unlock.badge))).map((c) => c.id);
}
