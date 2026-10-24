import { useMemo, useState } from 'react';
import { LIFTS, PROGRAM } from '@/data/program';
import { isComplete, sessionXp } from '@/domain/game';
import { e1rmSeries, prEvents } from '@/domain/progress';
import { volumeKg } from '@/domain/schedule';
import { formatKg } from '@/domain/loads';
import type { LiftKey } from '@/domain/types';
import { useGame } from '@/store/game';
import { formatDate, weekKey } from '@/lib/time';
import { Header, Screen } from '@/ui/layout';
import { Trophy } from '@/ui/icons';

export function History() {
  const game = useGame();
  const [lift, setLift] = useState<LiftKey>('squat');

  const data = useMemo(() => {
    if (!game) return null;
    const { sessions, history, profile } = game;
    const series = e1rmSeries(sessions, lift, profile.bodyweight);
    const manual = history.filter((h) => h.lift === lift).map((h) => ({ t: Date.parse(h.date), value: h.value }));
    const prs = prEvents(sessions, history, profile.bodyweight);
    // volume delle ultime 8 settimane
    const weeks: { key: string; kg: number }[] = [];
    for (let i = 7; i >= 0; i--) weeks.push({ key: weekKey(Date.now() - i * 7 * 86_400_000), kg: 0 });
    for (const s of sessions) {
      const w = weeks.find((x) => x.key === weekKey(s.finishedAt));
      if (w) w.kg += volumeKg(s);
    }
    return { series, manual, prs, weeks };
  }, [game, lift]);

  if (!game || !data) return <Screen nav>{null}</Screen>;
  const current = game.profile.oneRm[lift];

  return (
    <Screen nav>
      <Header title="Progressi" />

      <section className="card p-4">
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Esercizio">
          {LIFTS.map((l) => (
            <button
              key={l.key}
              type="button"
              role="tab"
              aria-selected={lift === l.key}
              onClick={() => setLift(l.key)}
              className={`focus-ring min-h-[44px] shrink-0 rounded-xl px-3 font-display font-semibold uppercase ${lift === l.key ? 'bg-yellow text-navy' : 'bg-white/5'}`}
            >
              {l.name}
            </button>
          ))}
        </div>
        <div className="flex items-baseline justify-between">
          <span className="label">1RM attuale</span>
          <span className="num text-3xl">
            {current ? `${formatKg(current.value)} kg` : '—'}
            {current?.source === 'epley' && <span className="ml-1 text-xs font-normal text-yellow">stima</span>}
          </span>
        </div>
        <LineChart points={data.series} reference={data.manual} />
        <p className="mt-2 text-xs text-steel">Linea gialla: 1RM stimato (Epley) dalla miglior serie di ogni seduta. Punti bianchi: 1RM inseriti o aggiornati.</p>
      </section>

      {data.prs.length > 0 && (
        <section className="card mt-4 p-4">
          <h2 className="mb-2 font-display text-xl font-bold uppercase">Record personali</h2>
          <ul className="space-y-1">
            {data.prs
              .slice(-6)
              .reverse()
              .map((p, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Trophy size={20} className="text-yellow" />
                  <span className="flex-1">{LIFTS.find((l) => l.key === p.lift)?.name}</span>
                  <span className="num text-xl">{formatKg(Math.round(p.value * 2) / 2)} kg</span>
                  <span className="w-16 text-right text-xs text-steel">{formatDate(p.at, { day: 'numeric', month: 'short' })}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="card mt-4 p-4">
        <h2 className="font-display text-xl font-bold uppercase">Volume settimanale</h2>
        <Bars weeks={data.weeks} />
      </section>

      <section className="mt-4">
        <h2 className="mb-2 font-display text-xl font-bold uppercase">Sedute</h2>
        {game.sessions.length === 0 && <p className="text-steel">Ancora nessuna seduta: la prima vale il badge «Primo Snap».</p>}
        <ul className="space-y-2">
          {[...game.sessions].reverse().map((s) => (
            <li key={s.id} className="card flex items-center gap-3 px-4 py-3">
              <span className="num w-12 text-3xl text-yellow">D{s.dayId}</span>
              <div className="flex-1">
                <p className="font-semibold">{formatDate(s.finishedAt)}</p>
                <p className="text-sm text-steel">
                  {PROGRAM[s.dayId].subtitle} · {s.sets.filter((l) => l.block !== 'conditioning').length}/{s.totalWorkSteps} serie
                  {s.conditioning ? ' · cond.' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="num text-xl">+{sessionXp(s).total}</p>
                <p className="text-xs text-steel">{isComplete(s) ? 'completa' : 'parziale'}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Screen>
  );
}

function LineChart({ points, reference }: { points: { t: number; value: number }[]; reference: { t: number; value: number }[] }) {
  const all = [...points, ...reference];
  if (points.length < 1) return <p className="py-10 text-center text-steel">Servono sedute con questo esercizio per vedere il grafico.</p>;
  const W = 320;
  const H = 160;
  const P = 28;
  const tMin = Math.min(...all.map((p) => p.t));
  const tMax = Math.max(...all.map((p) => p.t), tMin + 1);
  const vMin = Math.floor(Math.min(...all.map((p) => p.value)) * 0.95);
  const vMax = Math.ceil(Math.max(...all.map((p) => p.value)) * 1.03);
  const x = (t: number) => P + ((t - tMin) / (tMax - tMin)) * (W - P - 8);
  const y = (v: number) => H - 20 - ((v - vMin) / Math.max(1, vMax - vMin)) * (H - 30);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`1RM stimato: ultimo valore ${Math.round(last.value)} kg`}>
      {[vMin, (vMin + vMax) / 2, vMax].map((v) => (
        <g key={v}>
          <line x1={P} x2={W - 8} y1={y(v)} y2={y(v)} stroke="rgb(245 247 250 / 0.08)" />
          <text x={P - 4} y={y(v) + 4} textAnchor="end" className="fill-steel text-[10px]">
            {Math.round(v)}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--thunder-yellow)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(p.t)} cy={y(p.value)} r="3" fill="var(--thunder-yellow)" />
      ))}
      {reference.map((p, i) => (
        <circle key={`r${i}`} cx={x(p.t)} cy={y(p.value)} r="4" fill="none" stroke="var(--thunder-white)" strokeWidth="2" />
      ))}
      <text x={x(last.t)} y={y(last.value) - 8} textAnchor="end" className="fill-yellow font-display text-[13px] font-bold">
        {Math.round(last.value)} kg
      </text>
    </svg>
  );
}

function Bars({ weeks }: { weeks: { key: string; kg: number }[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.kg));
  return (
    <div className="mt-3 flex h-32 items-end gap-2" role="img" aria-label={`Volume ultime 8 settimane: ${weeks.map((w) => Math.round(w.kg)).join(', ')} kg`}>
      {weeks.map((w, i) => (
        <div key={w.key} className="flex flex-1 flex-col items-center gap-1">
          <div className={`w-full rounded-t-md ${i === weeks.length - 1 ? 'bg-yellow' : 'bg-blue'}`} style={{ height: `${Math.max(2, (w.kg / max) * 100)}px` }} />
          <span className="text-[10px] text-steel">{Number(w.key.slice(8))}/{Number(w.key.slice(5, 7))}</span>
        </div>
      ))}
    </div>
  );
}
