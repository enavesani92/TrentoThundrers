import { describe, expect, it } from 'vitest';
import { epley, percentLoad, platesPerSide, roundTo, targetFor, type LoadContext } from './loads';

const today = '2026-10-24';
const ctx = (over: Partial<LoadContext> = {}): LoadContext => ({
  oneRm: {
    squat: { value: 140, source: 'tested', date: today },
    deadlift: { value: 180, source: 'tested', date: today },
    pullup: { value: 110, source: 'tested', date: today },
    trapbar: { value: 200, source: 'tested', date: today },
  },
  bodyweight: 85,
  rounding: 2.5,
  ...over,
});

describe('roundTo', () => {
  it('arrotonda al passo più vicino', () => {
    expect(roundTo(119, 2.5)).toBe(120);
    expect(roundTo(126, 2.5)).toBe(125);
    expect(roundTo(133, 2.5)).toBe(132.5);
    expect(roundTo(133, 1.25)).toBe(132.5);
    expect(roundTo(133.2, 1.25)).toBe(133.75);
    expect(roundTo(133, 5)).toBe(135);
  });
  it('non produce derive in virgola mobile', () => {
    expect(roundTo(0.1 * 3 * 100, 1.25)).toBe(30);
  });
});

describe('percentLoad', () => {
  it('stacco 90% di 180 = 162 → 162,5', () => {
    expect(percentLoad(180, 90, 2.5)).toBe(162.5);
  });
  it('non supera mai il 1RM', () => {
    expect(percentLoad(101, 100, 5)).toBe(100);
  });
});

describe('squat a onde 85 → 90 → 95%', () => {
  it('1RM 140, arrotondamento 2,5', () => {
    const c = ctx();
    const kg = [85, 90, 95].map((pct) => targetFor({ pct, of: 'squat' }, c));
    expect(kg.map((t) => (t.kind === 'barbell' ? t.kg : null))).toEqual([120, 125, 132.5]);
  });
  it('1RM 140, arrotondamento 5', () => {
    const c = ctx({ rounding: 5 });
    const kg = [85, 90, 95].map((pct) => targetFor({ pct, of: 'squat' }, c));
    expect(kg.map((t) => (t.kind === 'barbell' ? t.kg : null))).toEqual([120, 125, 135]);
  });
  it('ogni step è più pesante del precedente', () => {
    for (const rm of [60, 87.5, 100, 143, 220]) {
      const c = ctx({ oneRm: { squat: { value: rm, source: 'tested', date: today } } });
      const kg = [85, 90, 95].map((pct) => {
        const t = targetFor({ pct, of: 'squat' }, c);
        return t.kind === 'barbell' ? t.kg : 0;
      });
      expect(kg[1]).toBeGreaterThan(kg[0]);
      expect(kg[2]).toBeGreaterThan(kg[1]);
    }
  });
});

describe('trazioni', () => {
  it('80% di 110 totali con 85 kg di peso = 3 kg di zavorra → 2,5', () => {
    expect(targetFor({ pct: 80, of: 'pullup' }, ctx())).toEqual({ kind: 'bodyweight', mode: 'weighted', kg: 2.5, pct: 80, lift: 'pullup' });
  });
  it('se il totale è sotto il peso corporeo serve assistenza', () => {
    const t = targetFor({ pct: 80, of: 'pullup' }, ctx({ bodyweight: 95 }));
    expect(t).toEqual({ kind: 'bodyweight', mode: 'assisted', kg: 7.5, pct: 80, lift: 'pullup' });
  });
  it('senza peso corporeo il carico non è calcolabile', () => {
    expect(targetFor({ pct: 80, of: 'pullup' }, ctx({ bodyweight: undefined })).kind).toBe('missing');
  });
});

describe('trap-bar jump', () => {
  it('40% del 1RM di trap-bar', () => {
    expect(targetFor({ pct: 40, of: 'trapbar' }, ctx())).toMatchObject({ kind: 'barbell', kg: 80 });
  });
});

it('1RM mancante', () => {
  expect(targetFor({ pct: 85, of: 'bench' }, ctx()).kind).toBe('missing');
});

describe('platesPerSide', () => {
  it('132,5 kg con bilanciere da 20', () => {
    expect(platesPerSide(132.5)).toEqual({ perSide: [25, 25, 5, 1.25], remainder: 0 });
  });
  it('carico uguale o inferiore al bilanciere', () => {
    expect(platesPerSide(20).perSide).toEqual([]);
  });
  it('segnala il resto non componibile', () => {
    expect(platesPerSide(61, 20, [20, 10, 5])).toEqual({ perSide: [20], remainder: 0.5 });
  });
});

describe('epley', () => {
  it('100 kg × 5 = 116,7', () => {
    expect(epley(100, 5)).toBeCloseTo(116.67, 1);
  });
  it('1 ripetizione = carico stesso', () => {
    expect(epley(150, 1)).toBe(150);
  });
});
