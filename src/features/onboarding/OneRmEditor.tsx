import { useState } from 'react';
import { LIFTS } from '@/data/program';
import { epley, EPLEY_MAX_REPS, formatKg, roundTo } from '@/domain/loads';
import type { LiftKey, OneRm } from '@/domain/types';
import { NumberField } from '@/ui/fields';
import { Button } from '@/ui/Button';

type OneRmMap = Partial<Record<LiftKey, OneRm>>;

/** Inserimento dei 1RM, con stima da test submassimale (Epley) chiaramente segnalata. */
export function OneRmEditor({ value, onChange }: { value: OneRmMap; onChange: (v: OneRmMap) => void }) {
  return (
    <div className="space-y-4">
      {LIFTS.map((lift) => (
        <LiftRow
          key={lift.key}
          name={lift.name}
          hint={lift.hint}
          value={value[lift.key]}
          onChange={(rm) => {
            const next = { ...value };
            if (rm) next[lift.key] = rm;
            else delete next[lift.key];
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

function LiftRow({ name, hint, value, onChange }: { name: string; hint?: string; value?: OneRm; onChange: (v: OneRm | undefined) => void }) {
  const [estimating, setEstimating] = useState(false);
  const [w, setW] = useState<number>();
  const [reps, setReps] = useState<number>();
  const est = w && reps ? roundTo(epley(w, reps), 0.5) : undefined;
  const now = new Date().toISOString();

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-display text-xl font-bold uppercase">{name}</h3>
        {value?.source === 'epley' && <span className="rounded-lg bg-yellow/15 px-2 py-1 text-xs font-semibold uppercase text-yellow">Stima Epley</span>}
      </div>
      {!estimating ? (
        <>
          <NumberField
            label={<span className="sr-only">1RM {name}</span>}
            value={value?.value}
            onChange={(v) => onChange(v ? { value: v, source: 'tested', date: now } : undefined)}
            unit="kg"
            min={1}
            max={500}
            placeholder="1RM"
            hint={hint}
          />
          <button type="button" className="focus-ring mt-2 min-h-[44px] text-sm font-semibold text-yellow underline underline-offset-4" onClick={() => setEstimating(true)}>
            Non lo conosco: stimalo da un test submassimale
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-steel">
            Inserisci un carico che hai sollevato con tecnica pulita per 2–{EPLEY_MAX_REPS} ripetizioni.
            {hint ? ` ${hint}.` : ''}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Carico" value={w} onChange={setW} unit="kg" min={1} max={500} />
            <NumberField label="Ripetizioni" value={reps} onChange={setReps} min={2} max={EPLEY_MAX_REPS} inputMode="numeric" />
          </div>
          {est && (
            <p className="text-lg">
              1RM stimato: <strong className="num text-3xl text-yellow">{formatKg(est)} kg</strong>
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEstimating(false)}>
              Annulla
            </Button>
            <Button
              disabled={!est}
              className="flex-1"
              onClick={() => {
                if (!est) return;
                onChange({ value: est, source: 'epley', date: now });
                setEstimating(false);
              }}
            >
              Usa la stima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
