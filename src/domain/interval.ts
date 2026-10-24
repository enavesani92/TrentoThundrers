// Stato dell'interval timer in funzione del tempo trascorso. Puro: facile da testare
// e robusto a blocchi del telefono (si ricalcola sempre dal timestamp di partenza).

export interface IntervalSpec {
  on: number;
  off: number;
  rounds: number;
  prep?: number; // conto alla rovescia iniziale
}

export interface IntervalState {
  phase: 'prep' | 'on' | 'off' | 'done';
  round: number; // 1-based (0 durante prep)
  remaining: number; // secondi alla fine della fase
  roundsDone: number; // round ON completati
}

export function intervalAt(elapsed: number, { on, off, rounds, prep = 5 }: IntervalSpec): IntervalState {
  if (elapsed < prep) return { phase: 'prep', round: 0, remaining: prep - elapsed, roundsDone: 0 };
  const t = elapsed - prep;
  const cycle = on + off;
  // l'ultimo OFF non serve: la sessione finisce con l'ultimo ON
  const total = rounds * cycle - off;
  if (t >= total) return { phase: 'done', round: rounds, remaining: 0, roundsDone: rounds };
  const idx = Math.floor(t / cycle);
  const inCycle = t - idx * cycle;
  if (inCycle < on) return { phase: 'on', round: idx + 1, remaining: on - inCycle, roundsDone: idx };
  return { phase: 'off', round: idx + 1, remaining: cycle - inCycle, roundsDone: idx + 1 };
}

export function intervalTotal({ on, off, rounds, prep = 5 }: IntervalSpec): number {
  return prep + rounds * (on + off) - off;
}
