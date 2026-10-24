import { ACTIVATION_BASE_SETS, findActivation } from '@/data/activation';
import { targetFor, type LoadContext, type LoadTarget } from './loads';
import type { ActivationChoice, Block, BlockKind, Day, Exercise, Machine, Range } from './types';

// Un Day diventa una lista piatta di step: è ciò che il player percorre.

export interface WorkItem {
  stepId: string;
  exerciseId: string;
  name: string;
  block: BlockKind;
  setIndex: number; // 0-based
  setCount: number;
  wave?: { index: number; count: number; pct: number; steps: { reps: number; pct: number }[] };
  reps: Range;
  meters?: Range;
  target?: LoadTarget;
  unilateral?: boolean;
  loaded?: boolean;
  notes?: string;
  partnerLabel?: string; // es. "Superset A1" / "Coppia 1"
}

export type Step =
  | { type: 'work'; id: string; work: WorkItem }
  | { type: 'rest'; id: string; seconds: Range; reason: 'set' | 'wave'; companion?: WorkItem }
  | { type: 'interval'; id: string; exerciseId: string; on: number; off: number; rounds: number; machines: Machine[] };

export interface ExpandOptions {
  activation: ActivationChoice;
  conditioning: boolean;
  ctx: LoadContext;
}

const work = (w: WorkItem): Step => ({ type: 'work', id: w.stepId, work: w });

function workItems(ex: Exercise, block: BlockKind, ctx: LoadContext): WorkItem[] {
  const p = ex.prescription;
  const base = { exerciseId: ex.id, name: ex.name, block, unilateral: ex.unilateral, loaded: ex.loaded, notes: ex.notes };
  if (p.kind === 'straight') {
    const target = p.intensity ? targetFor(p.intensity, ctx) : undefined;
    return Array.from({ length: p.sets }, (_, i) => ({ ...base, stepId: `${ex.id}:${i}`, setIndex: i, setCount: p.sets, reps: p.reps, target }));
  }
  if (p.kind === 'distance') {
    return Array.from({ length: p.sets }, (_, i) => ({ ...base, stepId: `${ex.id}:${i}`, setIndex: i, setCount: p.sets, reps: { min: 1, max: 1 }, meters: p.meters }));
  }
  return [];
}

function expandBlock(block: Block, ctx: LoadContext): Step[] {
  const steps: Step[] = [];
  const companions = new Map<string, Exercise>();
  const partners = new Map<string, Exercise>();
  for (const ex of block.exercises) {
    if (ex.pairing?.mode === 'in-rest') companions.set(ex.pairing.with, ex);
    if (ex.pairing?.mode === 'superset') partners.set(ex.pairing.with, ex);
  }

  for (const ex of block.exercises) {
    if (ex.pairing) continue; // gestito dall'esercizio ospite
    const p = ex.prescription;
    const rest = ex.rest ?? { min: 60, max: 120 };

    if (p.kind === 'wave') {
      for (let s = 0; s < p.sets; s++) {
        p.steps.forEach((st, j) => {
          const target = targetFor({ pct: st.pct, of: p.of }, ctx);
          steps.push(
            work({
              stepId: `${ex.id}:${s}:${j}`,
              exerciseId: ex.id,
              name: ex.name,
              block: block.kind,
              setIndex: s,
              setCount: p.sets,
              wave: { index: j, count: p.steps.length, pct: st.pct, steps: p.steps },
              reps: { min: st.reps, max: st.reps },
              target,
              notes: ex.notes,
            }),
          );
          if (j < p.steps.length - 1) steps.push({ type: 'rest', id: `rest:${ex.id}:${s}:${j}`, seconds: p.stepRest, reason: 'wave' });
        });
        steps.push({ type: 'rest', id: `rest:${ex.id}:${s}`, seconds: rest, reason: 'set' });
      }
      continue;
    }

    if (p.kind === 'interval') {
      steps.push({ type: 'interval', id: `${ex.id}`, exerciseId: ex.id, on: p.on, off: p.off, rounds: p.rounds, machines: p.machines });
      continue;
    }

    const hostSets = workItems(ex, block.kind, ctx);
    const companion = companions.get(ex.id);
    const partner = partners.get(ex.id);
    const compSets = companion ? workItems(companion, block.kind, ctx) : [];
    const partnerSets = partner ? workItems(partner, block.kind, ctx) : [];
    const partnerRest = partner?.rest ?? rest;

    hostSets.forEach((w, i) => {
      if (partner) {
        steps.push(work({ ...w, partnerLabel: `Superset A${i + 1}` }));
        if (partnerSets[i]) steps.push(work({ ...partnerSets[i], partnerLabel: `Superset B${i + 1}` }));
        steps.push({ type: 'rest', id: `rest:${w.stepId}`, seconds: partnerRest, reason: 'set' });
        return;
      }
      steps.push(work(w));
      steps.push({ type: 'rest', id: `rest:${w.stepId}`, seconds: rest, reason: 'set', companion: compSets[i] });
    });
  }

  // nessun recupero a fine blocco: si passa al blocco successivo
  while (steps.length && steps[steps.length - 1].type === 'rest') steps.pop();
  return steps;
}

function expandActivation(choice: ActivationChoice): Step[] {
  const steps: Step[] = [];
  const sets = ACTIVATION_BASE_SETS + choice.extraSets;
  choice.pairs.forEach((pair, p) => {
    for (let s = 0; s < sets; s++) {
      pair.forEach((id, k) => {
        const a = findActivation(id);
        if (!a) return;
        steps.push(
          work({
            stepId: `act:${p}:${k}:${s}`,
            exerciseId: a.id,
            name: a.name,
            block: 'activation',
            setIndex: s,
            setCount: sets,
            reps: a.reps,
            notes: a.notes,
            partnerLabel: `Coppia ${p + 1} · ${k === 0 ? 'A' : 'B'}`,
          }),
        );
      });
    }
  });
  return steps;
}

export function expandDay(day: Day, opts: ExpandOptions): Step[] {
  const steps: Step[] = [];
  for (const block of day.blocks) {
    if (block.kind === 'activation') steps.push(...expandActivation(opts.activation));
    else if (block.optional && !opts.conditioning) continue;
    else steps.push(...expandBlock(block, opts.ctx));
  }
  return steps;
}

/** Tutte le serie (inclusi i lavori svolti durante i recuperi) nell'ordine di esecuzione. */
export function workItemsOf(steps: Step[]): WorkItem[] {
  const out: WorkItem[] = [];
  for (const s of steps) {
    if (s.type === 'work') out.push(s.work);
    if (s.type === 'rest' && s.companion) out.push(s.companion);
  }
  return out;
}

/** Numero di serie obbligatorie (escluso il conditioning). */
export function mandatoryWorkCount(steps: Step[]): number {
  return workItemsOf(steps).filter((w) => w.block !== 'conditioning').length;
}
