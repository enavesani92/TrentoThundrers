import type { Block, Day, DayId, Exercise, LiftKey, Machine, Range } from '@/domain/types';

// Trascrizione della scheda. Recuperi in secondi.
const r = (min: number, max = min): Range => ({ min, max });
const MIN = 60;

const activationBlock: Block = {
  kind: 'activation',
  title: 'Attivazione',
  exercises: [], // le coppie vengono scelte dalla libreria a ogni seduta
};

const conditioning = (day: DayId): Block => ({
  kind: 'conditioning',
  title: 'Conditioning',
  optional: true,
  exercises: [
    {
      id: `d${day}-cond`,
      name: 'Intervalli 20″ ON / 20″ OFF',
      prescription: { kind: 'interval', on: 20, off: 20, rounds: 12, machines: ['treadmill', 'rower', 'bike'] },
      notes: 'Treadmill, vogatore o bike',
    },
  ],
});

const day1: Day = {
  id: 1,
  title: 'Day 1',
  subtitle: 'Sprint · Stacco · Panca',
  activationFocus: [
    ['lower', 'lower'],
    ['upper', 'upper'],
  ],
  blocks: [
    activationBlock,
    {
      kind: 'plyo',
      title: 'Plyo / Power',
      exercises: [
        {
          id: 'd1-sprint',
          name: 'Sprint massimali',
          prescription: { kind: 'distance', sets: 5, meters: r(20, 30) },
          rest: r(3 * MIN),
          notes: 'Massima velocità, recupero completo',
        },
        {
          id: 'd1-medball',
          name: 'Lanci laterali con palla medica',
          loaded: true,
          prescription: { kind: 'straight', sets: 4, reps: r(4) },
          pairing: { with: 'd1-sprint', mode: 'in-rest' },
          unilateral: true,
          notes: 'Nelle 4 pause tra i 5 sprint',
        },
        {
          id: 'd1-slboxjump',
          name: 'Single-leg box jump',
          prescription: { kind: 'straight', sets: 3, reps: r(3) },
          rest: r(1 * MIN, 2 * MIN),
          unilateral: true,
        },
      ],
    },
    {
      kind: 'strength',
      title: 'Forza',
      exercises: [
        {
          id: 'd1-deadlift',
          name: 'Stacco',
          prescription: { kind: 'straight', sets: 5, reps: r(2, 3), intensity: { pct: 90, of: 'deadlift' } },
          rest: r(3 * MIN, 4 * MIN),
          e1rm: 'deadlift',
        },
        {
          id: 'd1-bench',
          name: 'Bench press',
          prescription: { kind: 'straight', sets: 4, reps: r(4), intensity: { pct: 85, of: 'bench' } },
          rest: r(2 * MIN, 3 * MIN),
          e1rm: 'bench',
        },
      ],
    },
    {
      kind: 'hypertrophy',
      title: 'Ipertrofia',
      exercises: [
        {
          id: 'd1-bulgarian',
          name: 'Bulgarian split squat',
          loaded: true,
          prescription: { kind: 'straight', sets: 3, reps: r(8) },
          rest: r(1 * MIN, 2 * MIN),
          unilateral: true,
        },
        {
          id: 'd1-dbohp',
          name: 'Overhead press con manubri',
          loaded: true,
          prescription: { kind: 'straight', sets: 3, reps: r(8) },
          rest: r(1 * MIN, 2 * MIN),
        },
      ],
    },
    conditioning(1),
  ],
};

const day2: Day = {
  id: 2,
  title: 'Day 2',
  subtitle: 'Pogo · Squat a onde · Trazioni',
  activationFocus: [
    ['lower', 'lower'],
    ['trunk', 'upper'],
  ],
  blocks: [
    activationBlock,
    {
      kind: 'plyo',
      title: 'Plyo / Power',
      exercises: [
        {
          id: 'd2-pogo',
          name: 'Pogo jump',
          prescription: { kind: 'straight', sets: 3, reps: r(20) },
          rest: r(1 * MIN, 2 * MIN),
        },
        {
          id: 'd2-latbound',
          name: 'Bound laterali',
          prescription: { kind: 'straight', sets: 3, reps: r(12) },
          rest: r(1 * MIN, 2 * MIN),
        },
        {
          id: 'd2-cablerot',
          name: 'Cable rotation explosive',
          loaded: true,
          prescription: { kind: 'straight', sets: 3, reps: r(10) },
          rest: r(1 * MIN, 2 * MIN),
          unilateral: true,
        },
      ],
    },
    {
      kind: 'strength',
      title: 'Forza',
      exercises: [
        {
          id: 'd2-squat',
          name: 'Squat',
          prescription: {
            kind: 'wave',
            sets: 6,
            of: 'squat',
            steps: [
              { reps: 3, pct: 85 },
              { reps: 2, pct: 90 },
              { reps: 1, pct: 95 },
            ],
            stepRest: r(60, 90),
          },
          rest: r(3 * MIN, 4 * MIN),
          e1rm: 'squat',
          notes: 'Onda: 3 rip @85% → 2 rip @90% → 1 rip @95% in ogni serie',
        },
        {
          id: 'd2-pullup',
          name: 'Trazioni (varianti)',
          prescription: { kind: 'straight', sets: 3, reps: r(6), intensity: { pct: 80, of: 'pullup' } },
          rest: r(3 * MIN),
          e1rm: 'pullup',
        },
      ],
    },
    {
      kind: 'hypertrophy',
      title: 'Ipertrofia',
      exercises: [
        {
          id: 'd2-legcurl',
          name: 'Leg curl',
          loaded: true,
          prescription: { kind: 'straight', sets: 3, reps: r(8) },
          rest: r(1 * MIN, 2 * MIN),
        },
        {
          id: 'd2-dbbench',
          name: 'Panca manubri',
          loaded: true,
          prescription: { kind: 'straight', sets: 3, reps: r(8) },
          rest: r(1 * MIN, 2 * MIN),
        },
      ],
    },
    conditioning(2),
  ],
};

const day3: Day = {
  id: 3,
  title: 'Day 3',
  subtitle: 'Hop · Trap-bar · Military',
  activationFocus: [
    ['lower', 'trunk'],
    ['upper', 'upper'],
  ],
  blocks: [
    activationBlock,
    {
      kind: 'plyo',
      title: 'Plyo / Power',
      exercises: [
        {
          id: 'd3-slhop',
          name: 'Single-leg hop',
          prescription: { kind: 'straight', sets: 3, reps: r(6) },
          rest: r(1 * MIN, 2 * MIN),
          unilateral: true,
        },
        {
          id: 'd3-broad',
          name: 'Broad jump',
          prescription: { kind: 'straight', sets: 3, reps: r(3) },
          rest: r(1 * MIN, 2 * MIN),
        },
        {
          id: 'd3-trapjump',
          name: 'Trap-bar jump',
          prescription: { kind: 'straight', sets: 3, reps: r(4), intensity: { pct: 40, of: 'trapbar' } },
          rest: r(1 * MIN, 2 * MIN),
          notes: '40% del 1RM di trap-bar deadlift',
        },
      ],
    },
    {
      kind: 'strength',
      title: 'Forza',
      exercises: [
        {
          id: 'd3-trapbar',
          name: 'Trap-bar deadlift',
          prescription: { kind: 'straight', sets: 4, reps: r(5), intensity: { pct: 85, of: 'trapbar' } },
          rest: r(3 * MIN, 4 * MIN),
          e1rm: 'trapbar',
        },
        {
          id: 'd3-military',
          name: 'Military press',
          prescription: { kind: 'straight', sets: 4, reps: r(4), intensity: { pct: 80, of: 'military' } },
          rest: r(2 * MIN, 3 * MIN),
          e1rm: 'military',
        },
      ],
    },
    {
      kind: 'hypertrophy',
      title: 'Ipertrofia',
      exercises: [
        {
          id: 'd3-lat',
          name: 'Lat machine',
          loaded: true,
          prescription: { kind: 'straight', sets: 3, reps: r(8) },
          rest: r(1 * MIN, 2 * MIN),
        },
        {
          id: 'd3-slsquat',
          name: 'Single-leg squat',
          loaded: true,
          prescription: { kind: 'straight', sets: 3, reps: r(8) },
          rest: r(1 * MIN, 2 * MIN),
          pairing: { with: 'd3-lat', mode: 'superset' },
          unilateral: true,
          notes: 'In superset con lat machine',
        },
      ],
    },
    conditioning(3),
  ],
};

export const PROGRAM: Record<DayId, Day> = { 1: day1, 2: day2, 3: day3 };
export const DAY_IDS: DayId[] = [1, 2, 3];

export const LIFTS: { key: LiftKey; name: string; hint?: string }[] = [
  { key: 'deadlift', name: 'Stacco' },
  { key: 'bench', name: 'Bench press' },
  { key: 'squat', name: 'Squat' },
  { key: 'pullup', name: 'Trazioni', hint: 'Peso totale: corpo + zavorra' },
  { key: 'trapbar', name: 'Trap-bar deadlift' },
  { key: 'military', name: 'Military press' },
];

export const MACHINES: { key: Machine; name: string }[] = [
  { key: 'treadmill', name: 'Treadmill' },
  { key: 'rower', name: 'Vogatore' },
  { key: 'bike', name: 'Bike' },
];

export function allExercises(): Exercise[] {
  return DAY_IDS.flatMap((d) => PROGRAM[d].blocks.flatMap((b) => b.exercises));
}

export function findExercise(id: string): Exercise | undefined {
  return allExercises().find((e) => e.id === id);
}
