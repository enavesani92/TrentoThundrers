import type { BadgeDef } from '@/data/badges';
import { STAT_KEYS, STAT_LABEL } from '@/domain/game';
import type { StatKey } from '@/domain/types';
import { Lock } from './icons';

/** Drive settimanale: campo da 0 a 100 yard, la palla avanza a ogni seduta. */
export function YardField({ yards, count, total = 3 }: { yards: number; count: number; total?: number }) {
  const td = yards >= 100;
  return (
    <div className="card overflow-hidden p-3" role="img" aria-label={td ? `Touchdown: ${count} sedute su ${total} questa settimana` : `Drive: ${yards} yard, ${count} sedute su ${total} questa settimana`}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label">Drive settimanale</span>
        <span className={`font-display text-lg font-bold uppercase ${td ? 'text-yellow' : ''}`}>{td ? 'Touchdown!' : `${count}/${total} sedute`}</span>
      </div>
      <div className="relative h-14 overflow-hidden rounded-xl bg-[#1d5a33]">
        {/* end zone */}
        <div className={`absolute inset-y-0 right-0 flex w-[11%] items-center justify-center ${td ? 'bg-yellow' : 'bg-blue'}`}>
          <span className={`rotate-90 font-display text-[10px] font-bold tracking-widest ${td ? 'text-navy' : 'text-ink'}`}>TD</span>
        </div>
        <div className="absolute inset-y-0 left-0 w-[11%] bg-navy/60" />
        {/* linee delle yard */}
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="absolute inset-y-0 w-px bg-white/35" style={{ left: `${11 + (i + 1) * 7.8}%` }}>
            {i % 2 === 1 && <span className="absolute -left-2 bottom-0.5 text-[9px] font-semibold text-white/90">{(i + 1) * 10 > 50 ? 100 - (i + 1) * 10 : (i + 1) * 10}</span>}
          </div>
        ))}
        {/* palla */}
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-1000 ease-out" style={{ left: `${11 + yards * 0.78}%` }}>
          <svg width="30" height="20" viewBox="0 0 30 20" aria-hidden>
            <ellipse cx="15" cy="10" rx="14" ry="9" fill="#8b4a22" stroke="#4a230c" strokeWidth="1.5" />
            <path d="M9 10h12M12 7.5v5M15 7.5v5M18 7.5v5" stroke="#fff" strokeWidth="1.4" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/** Radar a 5 assi per le statistiche dell'avatar. */
export function RadarChart({ stats, size = 260 }: { stats: Record<StatKey, number>; size?: number }) {
  const c = size / 2;
  const r = size / 2 - 42;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / STAT_KEYS.length) * Math.PI * 2;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v] as const;
  };
  const poly = (v: (i: number) => number) => STAT_KEYS.map((_, i) => pt(i, v(i)).join(',')).join(' ');
  return (
    <figure>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[300px]" role="img" aria-label={STAT_KEYS.map((k) => `${STAT_LABEL[k]} ${stats[k]}`).join(', ')}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <polygon key={g} points={poly(() => g)} fill="none" stroke="rgb(245 247 250 / 0.12)" strokeWidth="1" />
        ))}
        {STAT_KEYS.map((_, i) => {
          const [x, y] = pt(i, 1);
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgb(245 247 250 / 0.12)" />;
        })}
        <polygon points={poly((i) => Math.max(0.04, stats[STAT_KEYS[i]] / 100))} fill="rgb(255 194 14 / 0.3)" stroke="var(--thunder-yellow)" strokeWidth="2.5" strokeLinejoin="round" />
        {STAT_KEYS.map((k, i) => {
          const [x, y] = pt(i, 1.28);
          return (
            <g key={k}>
              <text x={x} y={y - 4} textAnchor="middle" className="fill-ink font-display text-[13px] font-bold uppercase">
                {STAT_LABEL[k]}
              </text>
              <text x={x} y={y + 12} textAnchor="middle" className="fill-yellow font-display text-[14px] font-bold">
                {stats[k]}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

const GLYPHS: Record<BadgeDef['glyph'], string> = {
  snap: 'M8 17h8M12 7v10M9 10l3-3 3 3',
  wave: 'M3 14c3 0 3-4 6-4s3 4 6 4 3-4 6-4',
  track: 'M4 18 9 6M10 18l5-12M16 18l4-10',
  flame: 'M12 20c3 0 5-2 5-5 0-3-2-4-3-7-1.5 1.5-2 3-2 4.5-.8-.8-1.5-1.5-1.5-3C8.5 11 7 13 7 15c0 3 2 5 5 5Z',
  iron: 'M5 9v6M19 9v6M8 7v10M16 7v10M8 12h8',
  td: 'M8 4v16M16 4v16M8 9h8',
  drive: 'M4 12h13M13 7l5 5-5 5',
  ten: 'M7 8l2-1v10M14 7a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-5 0v-5A2.5 2.5 0 0 1 14 7Z',
  engine: 'M5 9h10l4 3v4H5zM8 9V6h4v3M8 16v2M15 16v2',
  star: 'm12 5 2 4.5 5 .5-3.8 3.3 1.1 4.9L12 15.8 7.7 18.2l1.1-4.9L5 10l5-.5Z',
};

/** Badge originale: scudo esagonale con glifo. */
export function BadgeIcon({ badge, earned, size = 72 }: { badge: BadgeDef; earned: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden>
      <path d="M36 3 64 18v36L36 69 8 54V18Z" fill={earned ? 'var(--thunder-yellow)' : 'rgb(255 255 255 / 0.06)'} stroke={earned ? '#fff3' : 'rgb(255 255 255 / 0.15)'} strokeWidth="2" />
      <path d="M36 10 57 22v28L36 62 15 50V22Z" fill={earned ? 'var(--thunder-navy)' : 'transparent'} />
      {earned ? (
        <g transform="translate(18 18) scale(1.5)" fill="none" stroke="var(--thunder-yellow)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={GLYPHS[badge.glyph]} />
        </g>
      ) : (
        <g transform="translate(24 24)" className="text-steel">
          <Lock size={24} />
        </g>
      )}
    </svg>
  );
}

export function XpBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={label}>
        <div className="h-full rounded-full bg-gradient-to-r from-yellow/70 to-yellow transition-all duration-700" style={{ width: `${Math.max(2, progress * 100)}%` }} />
      </div>
    </div>
  );
}
