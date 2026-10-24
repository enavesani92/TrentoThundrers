import type { Intensity, LiftKey, OneRm, Rounding } from './types';

export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Arrotonda al passo più vicino. Evita derive in virgola mobile (es. 132.49999). */
export function roundTo(kg: number, step: Rounding | number): number {
  const v = Math.round(kg / step) * step;
  return Math.round(v * 100) / 100;
}

/** Carico da % del 1RM, arrotondato; non supera mai il 1RM stesso. */
export function percentLoad(oneRm: number, pct: number, step: Rounding): number {
  const kg = roundTo((oneRm * pct) / 100, step);
  if (kg > oneRm) return Math.floor(oneRm / step) * step;
  return kg;
}

export type LoadTarget =
  | { kind: 'barbell'; kg: number; pct: number; lift: LiftKey }
  // trazioni: weighted = zavorra da aggiungere, assisted = kg di assistenza (elastico/macchina)
  | { kind: 'bodyweight'; mode: 'weighted' | 'assisted' | 'bodyweight'; kg: number; pct: number; lift: LiftKey }
  | { kind: 'missing'; pct: number; lift: LiftKey };

export interface LoadContext {
  oneRm: Partial<Record<LiftKey, OneRm>>;
  bodyweight?: number;
  rounding: Rounding;
}

export function targetFor(intensity: Intensity, ctx: LoadContext): LoadTarget {
  const rm = ctx.oneRm[intensity.of]?.value;
  if (!rm) return { kind: 'missing', pct: intensity.pct, lift: intensity.of };
  if (intensity.of === 'pullup') {
    // 1RM delle trazioni = peso totale (corpo + zavorra)
    if (!ctx.bodyweight) return { kind: 'missing', pct: intensity.pct, lift: intensity.of };
    const total = (rm * intensity.pct) / 100;
    const extra = roundTo(total - ctx.bodyweight, ctx.rounding);
    if (extra > 0) return { kind: 'bodyweight', mode: 'weighted', kg: extra, pct: intensity.pct, lift: 'pullup' };
    if (extra < 0) return { kind: 'bodyweight', mode: 'assisted', kg: -extra, pct: intensity.pct, lift: 'pullup' };
    return { kind: 'bodyweight', mode: 'bodyweight', kg: 0, pct: intensity.pct, lift: 'pullup' };
  }
  return { kind: 'barbell', kg: percentLoad(rm, intensity.pct, ctx.rounding), pct: intensity.pct, lift: intensity.of };
}

/** Kg da scrivere nel log (per le trazioni: zavorra positiva, assistenza negativa). */
export function targetKg(t: LoadTarget): number | undefined {
  if (t.kind === 'barbell') return t.kg;
  if (t.kind === 'bodyweight') return t.mode === 'assisted' ? -t.kg : t.kg;
  return undefined;
}

export interface PlateResult {
  perSide: number[];
  remainder: number; // kg per lato non componibili con i dischi disponibili
}

/** Dischi per lato, algoritmo greedy dal disco più pesante. */
export function platesPerSide(total: number, barKg = 20, plates = DEFAULT_PLATES): PlateResult {
  let side = Math.round(((total - barKg) / 2) * 100) / 100;
  if (side <= 0) return { perSide: [], remainder: Math.max(0, side) };
  const perSide: number[] = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (side + 1e-9 >= p) {
      perSide.push(p);
      side = Math.round((side - p) * 100) / 100;
    }
  }
  return { perSide, remainder: side };
}

/** Formula di Epley. Affidabile solo tra 1 e 10 ripetizioni. */
export function epley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export const EPLEY_MAX_REPS = 10;

export function formatKg(kg: number): string {
  return kg.toLocaleString('it-IT', { maximumFractionDigits: 2 });
}
