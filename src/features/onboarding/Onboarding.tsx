import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/db';
import type { LiftKey, OneRm, Profile } from '@/domain/types';
import { Button } from '@/ui/Button';
import { Chip, NumberField, TextField } from '@/ui/fields';
import { Screen } from '@/ui/layout';
import { WEEKDAYS } from '@/lib/time';
import { OneRmEditor } from './OneRmEditor';
import { Disclaimer } from './Disclaimer';

export const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K/P'];
export const DEFAULT_DAYS = [0, 2, 4]; // lun, mer, ven

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [number, setNumber] = useState<number>();
  const [position, setPosition] = useState<string>();
  const [bodyweight, setBodyweight] = useState<number>();
  const [oneRm, setOneRm] = useState<Partial<Record<LiftKey, OneRm>>>({});
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS);
  const [accepted, setAccepted] = useState(false);

  const canNext = [name.trim().length > 0 && !!number, true, accepted && days.length === 3][step];

  const finish = async () => {
    const now = new Date().toISOString();
    const profile: Profile = {
      id: 'me',
      name: name.trim(),
      number: number!,
      position,
      bodyweight,
      oneRm,
      trainingDays: [...days].sort(),
      equipped: [],
      timeouts: [],
      disclaimerAcceptedAt: now,
      createdAt: now,
    };
    await db.transaction('rw', db.profile, db.oneRmHistory, async () => {
      await db.profile.put(profile);
      for (const [lift, rm] of Object.entries(oneRm)) {
        await db.oneRmHistory.add({ lift: lift as LiftKey, value: rm.value, source: rm.source, date: rm.date });
      }
    });
    navigate('/', { replace: true });
  };

  return (
    <Screen>
      <div className="mb-6 flex items-center gap-3">
        <img src="brand/logobianco.png" alt="Thunders Trento" className="h-12 w-auto" />
        <div className="flex flex-1 gap-1.5" aria-label={`Passo ${step + 1} di 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-yellow' : 'bg-white/15'}`} />
          ))}
        </div>
      </div>

      {step === 0 && (
        <section className="animate-slide-up space-y-5">
          <div>
            <p className="label">Benvenuto in squadra</p>
            <h1 className="font-display text-5xl font-extrabold uppercase leading-none">Chi scende in campo?</h1>
          </div>
          <TextField label="Nome" value={name} onChange={setName} autoComplete="given-name" placeholder="Il tuo nome" />
          <NumberField label="Numero di maglia" value={number} onChange={setNumber} min={1} max={99} inputMode="numeric" placeholder="1–99" />
          <div>
            <p className="mb-2 font-medium">
              Ruolo in campo <span className="text-steel">(facoltativo)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((p) => (
                <Chip key={p} active={position === p} onClick={() => setPosition(position === p ? undefined : p)}>
                  {p}
                </Chip>
              ))}
            </div>
          </div>
          <NumberField
            label="Peso corporeo"
            value={bodyweight}
            onChange={setBodyweight}
            unit="kg"
            min={30}
            max={250}
            hint="Serve per calcolare la zavorra delle trazioni."
          />
        </section>
      )}

      {step === 1 && (
        <section className="animate-slide-up space-y-4">
          <div>
            <p className="label">Massimali</p>
            <h1 className="font-display text-5xl font-extrabold uppercase leading-none">I tuoi 1RM</h1>
            <p className="mt-2 text-steel">Tutti i carichi della scheda partono da qui. Puoi lasciarne vuoto qualcuno e completarlo dopo nelle impostazioni.</p>
          </div>
          <OneRmEditor value={oneRm} onChange={setOneRm} />
        </section>
      )}

      {step === 2 && (
        <section className="animate-slide-up space-y-5">
          <div>
            <p className="label">Ultimo passo</p>
            <h1 className="font-display text-5xl font-extrabold uppercase leading-none">Settimana tipo</h1>
            <p className="mt-2 text-steel">Scegli 3 giorni, con almeno un giorno di riposo tra uno e l'altro. Puoi cambiarli quando vuoi.</p>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d, i) => (
              <Chip
                key={d}
                active={days.includes(i)}
                onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : days.length < 3 ? [...days, i] : days)}
                className="!px-0"
              >
                {d}
              </Chip>
            ))}
          </div>
          <Disclaimer />
          <label className="flex min-h-tap cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-[var(--thunder-yellow)]" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>Ho capito: seguirò la scheda sotto la supervisione dello staff tecnico.</span>
          </label>
        </section>
      )}

      <div className="mt-auto flex gap-3 pt-8">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            Indietro
          </Button>
        )}
        <Button size="cta" className="flex-1" disabled={!canNext} onClick={() => (step < 2 ? setStep(step + 1) : void finish())}>
          {step < 2 ? 'Avanti' : 'Scendi in campo'}
        </Button>
      </div>
    </Screen>
  );
}
