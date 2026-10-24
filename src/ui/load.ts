import { formatKg, type LoadTarget } from '@/domain/loads';
import { LIFTS } from '@/data/program';
import { formatRange } from '@/lib/time';
import type { WorkItem } from '@/domain/session';

export function loadLabel(t: LoadTarget | undefined): { main: string; unit: string; sub?: string } | null {
  if (!t) return null;
  if (t.kind === 'barbell') return { main: formatKg(t.kg), unit: 'kg', sub: `${t.pct}% 1RM` };
  if (t.kind === 'bodyweight') {
    if (t.mode === 'weighted') return { main: `+${formatKg(t.kg)}`, unit: 'kg', sub: `zavorra · ${t.pct}% 1RM` };
    if (t.mode === 'assisted') return { main: `−${formatKg(t.kg)}`, unit: 'kg', sub: `assistenza · ${t.pct}% 1RM` };
    return { main: 'Corpo', unit: 'libero', sub: `${t.pct}% 1RM` };
  }
  const lift = LIFTS.find((l) => l.key === t.lift)?.name ?? t.lift;
  return { main: `${t.pct}%`, unit: '1RM', sub: `Inserisci il 1RM di ${lift} nelle impostazioni` };
}

export function repsLabel(w: Pick<WorkItem, 'reps' | 'meters' | 'unilateral'>): string {
  if (w.meters) return `${formatRange(w.meters.min, w.meters.max)} m`;
  return `${formatRange(w.reps.min, w.reps.max)} rip${w.unilateral ? ' per lato' : ''}`;
}
