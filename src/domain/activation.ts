import { ACTIVATION } from '@/data/activation';
import type { ActivationChoice, Day, Region } from './types';

/**
 * Propone le 2 coppie di attivazione coerenti con la seduta.
 * `seed` (es. numero di sedute già fatte) fa ruotare gli esercizi da una volta all'altra.
 */
export function proposeActivation(day: Day, seed = 0): ActivationChoice {
  const used = new Set<string>();
  const cursor: Record<Region, number> = { upper: seed, trunk: seed, lower: seed * 2 };
  const pick = (region: Region): string => {
    const pool = ACTIVATION.filter((a) => a.region === region);
    for (let i = 0; i < pool.length; i++) {
      const cand = pool[(cursor[region] + i) % pool.length];
      if (!used.has(cand.id)) {
        cursor[region] += i + 1;
        used.add(cand.id);
        return cand.id;
      }
    }
    return pool[0].id;
  };
  const pairs = day.activationFocus.map(([a, b]) => [pick(a), pick(b)] as [string, string]);
  return { pairs, extraSets: 0 };
}
