// Tipi condivisi tra dati della scheda, logica e UI.

export type LiftKey = 'deadlift' | 'bench' | 'squat' | 'pullup' | 'trapbar' | 'military';
export type BlockKind = 'activation' | 'plyo' | 'strength' | 'hypertrophy' | 'conditioning';
export type StatKey = 'power' | 'strength' | 'mass' | 'endurance' | 'mobility';
export type Region = 'upper' | 'trunk' | 'lower';
export type Machine = 'treadmill' | 'rower' | 'bike';
export type DayId = 1 | 2 | 3;

export interface Range {
  min: number;
  max: number;
}

export interface Intensity {
  pct: number; // percentuale del 1RM, es. 85
  of: LiftKey;
}

export type Prescription =
  | { kind: 'straight'; sets: number; reps: Range; intensity?: Intensity }
  | { kind: 'wave'; sets: number; steps: { reps: number; pct: number }[]; of: LiftKey; stepRest: Range }
  | { kind: 'distance'; sets: number; meters: Range }
  | { kind: 'interval'; on: number; off: number; rounds: number; machines: Machine[] };

export interface Pairing {
  with: string; // id dell'esercizio "ospite"
  // in-rest: si esegue durante i recuperi dell'ospite (lanci palla medica tra gli sprint)
  // superset: si alterna serie per serie con l'ospite (lat machine ↔ single-leg squat)
  mode: 'in-rest' | 'superset';
}

export interface Exercise {
  id: string;
  name: string;
  prescription: Prescription;
  rest?: Range; // secondi
  pairing?: Pairing;
  unilateral?: boolean; // ripetizioni per gamba / per lato
  loaded?: boolean; // carico esterno libero (manubri, macchina, palla): si registra senza % del 1RM
  e1rm?: LiftKey; // le serie di questo esercizio contano per il 1RM stimato del lift
  notes?: string;
}

export interface Block {
  kind: BlockKind;
  title: string;
  optional?: boolean;
  exercises: Exercise[];
}

export interface Day {
  id: DayId;
  title: string;
  subtitle: string;
  // due coppie di attivazione: ogni coppia indica le regioni da cui pescare i due esercizi
  activationFocus: [Region, Region][];
  blocks: Block[];
}

export interface ActivationExercise {
  id: string;
  name: string;
  region: Region;
  reps: Range;
  notes?: string;
}

export interface OneRm {
  value: number;
  source: 'tested' | 'epley';
  date: string; // ISO
}

export interface Profile {
  id: 'me';
  name: string;
  number: number;
  position?: string;
  bodyweight?: number;
  oneRm: Partial<Record<LiftKey, OneRm>>;
  trainingDays: number[]; // 0 = lunedì … 6 = domenica
  equipped: string[]; // id dei cosmetici equipaggiati
  timeouts: string[]; // chiavi settimana (lunedì ISO yyyy-mm-dd) congelate
  disclaimerAcceptedAt: string;
  createdAt: string;
}

export type Rounding = 1.25 | 2.5 | 5;

export interface Settings {
  id: 'settings';
  rounding: Rounding;
  barKg: number;
  plates: number[];
  showPlates: boolean;
  sound: boolean;
  vibration: boolean;
  motion: 'system' | 'reduce' | 'full';
}

export interface SetLog {
  stepId: string;
  exerciseId: string;
  block: BlockKind;
  setIndex: number;
  waveIndex?: number;
  prescribed: { reps: number; kg?: number };
  actual: { reps: number; kg?: number };
  rpe?: number;
  at: number; // epoch ms
}

export interface ActivationChoice {
  pairs: [string, string][];
  extraSets: 0 | 1 | 2;
}

export interface ConditioningLog {
  machine: Machine;
  rounds: number;
  roundsDone: number;
}

export interface SessionLog {
  id?: number;
  dayId: DayId;
  startedAt: number;
  finishedAt: number;
  activation: ActivationChoice;
  conditioning?: ConditioningLog;
  sets: SetLog[];
  restsSkipped: number;
  totalWorkSteps: number; // serie obbligatorie previste (per stabilire se la seduta è completa)
}

export interface OneRmEntry {
  id?: number;
  lift: LiftKey;
  value: number;
  source: 'tested' | 'epley' | 'session';
  date: string;
}
