import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PROGRAM } from '@/data/program';
import { ACTIVATION, ACTIVATION_BASE_SETS, findActivation, REGION_LABEL } from '@/data/activation';
import { proposeActivation } from '@/domain/activation';
import { targetFor, type LoadContext } from '@/domain/loads';
import type { ActivationChoice, Block, DayId, Exercise } from '@/domain/types';
import { loadContext, useProfile, useSessions, useSettings } from '@/store/data';
import { useActiveSession } from '@/store/activeSession';
import { Button } from '@/ui/Button';
import { Header, Screen, Segmented, Sheet, Toggle } from '@/ui/layout';
import { Bolt, Snow } from '@/ui/icons';
import { loadLabel } from '@/ui/load';
import { formatRange, formatRest } from '@/lib/time';
import { unlockAudio } from '@/lib/feedback';

const BLOCK_ACCENT: Record<Block['kind'], string> = {
  activation: 'bg-success',
  plyo: 'bg-yellow',
  strength: 'bg-danger',
  hypertrophy: 'bg-blue',
  conditioning: 'bg-steel',
};

export function Preview() {
  const { day } = useParams();
  const dayId = Number(day) as DayId;
  const navigate = useNavigate();
  const profile = useProfile();
  const settings = useSettings();
  const sessions = useSessions();
  const active = useActiveSession();
  const program = PROGRAM[dayId];

  const [activation, setActivation] = useState<ActivationChoice | null>(null);
  const [conditioning, setConditioning] = useState(false);
  const [swap, setSwap] = useState<{ pair: number; slot: number } | null>(null);

  useEffect(() => {
    if (program && sessions && !activation) setActivation(proposeActivation(program, sessions.filter((s) => s.dayId === dayId).length));
  }, [program, sessions, activation, dayId]);

  const ctx = useMemo(() => (profile ? loadContext(profile, settings) : null), [profile, settings]);

  if (!program) return <Navigate to="/" replace />;
  if (!profile || !ctx || !activation) return <Screen>{null}</Screen>;

  const start = () => {
    unlockAudio();
    active.start({ dayId, activation, conditioning, ctx });
    navigate('/player');
  };

  const otherActive = active.session && active.session.dayId !== dayId;

  return (
    <Screen>
      <Header back="/" kicker={program.subtitle} title={`${program.title} · Anteprima`} />

      {otherActive && (
        <div className="card mb-4 border-yellow/40 p-4">
          <p className="mb-3">Hai una seduta del Day {active.session!.dayId} in corso. Se ne inizi una nuova, quella verrà chiusa senza salvare.</p>
          <Button variant="secondary" block onClick={() => navigate('/player')}>
            Riprendi Day {active.session!.dayId}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {program.blocks.map((block) => (
          <section key={block.kind} className="card overflow-hidden">
            <div className="flex items-center gap-3 px-4 pt-4">
              <span className={`h-6 w-1.5 rounded-full ${BLOCK_ACCENT[block.kind]}`} aria-hidden />
              <h2 className="font-display text-xl font-bold uppercase">{block.title}</h2>
              {block.optional && <span className="ml-auto text-sm text-steel">facoltativo</span>}
            </div>

            {block.kind === 'activation' ? (
              <div className="space-y-3 p-4">
                <p className="text-sm text-steel">
                  In coppia, {ACTIVATION_BASE_SETS + activation.extraSets} serie da 10–15 rip ciascuno. Tocca un esercizio per cambiarlo.
                </p>
                {activation.pairs.map((pair, p) => (
                  <div key={p} className="rounded-2xl bg-white/5 p-2">
                    <div className="label px-2 pb-1">Coppia {p + 1}</div>
                    {pair.map((id, slot) => {
                      const a = findActivation(id);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSwap({ pair: p, slot })}
                          className="focus-ring flex min-h-tap w-full items-center gap-3 rounded-xl px-2 text-left active:bg-white/10"
                        >
                          <span className="w-6 font-display text-lg font-bold text-yellow">{slot ? 'B' : 'A'}</span>
                          <span className="flex-1">{a?.name}</span>
                          <span className="text-xs uppercase text-steel">{a && REGION_LABEL[a.region]}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div>
                  <p className="mb-2 flex items-center gap-2 font-medium">
                    <Snow size={20} className="text-yellow" /> Mi sento freddo
                  </p>
                  <Segmented
                    label="Serie extra di attivazione"
                    value={activation.extraSets}
                    onChange={(v) => setActivation({ ...activation, extraSets: v })}
                    options={[
                      { value: 0, label: 'No' },
                      { value: 1, label: '+1 serie' },
                      { value: 2, label: '+2 serie' },
                    ]}
                  />
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-white/5 px-4 pb-2">
                {block.exercises.map((ex) => (
                  <ExerciseRow key={ex.id} ex={ex} ctx={ctx} />
                ))}
                {block.optional && (
                  <li className="py-2">
                    <Toggle checked={conditioning} onChange={setConditioning} label="Includi il conditioning" hint="Bonus RESISTENZA e XP" />
                  </li>
                )}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 bg-gradient-to-t from-navy-deep via-navy-deep/95 to-transparent px-4 pb-[calc(var(--safe-bottom)+12px)] pt-6">
        <Button size="cta" block icon={<Bolt size={28} />} onClick={start}>
          Inizia {program.title}
        </Button>
      </div>

      <Sheet open={!!swap} onClose={() => setSwap(null)} title="Scegli esercizio">
        {swap && (
          <div className="space-y-4">
            {(['lower', 'trunk', 'upper'] as const).map((region) => (
              <div key={region}>
                <div className="label mb-1">{REGION_LABEL[region]}</div>
                <div className="space-y-1">
                  {ACTIVATION.filter((a) => a.region === region).map((a) => {
                    const current = activation.pairs[swap.pair][swap.slot] === a.id;
                    const taken = !current && activation.pairs.flat().includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        disabled={taken}
                        onClick={() => {
                          const pairs = activation.pairs.map((p) => [...p] as [string, string]);
                          pairs[swap.pair][swap.slot] = a.id;
                          setActivation({ ...activation, pairs });
                          setSwap(null);
                        }}
                        className={`focus-ring flex min-h-tap w-full items-center rounded-xl px-3 text-left disabled:opacity-35 ${current ? 'bg-yellow text-navy' : 'bg-white/5'}`}
                      >
                        {a.name}
                        {a.notes && <span className="ml-auto pl-2 text-xs opacity-70">{a.notes}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </Screen>
  );
}

function ExerciseRow({ ex, ctx }: { ex: Exercise; ctx: LoadContext }) {
  const p = ex.prescription;
  let scheme = '';
  let load: string | null = null;
  if (p.kind === 'straight') {
    scheme = `${p.sets} × ${formatRange(p.reps.min, p.reps.max)}${ex.unilateral ? ' per lato' : ''}`;
    if (p.intensity) {
      const l = loadLabel(targetFor(p.intensity, ctx));
      load = l ? `${l.main} ${l.unit}` : null;
      scheme += ` @ ${p.intensity.pct}%`;
    }
  } else if (p.kind === 'distance') {
    scheme = `${p.sets} × ${formatRange(p.meters.min, p.meters.max)} m`;
  } else if (p.kind === 'wave') {
    scheme = `${p.sets} serie a onda`;
    load = p.steps
      .map((s) => {
        const l = loadLabel(targetFor({ pct: s.pct, of: p.of }, ctx));
        return `${s.reps}×${l?.unit === 'kg' ? l.main : `${s.pct}%`}`;
      })
      .join(' → ');
  } else if (p.kind === 'interval') {
    scheme = `${p.on}″ ON / ${p.off}″ OFF × ${p.rounds}`;
  }
  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{ex.name}</span>
        {load && <span className="num shrink-0 text-xl text-yellow">{load}</span>}
      </div>
      <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-steel">
        <span>{scheme}</span>
        {ex.rest && <span>rec. {formatRest(ex.rest.min, ex.rest.max)}</span>}
        {ex.notes && <span className="text-ink/75">{ex.notes}</span>}
      </div>
    </li>
  );
}
