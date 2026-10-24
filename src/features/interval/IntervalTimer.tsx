import { useEffect, useRef, useState } from 'react';
import { MACHINES } from '@/data/program';
import { intervalAt, intervalTotal } from '@/domain/interval';
import type { ConditioningLog, Machine } from '@/domain/types';
import { cue, unlockAudio } from '@/lib/feedback';
import { useNow } from '@/lib/useTicker';
import { useWakeLock } from '@/lib/wakeLock';
import { formatClock } from '@/lib/time';
import { Button, IconButton } from '@/ui/Button';
import { Segmented } from '@/ui/layout';
import { Close, Pause, Play } from '@/ui/icons';

interface Props {
  on: number;
  off: number;
  rounds: number;
  machines: Machine[];
  initialMachine?: Machine;
  onDone: (log: ConditioningLog) => void;
  onCancel: (log: ConditioningLog) => void;
}

/** Interval timer a tutto schermo. ON = giallo "SPINGI", OFF = navy "RECUPERA": colore, parola e suono diversi. */
export function IntervalTimer({ on, off, rounds, machines, initialMachine, onDone, onCancel }: Props) {
  const [machine, setMachine] = useState<Machine>(initialMachine ?? machines[0]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedTotal, setPausedTotal] = useState(0);
  const running = startedAt !== null && pausedAt === null;
  const now = useNow(running, 100);
  useWakeLock(startedAt !== null);

  const spec = { on, off, rounds, prep: 5 };
  const elapsed = startedAt === null ? 0 : ((pausedAt ?? now) - startedAt - pausedTotal) / 1000;
  const st = intervalAt(elapsed, spec);

  // segnali sonori: 3-2-1 a fine fase, "via" all'inizio dell'ON, "stop" all'inizio dell'OFF
  const last = useRef({ phase: '', sec: -1 });
  useEffect(() => {
    if (!running) return;
    const sec = Math.ceil(st.remaining);
    if (st.phase !== last.current.phase) {
      if (st.phase === 'on') cue.go();
      if (st.phase === 'off') cue.rest();
      if (st.phase === 'done') cue.restOver();
    } else if (sec !== last.current.sec && sec <= 3 && sec >= 1) {
      cue.countdown();
    }
    last.current = { phase: st.phase, sec };
  }, [running, st.phase, st.remaining]);

  const done = st.phase === 'done';
  useEffect(() => {
    if (done) onDone({ machine, rounds, roundsDone: rounds });
  }, [done]);

  if (startedAt === null) {
    return (
      <div className="flex min-h-full flex-col gap-6">
        <div>
          <p className="label">Conditioning · facoltativo</p>
          <h1 className="font-display text-5xl font-extrabold uppercase leading-none">
            {on}″ ON / {off}″ OFF × {rounds}
          </h1>
          <p className="mt-2 text-steel">Durata {formatClock(intervalTotal(spec))} con 5 s di preparazione.</p>
        </div>
        <div>
          <p className="mb-2 font-medium">Macchina</p>
          <Segmented label="Macchina" value={machine} onChange={setMachine} options={MACHINES.filter((m) => machines.includes(m.key)).map((m) => ({ value: m.key, label: m.name }))} />
        </div>
        <div className="mt-auto space-y-3">
          <Button
            size="cta"
            block
            icon={<Play />}
            onClick={() => {
              unlockAudio();
              setStartedAt(Date.now());
            }}
          >
            Via
          </Button>
          <Button variant="ghost" block onClick={() => onCancel({ machine, rounds, roundsDone: 0 })}>
            Salta il conditioning
          </Button>
        </div>
      </div>
    );
  }

  const isOn = st.phase === 'on';
  const bg = isOn ? 'bg-yellow text-navy' : st.phase === 'prep' ? 'bg-blue text-ink' : 'bg-navy text-ink';
  const word = st.phase === 'prep' ? 'Pronti' : isOn ? 'Spingi' : st.phase === 'off' ? 'Recupera' : 'Finito';
  const phaseLen = st.phase === 'prep' ? 5 : isOn ? on : off;

  return (
    <div className={`fixed inset-0 z-40 flex flex-col px-5 pb-[calc(var(--safe-bottom)+20px)] pt-[calc(var(--safe-top)+12px)] transition-colors duration-300 ${bg}`} role="timer" aria-live="off">
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl font-bold uppercase">
          Round {Math.max(1, st.round)}/{rounds}
        </span>
        <IconButton
          label="Termina"
          className={isOn ? '!bg-navy/10 !text-navy' : ''}
          onClick={() => onCancel({ machine, rounds, roundsDone: st.roundsDone })}
        >
          <Close />
        </IconButton>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="font-display text-5xl font-extrabold uppercase tracking-wider" aria-live="assertive">
          {word}
        </p>
        <p className="num text-[min(48vw,220px)]">{Math.ceil(st.remaining)}</p>
        <div className={`mt-2 h-3 w-full max-w-sm overflow-hidden rounded-full ${isOn ? 'bg-navy/15' : 'bg-white/15'}`}>
          <div className={`h-full ${isOn ? 'bg-navy' : 'bg-yellow'}`} style={{ width: `${(1 - st.remaining / phaseLen) * 100}%` }} />
        </div>
        <div className="mt-6 flex gap-1.5" aria-label={`${st.roundsDone} round completati su ${rounds}`}>
          {Array.from({ length: rounds }, (_, i) => (
            <span key={i} className={`h-2.5 w-5 rounded-full ${i < st.roundsDone ? (isOn ? 'bg-navy' : 'bg-yellow') : isOn ? 'bg-navy/20' : 'bg-white/20'}`} />
          ))}
        </div>
        <p className="mt-4 font-medium opacity-80">{MACHINES.find((m) => m.key === machine)?.name}</p>
      </div>

      <Button
        size="cta"
        variant={isOn ? 'secondary' : 'primary'}
        block
        icon={pausedAt ? <Play /> : <Pause />}
        onClick={() => {
          if (pausedAt) {
            setPausedTotal(pausedTotal + Date.now() - pausedAt);
            setPausedAt(null);
          } else setPausedAt(Date.now());
        }}
      >
        {pausedAt ? 'Riprendi' : 'Pausa'}
      </Button>
    </div>
  );
}
