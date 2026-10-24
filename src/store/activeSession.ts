import { create } from 'zustand';
import { db } from '@/db/db';
import { PROGRAM } from '@/data/program';
import { expandDay, mandatoryWorkCount, type Step, type WorkItem } from '@/domain/session';
import { targetKg, type LoadContext } from '@/domain/loads';
import type { ActivationChoice, ConditioningLog, DayId, Machine, SessionLog, SetLog } from '@/domain/types';

// Seduta in corso. Viene salvata in IndexedDB a ogni modifica: se il telefono si blocca
// o l'app viene chiusa, si riprende esattamente dallo stesso step.

export interface ActiveSession {
  id: 'current';
  dayId: DayId;
  startedAt: number;
  activation: ActivationChoice;
  conditioning: boolean;
  ctx: LoadContext; // snapshot dei 1RM al momento dell'avvio
  cursor: number;
  logs: Record<string, SetLog>;
  restEndsAt?: number;
  restTotal?: number; // durata del recupero in corso (s), per l'anello
  restsSkipped: number;
  conditioningLog?: ConditioningLog;
}

export function stepsOf(s: Pick<ActiveSession, 'dayId' | 'activation' | 'conditioning' | 'ctx'>): Step[] {
  return expandDay(PROGRAM[s.dayId], { activation: s.activation, conditioning: s.conditioning, ctx: s.ctx });
}

export function logFor(item: WorkItem, actual: { reps: number; kg?: number }, rpe?: number): SetLog {
  return {
    stepId: item.stepId,
    exerciseId: item.exerciseId,
    block: item.block,
    setIndex: item.setIndex,
    waveIndex: item.wave?.index,
    prescribed: { reps: item.reps.min, kg: item.target ? targetKg(item.target) : undefined },
    actual,
    rpe,
    at: Date.now(),
  };
}

interface State {
  session: ActiveSession | null;
  steps: Step[];
  loaded: boolean;
  load: () => Promise<void>;
  start: (p: { dayId: DayId; activation: ActivationChoice; conditioning: boolean; ctx: LoadContext }) => void;
  logSet: (log: SetLog) => void;
  unlogSet: (stepId: string) => void;
  goTo: (cursor: number) => void;
  next: () => void;
  startRest: (seconds: number) => void;
  adjustRest: (delta: number) => void;
  skipRest: () => void;
  setConditioning: (c: ConditioningLog) => void;
  setConditioningMachine: (m: Machine) => void;
  finish: () => Promise<number>;
  abandon: () => Promise<void>;
}

const persist = (s: ActiveSession | null) => {
  if (s) void db.active.put(s);
  else void db.active.delete('current');
};

export const useActiveSession = create<State>((set, get) => {
  const update = (fn: (s: ActiveSession) => ActiveSession) => {
    const cur = get().session;
    if (!cur) return;
    const nextSession = fn(cur);
    set({ session: nextSession });
    persist(nextSession);
  };

  return {
    session: null,
    steps: [],
    loaded: false,

    load: async () => {
      if (get().loaded) return;
      const s = (await db.active.get('current')) ?? null;
      set({ session: s, steps: s ? stepsOf(s) : [], loaded: true });
    },

    start: (p) => {
      const session: ActiveSession = { id: 'current', ...p, startedAt: Date.now(), cursor: 0, logs: {}, restsSkipped: 0 };
      set({ session, steps: stepsOf(session) });
      persist(session);
    },

    logSet: (log) => update((s) => ({ ...s, logs: { ...s.logs, [log.stepId]: log } })),

    unlogSet: (stepId) =>
      update((s) => {
        const logs = { ...s.logs };
        delete logs[stepId];
        return { ...s, logs };
      }),

    goTo: (cursor) => update((s) => ({ ...s, cursor: Math.max(0, Math.min(cursor, get().steps.length)), restEndsAt: undefined })),

    next: () => update((s) => ({ ...s, cursor: Math.min(s.cursor + 1, get().steps.length), restEndsAt: undefined })),

    startRest: (seconds) => update((s) => ({ ...s, restEndsAt: Date.now() + seconds * 1000, restTotal: seconds })),

    adjustRest: (delta) =>
      update((s) => {
        if (!s.restEndsAt) return s;
        const restEndsAt = Math.max(Date.now(), s.restEndsAt + delta * 1000);
        return { ...s, restEndsAt, restTotal: Math.max(1, (s.restTotal ?? 0) + (restEndsAt - s.restEndsAt) / 1000) };
      }),

    skipRest: () =>
      update((s) => {
        const early = s.restEndsAt && s.restEndsAt - Date.now() > 5000;
        return { ...s, restsSkipped: s.restsSkipped + (early ? 1 : 0), restEndsAt: undefined, cursor: Math.min(s.cursor + 1, get().steps.length) };
      }),

    setConditioning: (c) => update((s) => ({ ...s, conditioningLog: c })),

    setConditioningMachine: (machine) =>
      update((s) => ({ ...s, conditioningLog: { machine, rounds: s.conditioningLog?.rounds ?? 12, roundsDone: s.conditioningLog?.roundsDone ?? 0 } })),

    finish: async () => {
      const s = get().session;
      if (!s) return -1;
      const steps = get().steps;
      const log: SessionLog = {
        dayId: s.dayId,
        startedAt: s.startedAt,
        finishedAt: Date.now(),
        activation: s.activation,
        conditioning: s.conditioningLog && s.conditioningLog.roundsDone > 0 ? s.conditioningLog : undefined,
        sets: Object.values(s.logs).sort((a, b) => a.at - b.at),
        restsSkipped: s.restsSkipped,
        totalWorkSteps: mandatoryWorkCount(steps),
      };
      const id = await db.transaction('rw', db.sessions, db.active, async () => {
        const newId = await db.sessions.add(log);
        await db.active.delete('current');
        return newId;
      });
      set({ session: null, steps: [] });
      return id as number;
    },

    abandon: async () => {
      set({ session: null, steps: [] });
      await db.active.delete('current');
    },
  };
});
