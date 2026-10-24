import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PROGRAM } from '@/data/program';
import { formatKg, platesPerSide, targetKg } from '@/domain/loads';
import type { Step, WorkItem } from '@/domain/session';
import type { SetLog } from '@/domain/types';
import { logFor, useActiveSession } from '@/store/activeSession';
import { useSessions, useSettings } from '@/store/data';
import { useAvatarFx } from '@/store/fx';
import { cue } from '@/lib/feedback';
import { useNow } from '@/lib/useTicker';
import { useWakeLock } from '@/lib/wakeLock';
import { formatClock } from '@/lib/time';
import { Button, IconButton } from '@/ui/Button';
import { Sheet, Stepper } from '@/ui/layout';
import { Back, Check, Close, List, Minus, Plus, SkipIcon } from '@/ui/icons';
import { loadLabel, repsLabel } from '@/ui/load';
import { IntervalTimer } from '@/features/interval/IntervalTimer';
import { MiniAvatarSlot } from './MiniAvatarSlot';

const BLOCK_LABEL: Record<WorkItem['block'], string> = {
  activation: 'Attivazione',
  plyo: 'Plyo / Power',
  strength: 'Forza',
  hypertrophy: 'Ipertrofia',
  conditioning: 'Conditioning',
};

export function Player() {
  const navigate = useNavigate();
  const s = useActiveSession();
  const settings = useSettings();
  const history = useSessions();
  const [menu, setMenu] = useState(false);
  const [list, setList] = useState(false);
  useWakeLock(true);

  useEffect(() => {
    void s.load();
  }, [s]);

  // ultimo carico usato per ogni esercizio: prima nella seduta corrente, poi nello storico
  const lastKg = useMemo(() => {
    const m = new Map<string, number>();
    for (const sess of history ?? []) for (const l of sess.sets) if (l.actual.kg !== undefined) m.set(l.exerciseId, l.actual.kg);
    for (const l of Object.values(s.session?.logs ?? {}).sort((a, b) => a.at - b.at)) if (l.actual.kg !== undefined) m.set(l.exerciseId, l.actual.kg);
    return m;
  }, [history, s.session?.logs]);

  if (!s.loaded) return <div className="stadium h-full" />;
  if (!s.session) return <Navigate to="/" replace />;

  const { session, steps } = s;
  const step: Step | undefined = steps[session.cursor];
  const done = Object.keys(session.logs).length;
  const total = steps.reduce((n, st) => n + (st.type === 'work' ? 1 : st.type === 'rest' && st.companion ? 1 : 0), 0);

  const finish = async () => {
    const id = await s.finish();
    navigate(`/summary/${id}`, { replace: true });
  };

  return (
    <div className="stadium min-h-full">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 pb-[calc(var(--safe-bottom)+16px)] pt-[calc(var(--safe-top)+10px)]">
        <header className="flex items-center gap-2">
          <IconButton label="Esci dalla seduta" onClick={() => setMenu(true)}>
            <Close />
          </IconButton>
          <div className="flex-1">
            <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-steel">
              <span>{PROGRAM[session.dayId].title}</span>
              <span>
                {done}/{total} serie
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={done} aria-valuemax={total} aria-label="Avanzamento seduta">
              <div className="h-full rounded-full bg-yellow transition-all" style={{ width: `${(done / Math.max(1, total)) * 100}%` }} />
            </div>
          </div>
          <IconButton label="Elenco esercizi" onClick={() => setList(true)}>
            <List />
          </IconButton>
        </header>

        {!step && <FinishView onFinish={finish} done={done} total={total} />}
        {step?.type === 'work' && (
          <WorkView key={step.id} item={step.work} existing={session.logs[step.id]} lastKg={lastKg.get(step.work.exerciseId)} rounding={settings.rounding} showPlates={settings.showPlates} barKg={settings.barKg} plates={settings.plates} />
        )}
        {step?.type === 'rest' && <RestView key={step.id} step={step} lastKg={step.companion ? lastKg.get(step.companion.exerciseId) : undefined} />}
        {step?.type === 'interval' && (
          <IntervalTimer
            on={step.on}
            off={step.off}
            rounds={step.rounds}
            machines={step.machines}
            initialMachine={session.conditioningLog?.machine}
            onDone={(log) => {
              s.setConditioning(log);
              useAvatarFx.getState().play('cheer');
              s.next();
            }}
            onCancel={(log) => {
              if (log.roundsDone > 0) s.setConditioning(log);
              s.next();
            }}
          />
        )}
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Seduta in pausa">
        <div className="space-y-3">
          <Button block size="cta" onClick={() => setMenu(false)}>
            Continua
          </Button>
          <Button block variant="secondary" onClick={() => void finish()}>
            Termina e salva ({done} serie)
          </Button>
          <Button
            block
            variant="ghost"
            onClick={() => {
              void s.abandon();
              navigate('/', { replace: true });
            }}
          >
            Esci senza salvare
          </Button>
          <p className="text-center text-sm text-steel">Se chiudi l'app, la seduta resta salvata e la riprendi dalla Home.</p>
        </div>
      </Sheet>

      <Sheet open={list} onClose={() => setList(false)} title="Esercizi della seduta">
        <StepList
          steps={steps}
          cursor={session.cursor}
          logs={session.logs}
          onPick={(i) => {
            s.goTo(i);
            setList(false);
          }}
        />
      </Sheet>
    </div>
  );
}

function WorkView({
  item,
  existing,
  lastKg,
  rounding,
  showPlates,
  barKg,
  plates,
}: {
  item: WorkItem;
  existing?: SetLog;
  lastKg?: number;
  rounding: number;
  showPlates: boolean;
  barKg: number;
  plates: number[];
}) {
  const s = useActiveSession();
  const target = item.target;
  const prescribedKg = target ? targetKg(target) : undefined;
  const hasKg = prescribedKg !== undefined || item.loaded;
  const [kg, setKg] = useState<number>(existing?.actual.kg ?? prescribedKg ?? lastKg ?? 0);
  const [reps, setReps] = useState<number>(existing?.actual.reps ?? item.reps.min);
  const [rpe, setRpe] = useState<number | undefined>(existing?.rpe);
  const [edit, setEdit] = useState(false);

  const label = loadLabel(target);
  const modified = (prescribedKg !== undefined && kg !== prescribedKg) || reps !== item.reps.min;
  const plateRes = showPlates && target?.kind === 'barbell' && target.lift !== 'trapbar' ? platesPerSide(kg, barKg, plates) : null;
  const isPullup = target?.kind === 'bodyweight';

  const complete = () => {
    s.logSet(logFor(item, { reps, kg: hasKg ? kg : undefined }, rpe));
    cue.setDone();
    useAvatarFx.getState().play('hop');
    const { steps, session } = useActiveSession.getState();
    const next = steps[(session?.cursor ?? 0) + 1];
    s.next();
    if (next?.type === 'rest') s.startRest(next.seconds.min);
  };

  const prevWork = () => {
    const { steps, session } = useActiveSession.getState();
    for (let i = (session?.cursor ?? 0) - 1; i >= 0; i--) if (steps[i].type === 'work') return s.goTo(i);
  };

  return (
    <main className="flex flex-1 flex-col pt-4">
      <div className="flex items-center gap-2">
        <span className="label">{BLOCK_LABEL[item.block]}</span>
        {item.partnerLabel && <span className="rounded-md bg-yellow/15 px-2 py-0.5 font-display text-sm font-bold uppercase text-yellow">{item.partnerLabel}</span>}
      </div>
      <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-[0.95]">{item.name}</h1>

      <div className="mt-3 flex items-center gap-3">
        <span className="font-display text-xl font-semibold">
          Serie {item.setIndex + 1} di {item.setCount}
        </span>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: item.setCount }, (_, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < item.setIndex ? 'bg-success' : i === item.setIndex ? 'bg-yellow' : 'bg-white/15'}`} />
          ))}
        </div>
      </div>

      {item.wave && (
        <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="Step dell'onda">
          {item.wave.steps.map(({ reps: r, pct }, j) => {
            return (
              <li
                key={j}
                aria-current={j === item.wave!.index ? 'step' : undefined}
                className={`rounded-xl px-2 py-1.5 text-center font-display font-bold ${j === item.wave!.index ? 'bg-yellow text-navy' : j < item.wave!.index ? 'bg-success/20 text-success' : 'bg-white/5 text-steel'}`}
              >
                {r} @ {pct}%
              </li>
            );
          })}
        </ol>
      )}

      <section className="my-auto py-6 text-center" aria-live="polite">
        {hasKg && (
          <>
            <div className="num text-[clamp(72px,26vw,112px)] text-yellow">
              {target?.kind === 'missing' && !edit ? label?.main : isPullup ? `${kg > 0 ? '+' : kg < 0 ? '−' : ''}${formatKg(Math.abs(kg))}` : formatKg(kg)}
              <span className="ml-2 text-3xl text-steel">{target?.kind === 'missing' && !edit ? label?.unit : 'kg'}</span>
            </div>
            {label?.sub && <p className={`mt-1 text-sm ${target?.kind === 'missing' ? 'text-danger' : 'text-steel'}`}>{label.sub}</p>}
            {!target && item.loaded && <p className="mt-1 text-sm text-steel">{lastKg !== undefined ? 'Ultimo carico usato' : 'Imposta il carico che usi'}</p>}
          </>
        )}
        <div className={`num ${hasKg ? 'mt-3 text-5xl' : 'text-[clamp(72px,26vw,112px)] text-yellow'}`}>
          {item.meters ? `${item.meters.min}–${item.meters.max}` : `× ${reps}`}
          <span className="ml-2 text-2xl text-steel">{item.meters ? 'm' : `rip${item.unilateral ? ' per lato' : ''}`}</span>
        </div>
        {!item.meters && item.reps.min !== item.reps.max && <p className="text-sm text-steel">prescritte {repsLabel(item)}</p>}
        {plateRes && plateRes.perSide.length > 0 && (
          <p className="mt-3 font-display text-lg text-ink/80">
            Per lato: {plateRes.perSide.map(formatKg).join(' · ')}
            {plateRes.remainder > 0 && <span className="text-danger"> (+{formatKg(plateRes.remainder)} non componibili)</span>}
          </p>
        )}
        {item.notes && <p className="mt-3 text-sm text-ink/75">{item.notes}</p>}
      </section>

      {edit ? (
        <div className="card mb-3 space-y-3 p-3">
          {hasKg && <Stepper label="Carico" unit="kg" value={kg} step={rounding} min={isPullup ? -100 : 0} max={500} onChange={setKg} format={formatKg} />}
          {!item.meters && <Stepper label="Ripetizioni" value={reps} step={1} min={0} max={50} onChange={setReps} />}
          <div>
            <p className="label mb-1">RPE (facoltativo)</p>
            <div className="grid grid-cols-5 gap-1.5">
              {[6, 7, 8, 9, 10].map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={rpe === v}
                  onClick={() => setRpe(rpe === v ? undefined : v)}
                  className={`focus-ring min-h-tap rounded-xl font-display text-2xl font-bold ${rpe === v ? 'bg-yellow text-navy' : 'bg-white/5'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3 flex gap-2">
          <Button variant="ghost" className="flex-1" icon={<Back size={20} />} onClick={prevWork}>
            Prec.
          </Button>
          <Button variant="ghost" className="flex-[2]" icon={modified ? <Check size={20} /> : <><Minus size={18} /><Plus size={18} /></>} onClick={() => setEdit(true)}>
            {modified || rpe ? 'Modificato' : 'Kg · Rip · RPE'}
          </Button>
        </div>
      )}

      <div className="flex items-end gap-3">
        <MiniAvatarSlot />
        <Button size="cta" variant="success" className="flex-1 !min-h-[76px] text-3xl" icon={<Check size={32} />} onClick={complete}>
          {existing ? 'Aggiorna' : item.wave ? 'Step fatto' : 'Serie fatta'}
        </Button>
      </div>
    </main>
  );
}

function RestView({ step, lastKg }: { step: Extract<Step, { type: 'rest' }>; lastKg?: number }) {
  const s = useActiveSession();
  const endsAt = s.session?.restEndsAt;
  const now = useNow(true, 200);
  const remaining = endsAt ? (endsAt - now) / 1000 : step.seconds.min;
  const companion = step.companion;
  const companionLog = companion ? s.session?.logs[companion.stepId] : undefined;
  const [cKg, setCKg] = useState<number>(companionLog?.actual.kg ?? lastKg ?? 0);
  const [cReps, setCReps] = useState<number>(companionLog?.actual.reps ?? companion?.reps.min ?? 0);

  useEffect(() => {
    if (!endsAt) s.startRest(step.seconds.min);
  }, [endsAt, s, step.seconds.min]);

  // 3-2-1 e fine recupero: si passa da soli allo step successivo, a meno che il lavoro accoppiato non sia ancora da segnare
  const lastSec = useRef(-1);
  const pending = !!companion && !companionLog;
  useEffect(() => {
    if (!endsAt) return;
    const sec = Math.ceil(remaining);
    if (sec !== lastSec.current) {
      if (sec <= 3 && sec >= 1) cue.countdown();
      if (sec <= 0 && lastSec.current > 0) cue.restOver();
      lastSec.current = sec;
    }
    if (remaining <= 0 && !pending) s.next();
  }, [remaining, endsAt, pending, s]);

  const total = s.session?.restTotal ?? step.seconds.min;
  const frac = Math.max(0, Math.min(1, remaining / total));
  const next = useActiveSession((st) => {
    const c = st.session?.cursor ?? 0;
    for (let i = c + 1; i < st.steps.length; i++) {
      const x = st.steps[i];
      if (x.type === 'work') return x.work;
      if (x.type === 'interval') return null;
    }
    return null;
  });
  const nextLoad = next ? loadLabel(next.target) : null;
  const R = 46;
  const C = 2 * Math.PI * R;
  const over = remaining <= 0;

  return (
    <main className="flex flex-1 flex-col pt-4">
      <p className="label">{step.reason === 'wave' ? 'Cambio dischi' : 'Recupero'}</p>

      <div className="relative mx-auto my-4 aspect-square w-full max-w-[300px]">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="6" />
          <circle cx="50" cy="50" r={R} fill="none" stroke={over ? 'var(--success)' : 'var(--thunder-yellow)'} strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} style={{ transition: 'stroke-dashoffset 200ms linear' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" role="timer" aria-label={`Recupero, mancano ${Math.ceil(Math.max(0, remaining))} secondi`}>
          <span className={`num text-[clamp(64px,22vw,96px)] ${over ? 'text-success' : ''}`}>{over ? 'VAI' : formatClock(remaining)}</span>
          <span className="text-sm text-steel">
            consigliato {formatClock(step.seconds.min)}
            {step.seconds.max !== step.seconds.min && `–${formatClock(step.seconds.max)}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="ghost" onClick={() => s.adjustRest(-15)}>
          −15″
        </Button>
        <Button variant="ghost" onClick={() => s.adjustRest(15)}>
          +15″
        </Button>
        <Button variant="secondary" icon={<SkipIcon size={20} />} onClick={() => s.skipRest()}>
          Vai
        </Button>
      </div>

      {companion && (
        <section className={`mt-4 rounded-2xl border p-4 ${companionLog ? 'border-success/50 bg-success/10' : 'border-yellow/50 bg-yellow/10'}`}>
          <p className="label !text-yellow">Durante il recupero</p>
          <h2 className="font-display text-2xl font-bold uppercase">{companion.name}</h2>
          <p className="mb-3 text-ink/80">
            Serie {companion.setIndex + 1} di {companion.setCount} · {repsLabel(companion)}
          </p>
          {!companionLog && (
            <div className="mb-3 space-y-2">
              <Stepper label="Ripetizioni" value={cReps} step={1} min={0} max={50} onChange={setCReps} />
              {companion.loaded && <Stepper label="Palla" unit="kg" value={cKg} step={1} min={0} max={20} onChange={setCKg} format={formatKg} />}
            </div>
          )}
          <Button
            block
            variant={companionLog ? 'ghost' : 'success'}
            icon={<Check />}
            onClick={() => {
              if (companionLog) return s.unlogSet(companion.stepId);
              s.logSet(logFor(companion, { reps: cReps, kg: companion.loaded ? cKg : undefined }));
              cue.setDone();
              useAvatarFx.getState().play('hop');
            }}
          >
            {companionLog ? 'Fatto · annulla' : 'Lanci fatti'}
          </Button>
        </section>
      )}

      <div className="mt-auto flex items-end gap-3 pt-4">
        <MiniAvatarSlot />
        {next && (
          <div className="card flex-1 p-3">
            <p className="label">Prossimo</p>
            <p className="font-display text-xl font-bold uppercase leading-tight">{next.name}</p>
            <p className="text-ink/80">
              {next.wave ? `Step ${next.wave.index + 1} · ` : `Serie ${next.setIndex + 1} · `}
              {nextLoad && nextLoad.unit === 'kg' ? `${nextLoad.main} kg · ` : ''}
              {repsLabel(next)}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function FinishView({ onFinish, done, total }: { onFinish: () => void; done: number; total: number }) {
  useEffect(() => {
    useAvatarFx.getState().play('cheer');
    cue.restOver();
  }, []);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <MiniAvatarSlot large />
      <div>
        <p className="label">Fine seduta</p>
        <h1 className="font-display text-6xl font-extrabold uppercase leading-none text-yellow">Grande lavoro</h1>
        <p className="mt-2 text-lg">
          {done} serie su {total}
        </p>
      </div>
      <Button size="cta" block onClick={onFinish}>
        Salva e vedi il riepilogo
      </Button>
    </main>
  );
}

function StepList({ steps, cursor, logs, onPick }: { steps: Step[]; cursor: number; logs: Record<string, SetLog>; onPick: (i: number) => void }) {
  // un elemento per esercizio: si salta alla prima serie non ancora fatta
  const groups = new Map<string, number[]>();
  steps.forEach((st, i) => {
    const label = st.type === 'work' ? st.work.name : st.type === 'interval' ? 'Conditioning 20/20' : null;
    if (label) groups.set(label, [...(groups.get(label) ?? []), i]);
  });
  const currentWork = steps[cursor]?.type === 'rest' ? cursor - 1 : cursor;
  return (
    <ul className="space-y-1">
      {[...groups].map(([label, idx]) => {
        const done = idx.filter((i) => logs[steps[i].id]).length;
        const current = idx.includes(currentWork);
        const target = idx.find((i) => !logs[steps[i].id]) ?? idx[0];
        return (
          <li key={label}>
            <button
              type="button"
              onClick={() => onPick(target)}
              className={`focus-ring flex min-h-tap w-full items-center gap-3 rounded-xl px-3 text-left ${current ? 'bg-yellow text-navy' : 'bg-white/5'}`}
            >
              <span className="flex-1 font-medium">{label}</span>
              <span className="num text-lg">
                {done}/{idx.length}
              </span>
              {done === idx.length && <Check size={20} className={current ? '' : 'text-success'} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
