import type { ActivationExercise, Range, Region } from '@/domain/types';

// Libreria attivazione: si eseguono in coppia, almeno 2 serie da 10–15 rip ciascuno.
const reps: Range = { min: 10, max: 15 };

export const ACTIVATION_BASE_SETS = 2;

export const ACTIVATION: ActivationExercise[] = [
  { id: 'act-stick-circles', name: 'Circonduzioni con bastone', region: 'upper', reps },
  { id: 'act-cuff-band', name: 'Intra/extrarotazioni cuffia con elastico', region: 'upper', reps, notes: 'Nelle 4 direzioni' },
  { id: 'act-cobra-pushup', name: 'Cobra push-up', region: 'upper', reps },
  { id: 'act-thread-needle', name: 'Thread the needle', region: 'upper', reps, notes: 'Per lato' },
  { id: 'act-superman-swim', name: 'Superman swim', region: 'upper', reps },
  { id: 'act-windshield', name: 'Windshield wipers', region: 'trunk', reps },
  { id: 'act-cat-cow', name: 'Cat-cow', region: 'trunk', reps },
  { id: 'act-9090', name: 'Intra/extrarotazione d’anca 90/90', region: 'lower', reps },
  { id: 'act-pigeon', name: 'Pigeon stretch', region: 'lower', reps, notes: 'Per lato' },
  { id: 'act-psoas', name: 'Stretch ileopsoas con ginocchio a terra', region: 'lower', reps, notes: 'Per lato' },
  { id: 'act-elephant', name: 'Elephant walk', region: 'lower', reps },
  { id: 'act-jefferson', name: 'Jefferson curl', region: 'lower', reps },
  { id: 'act-adduct-band', name: 'Adduttori/abduttori con elastico', region: 'lower', reps },
  { id: 'act-ankle-band', name: 'Inversioni/eversioni caviglia con elastico', region: 'lower', reps },
];

export const REGION_LABEL: Record<Region, string> = { upper: 'Upper', trunk: 'Busto', lower: 'Lower' };

export function findActivation(id: string): ActivationExercise | undefined {
  return ACTIVATION.find((a) => a.id === id);
}
