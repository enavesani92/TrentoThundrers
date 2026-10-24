import { describe, expect, it } from 'vitest';
import { intervalAt, intervalTotal } from './interval';

const spec = { on: 20, off: 20, rounds: 12, prep: 5 };

describe('interval 20/20 × 12', () => {
  it('parte con 5 s di preparazione', () => {
    expect(intervalAt(0, spec)).toMatchObject({ phase: 'prep', remaining: 5 });
  });
  it('primo ON, poi OFF', () => {
    expect(intervalAt(5, spec)).toMatchObject({ phase: 'on', round: 1, remaining: 20, roundsDone: 0 });
    expect(intervalAt(25, spec)).toMatchObject({ phase: 'off', round: 1, remaining: 20, roundsDone: 1 });
    expect(intervalAt(45, spec)).toMatchObject({ phase: 'on', round: 2 });
  });
  it('durata totale 7:45 (senza l’ultimo OFF)', () => {
    expect(intervalTotal(spec)).toBe(5 + 12 * 40 - 20);
    expect(intervalAt(intervalTotal(spec) - 0.1, spec)).toMatchObject({ phase: 'on', round: 12 });
    expect(intervalAt(intervalTotal(spec), spec)).toMatchObject({ phase: 'done', roundsDone: 12 });
  });
});
