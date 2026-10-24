import { describe, expect, it } from 'vitest';
import { hoursSinceLast, nextDay, tooClosePairs, volumeKg } from './schedule';

describe('nextDay', () => {
  it('parte dal Day 1 e ruota', () => {
    expect(nextDay([])).toBe(1);
    expect(nextDay([{ dayId: 1, finishedAt: 1 }])).toBe(2);
    expect(nextDay([{ dayId: 3, finishedAt: 5 }, { dayId: 2, finishedAt: 1 }])).toBe(1);
  });
});

it('hoursSinceLast', () => {
  expect(hoursSinceLast([{ finishedAt: 0 }], 36 * 3_600_000)).toBe(36);
  expect(hoursSinceLast([])).toBe(Infinity);
});

describe('tooClosePairs', () => {
  it('lun/mer/ven va bene', () => {
    expect(tooClosePairs([0, 2, 4])).toEqual([]);
  });
  it('lun/mar segnalati', () => {
    expect(tooClosePairs([0, 1, 4])).toEqual([[0, 1]]);
  });
  it('dom/lun segnalati (settimana ciclica)', () => {
    expect(tooClosePairs([0, 3, 6])).toEqual([[6, 0]]);
  });
});

it('volume = kg × rip, esclusa assistenza', () => {
  expect(
    volumeKg({
      sets: [
        { actual: { kg: 100, reps: 3 } },
        { actual: { kg: -10, reps: 6 } },
        { actual: { reps: 10 } },
      ] as never,
    }),
  ).toBe(300);
});
