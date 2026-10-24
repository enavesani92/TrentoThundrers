import { describe, expect, it } from 'vitest';
import { PROGRAM } from '@/data/program';
import { ACTIVATION } from '@/data/activation';
import { proposeActivation } from './activation';
import { expandDay, mandatoryWorkCount, workItemsOf, type Step } from './session';
import type { LoadContext } from './loads';

const today = '2026-10-24';
const ctx: LoadContext = {
  oneRm: { squat: { value: 140, source: 'tested', date: today }, deadlift: { value: 180, source: 'tested', date: today } },
  bodyweight: 80,
  rounding: 2.5,
};

const expand = (day: 1 | 2 | 3, conditioning = false, extraSets: 0 | 1 | 2 = 0) =>
  expandDay(PROGRAM[day], { activation: { ...proposeActivation(PROGRAM[day]), extraSets }, conditioning, ctx });

const workIds = (steps: Step[]) => steps.filter((s) => s.type === 'work').map((s) => (s.type === 'work' ? s.work.exerciseId : ''));

describe('Day 1: sprint e lanci con palla medica', () => {
  const steps = expand(1);
  it('5 sprint con i lanci nelle 4 pause intermedie', () => {
    const sprintIdx = steps.flatMap((s, i) => (s.type === 'work' && s.work.exerciseId === 'd1-sprint' ? [i] : []));
    expect(sprintIdx).toHaveLength(5);
    const rests = sprintIdx.map((i) => steps[i + 1]);
    rests.slice(0, 4).forEach((r, k) => {
      expect(r.type).toBe('rest');
      if (r.type === 'rest') {
        expect(r.companion?.exerciseId).toBe('d1-medball');
        expect(r.companion?.setIndex).toBe(k);
        expect(r.seconds.min).toBe(180);
      }
    });
    const last = rests[4];
    expect(last.type === 'rest' && last.companion).toBeFalsy();
  });
  it('i lanci non compaiono come step a sé', () => {
    expect(workIds(steps)).not.toContain('d1-medball');
    expect(workItemsOf(steps).filter((w) => w.exerciseId === 'd1-medball')).toHaveLength(4);
  });
  it('lo stacco è al 90%', () => {
    const dl = steps.find((s) => s.type === 'work' && s.work.exerciseId === 'd1-deadlift');
    expect(dl?.type === 'work' && dl.work.target).toMatchObject({ kind: 'barbell', kg: 162.5 });
  });
  it('il conditioning compare solo se scelto', () => {
    expect(steps.some((s) => s.type === 'interval')).toBe(false);
    expect(expand(1, true).at(-1)).toMatchObject({ type: 'interval', on: 20, off: 20, rounds: 12 });
  });
  it('nessun recupero a fine blocco', () => {
    steps.forEach((s, i) => {
      if (s.type !== 'rest') return;
      const next = steps[i + 1];
      const prev = steps[i - 1];
      expect(next).toBeDefined();
      if (prev.type === 'work' && next.type === 'work') expect(prev.work.block).toBe(next.work.block);
    });
  });
});

describe('Day 2: squat a onde', () => {
  const steps = expand(2);
  const squat = steps.filter((s) => s.type === 'work' && s.work.exerciseId === 'd2-squat');
  it('6 serie × 3 step = 18 step', () => {
    expect(squat).toHaveLength(18);
  });
  it('ogni serie: 3 @ 120, 2 @ 125, 1 @ 132,5', () => {
    for (let s = 0; s < 6; s++) {
      const set = squat.slice(s * 3, s * 3 + 3).map((x) => (x.type === 'work' ? [x.work.reps.min, x.work.target?.kind === 'barbell' ? x.work.target.kg : 0] : []));
      expect(set).toEqual([
        [3, 120],
        [2, 125],
        [1, 132.5],
      ]);
    }
  });
  it('recupero breve tra gli step e 3–4 min tra le serie', () => {
    const first = steps.findIndex((s) => s.type === 'work' && s.work.exerciseId === 'd2-squat');
    const seq = steps.slice(first, first + 6).map((s) => (s.type === 'rest' ? `${s.reason}:${s.seconds.min}-${s.seconds.max}` : 'W'));
    expect(seq).toEqual(['W', 'wave:60-90', 'W', 'wave:60-90', 'W', 'set:180-240']);
  });
});

describe('Day 3: superset lat machine ↔ single-leg squat', () => {
  const steps = expand(3);
  it('A1 B1 recupero A2 B2 recupero A3 B3', () => {
    const start = steps.findIndex((s) => s.type === 'work' && s.work.exerciseId === 'd3-lat');
    const seq = steps.slice(start).map((s) => (s.type === 'work' ? s.work.partnerLabel : s.type));
    expect(seq).toEqual(['Superset A1', 'Superset B1', 'rest', 'Superset A2', 'Superset B2', 'rest', 'Superset A3', 'Superset B3']);
  });
  it('trap-bar jump senza 1RM di trap-bar → carico mancante', () => {
    const tj = steps.find((s) => s.type === 'work' && s.work.exerciseId === 'd3-trapjump');
    expect(tj?.type === 'work' && tj.work.target?.kind).toBe('missing');
  });
});

describe('attivazione', () => {
  it('2 coppie, 2 serie ciascuno, in alternanza', () => {
    const steps = expand(1);
    const act = steps.filter((s) => s.type === 'work' && s.work.block === 'activation');
    expect(act).toHaveLength(8);
    const labels = act.map((s) => (s.type === 'work' ? s.work.partnerLabel : ''));
    expect(labels.slice(0, 4)).toEqual(['Coppia 1 · A', 'Coppia 1 · B', 'Coppia 1 · A', 'Coppia 1 · B']);
  });
  it('"Mi sento freddo" aggiunge serie', () => {
    const act = expand(1, false, 2).filter((s) => s.type === 'work' && s.work.block === 'activation');
    expect(act).toHaveLength(16);
  });
  it('Day 1 propone una coppia lower e una upper, senza duplicati', () => {
    for (let seed = 0; seed < 10; seed++) {
      const { pairs } = proposeActivation(PROGRAM[1], seed);
      const region = (id: string) => ACTIVATION.find((a) => a.id === id)?.region;
      expect(pairs[0].map(region)).toEqual(['lower', 'lower']);
      expect(pairs[1].map(region)).toEqual(['upper', 'upper']);
      expect(new Set(pairs.flat()).size).toBe(4);
    }
  });
  it('la proposta ruota tra le sedute', () => {
    expect(proposeActivation(PROGRAM[1], 0)).not.toEqual(proposeActivation(PROGRAM[1], 1));
  });
});

it('conteggio serie obbligatorie Day 1', () => {
  // attivazione 8 + sprint 5 + lanci 4 + box jump 3 + stacco 5 + panca 4 + bulgarian 3 + ohp 3
  expect(mandatoryWorkCount(expand(1))).toBe(35);
});
