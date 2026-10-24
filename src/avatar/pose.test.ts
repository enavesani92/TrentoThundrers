import { describe, expect, it } from 'vitest';
import { DURATION, poseAt } from './pose';

describe('poseAt', () => {
  it('con animazioni ridotte la posa è sempre statica', () => {
    for (const a of ['idle', 'hop', 'cheer', 'flex', 'thunder'] as const) expect(poseAt(a, 0.3, true)).toEqual(poseAt('idle', 0, true));
  });
  it('il saltello sale e ritorna a terra', () => {
    expect(poseAt('hop', DURATION.hop / 2).y).toBeGreaterThan(0.3);
    expect(poseAt('hop', DURATION.hop).y).toBe(0);
  });
  it('i fulmini compaiono solo durante il level-up', () => {
    expect(poseAt('thunder', DURATION.thunder / 2).bolts).toBeGreaterThan(0.5);
    expect(poseAt('cheer', 1).bolts).toBe(0);
  });
  it("l'esultanza alza le braccia", () => {
    expect(poseAt('cheer', 1).armL).toBeGreaterThan(2);
  });
});
