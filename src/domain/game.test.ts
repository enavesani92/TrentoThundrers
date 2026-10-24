import { describe, expect, it } from 'vitest';
import { PROGRAM } from '@/data/program';
import { proposeActivation } from './activation';
import { expandDay, mandatoryWorkCount, workItemsOf } from './session';
import { avatarStats, canUseTimeout, driveYards, earnedBadges, levelFor, sessionXp, streak, unlockedCosmetics } from './game';
import { oneRmProposals, prEvents } from './progress';
import { targetKg } from './loads';
import type { DayId, SessionLog, SetLog } from './types';

const ctx = {
  oneRm: { squat: { value: 140, source: 'tested' as const, date: '2026-01-01' }, deadlift: { value: 180, source: 'tested' as const, date: '2026-01-01' } },
  bodyweight: 80,
  rounding: 2.5 as const,
};

/** Seduta completa simulata, come se l'atleta avesse eseguito esattamente la scheda. */
function fullSession(dayId: DayId, at: Date, opts: { conditioning?: boolean; override?: (l: SetLog) => SetLog } = {}): SessionLog {
  const activation = proposeActivation(PROGRAM[dayId]);
  const steps = expandDay(PROGRAM[dayId], { activation, conditioning: !!opts.conditioning, ctx });
  const t = at.getTime();
  const sets = workItemsOf(steps).map((w, i): SetLog => {
    const kg = w.target ? targetKg(w.target) : undefined;
    const l: SetLog = { stepId: w.stepId, exerciseId: w.exerciseId, block: w.block, setIndex: w.setIndex, waveIndex: w.wave?.index, prescribed: { reps: w.reps.min, kg }, actual: { reps: w.reps.min, kg }, at: t + i };
    return opts.override ? opts.override(l) : l;
  });
  return {
    dayId,
    startedAt: t - 3_600_000,
    finishedAt: t,
    activation,
    conditioning: opts.conditioning ? { machine: 'bike', rounds: 12, roundsDone: 12 } : undefined,
    sets,
    restsSkipped: 0,
    totalWorkSteps: mandatoryWorkCount(steps),
  };
}

// lunedì 5 ottobre 2026
const day = (d: number) => new Date(2026, 9, 5 + d, 18);

describe('XP', () => {
  it('Day 1 completo: 27 serie + attivazione + seduta completa', () => {
    const xp = sessionXp(fullSession(1, day(0)));
    expect(xp).toMatchObject({ sets: 270, activation: 30, complete: 100, conditioning: 0, total: 400 });
  });
  it('Day 2: gli step dell’onda valgono 5 XP', () => {
    // plyo 9 + trazioni 3 + ipertrofia 6 = 18 serie × 10, + 18 step × 5
    expect(sessionXp(fullSession(2, day(0))).sets).toBe(180 + 90);
  });
  it('conditioning completo +40', () => {
    expect(sessionXp(fullSession(3, day(0), { conditioning: true })).conditioning).toBe(40);
  });
  it('nessun bonus per carichi oltre la prescrizione', () => {
    const heavy = fullSession(1, day(0), { override: (l) => ({ ...l, actual: { ...l.actual, kg: l.actual.kg ? l.actual.kg + 20 : undefined } }) });
    expect(sessionXp(heavy).total).toBe(sessionXp(fullSession(1, day(0))).total);
  });
  it('seduta parziale: niente bonus completamento', () => {
    const s = fullSession(1, day(0));
    s.sets = s.sets.slice(0, 10);
    expect(sessionXp(s).complete).toBe(0);
  });
});

describe('livelli', () => {
  it('soglie', () => {
    expect(levelFor(0).name).toBe('Rookie');
    expect(levelFor(499).name).toBe('Rookie');
    expect(levelFor(500).name).toBe('Practice Squad');
    expect(levelFor(1000).progress).toBeCloseTo(0.5);
    expect(levelFor(25000)).toMatchObject({ name: 'Thunder Legend', progress: 1, next: undefined });
  });
});

describe('drive e streak', () => {
  it('3 sedute = touchdown', () => {
    expect([0, 1, 2, 3].map(driveYards)).toEqual([0, 33, 67, 100]);
  });
  const week = (w: number) => [0, 2, 4].map((d) => fullSession(1, day(w * 7 + d)));
  it('settimane complete consecutive', () => {
    const sessions = [...week(0), ...week(1), ...week(2)];
    expect(streak(sessions, [], day(2 * 7 + 5).getTime())).toEqual({ current: 3, best: 3 });
  });
  it('la settimana in corso incompleta non interrompe la serie', () => {
    const sessions = [...week(0), ...week(1), fullSession(1, day(14))];
    expect(streak(sessions, [], day(15).getTime()).current).toBe(2);
  });
  it('una settimana saltata azzera, un timeout no', () => {
    const sessions = [...week(0), ...week(2)];
    const now = day(2 * 7 + 5).getTime();
    expect(streak(sessions, [], now).current).toBe(1);
    expect(streak(sessions, ['2026-10-12'], now).current).toBe(2);
  });
  it('un solo timeout al mese', () => {
    expect(canUseTimeout([], '2026-10-12')).toBe(true);
    expect(canUseTimeout(['2026-10-05'], '2026-10-12')).toBe(false);
    expect(canUseTimeout(['2026-10-05'], '2026-11-02')).toBe(true);
  });
});

describe('statistiche', () => {
  it('8 settimane di scheda completa = 100 su tutto', () => {
    const sessions: SessionLog[] = [];
    for (let w = 0; w < 8; w++) ([1, 2, 3] as const).forEach((d, i) => sessions.push(fullSession(d, day(w * 7 + i * 2), { conditioning: true })));
    const stats = avatarStats(sessions, day(8 * 7 - 1).getTime());
    expect(Object.values(stats).every((v) => v === 100)).toBe(true);
  });
  it('senza conditioning la resistenza resta a 0', () => {
    expect(avatarStats([fullSession(1, day(0))], day(1).getTime()).endurance).toBe(0);
  });
});

describe('badge', () => {
  it('Primo Snap, Touchdown, Wave Rider', () => {
    const sessions = [fullSession(1, day(0)), fullSession(2, day(2)), fullSession(3, day(4))];
    const ids = earnedBadges(sessions, [], []).map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(['primo-snap', 'touchdown', 'wave-rider']));
    expect(ids).not.toContain('iron-thunder');
  });
  it('Iron Thunder con un nuovo record stimato', () => {
    const s = fullSession(1, day(0), { override: (l) => (l.exerciseId === 'd1-deadlift' ? { ...l, actual: { kg: 180, reps: 3 } } : l) });
    const history = [{ lift: 'deadlift' as const, value: 180, source: 'tested' as const, date: '2026-01-01' }];
    expect(prEvents([s], history)).toHaveLength(1);
    expect(earnedBadges([s], history, []).map((b) => b.id)).toContain('iron-thunder');
  });
  it('sblocchi estetici da livello e badge', () => {
    expect(unlockedCosmetics(0, [])).toEqual([]);
    expect(unlockedCosmetics(2, ['touchdown'])).toEqual(['stripes', 'gloves', 'away']);
  });
});

describe('proposta 1RM', () => {
  it('solo se una serie affidabile supera il 1RM, mai automatica', () => {
    const s = fullSession(1, day(0), { override: (l) => (l.exerciseId === 'd1-deadlift' && l.setIndex === 0 ? { ...l, actual: { kg: 175, reps: 3 } } : l) });
    expect(oneRmProposals(s, { oneRm: ctx.oneRm, bodyweight: 80 })).toEqual([{ lift: 'deadlift', current: 180, proposed: 192.5 }]);
    expect(oneRmProposals(fullSession(1, day(0)), { oneRm: ctx.oneRm })).toEqual([]);
  });
});
