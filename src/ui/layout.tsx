import { useEffect, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Back, Calendar, Chart, Gear, Helmet, Home, Minus, Plus } from './icons';
import { IconButton } from './Button';
import { cue } from '@/lib/feedback';

export function Screen({ children, nav = false, className = '' }: { children: ReactNode; nav?: boolean; className?: string }) {
  return (
    <div className="stadium min-h-full">
      <div
        className={`mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 pt-[calc(var(--safe-top)+12px)] ${nav ? 'pb-[calc(var(--safe-bottom)+96px)]' : 'pb-[calc(var(--safe-bottom)+20px)]'} ${className}`}
      >
        {children}
      </div>
      {nav && <BottomNav />}
    </div>
  );
}

export function Header({ title, back, right, kicker }: { title: ReactNode; back?: string | true; right?: ReactNode; kicker?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="mb-4 flex min-h-tap items-center gap-3">
      {back && (
        <IconButton label="Indietro" onClick={() => (back === true ? navigate(-1) : navigate(back))}>
          <Back />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        {kicker && <div className="label">{kicker}</div>}
        <h1 className="truncate font-display text-3xl font-bold uppercase leading-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}

const NAV = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/week', label: 'Settimana', Icon: Calendar },
  { to: '/card', label: 'Giocatore', Icon: Helmet },
  { to: '/history', label: 'Progressi', Icon: Chart },
  { to: '/settings', label: 'Impostazioni', Icon: Gear },
];

function BottomNav() {
  return (
    <nav aria-label="Navigazione principale" className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-navy-deep/90 pb-[var(--safe-bottom)] backdrop-blur-md">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                `focus-ring flex min-h-[64px] flex-col items-center justify-center gap-1 text-[11px] font-medium ${isActive ? 'text-yellow' : 'text-steel'}`
              }
            >
              <Icon />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max = 999,
  label,
  unit,
  format = (v) => String(v),
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
  format?: (v: number) => string;
}) {
  const set = (v: number) => {
    cue.tap();
    onChange(Math.round(Math.min(max, Math.max(min, v)) * 100) / 100);
  };
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <IconButton label={`${label} meno ${step}`} onClick={() => set(value - step)}>
        <Minus />
      </IconButton>
      <div className="min-w-[88px] flex-1 text-center">
        <div className="num text-3xl" aria-live="polite">
          {format(value)}
          {unit && <span className="ml-1 text-base text-steel">{unit}</span>}
        </div>
        <div className="text-[11px] uppercase tracking-wider text-steel">{label}</div>
      </div>
      <IconButton label={`${label} più ${step}`} onClick={() => set(value + step)}>
        <Plus />
      </IconButton>
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex min-h-tap cursor-pointer items-center gap-4 py-2">
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-steel">{hint}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="relative h-8 w-14 shrink-0 rounded-full bg-white/15 transition peer-checked:bg-yellow peer-focus-visible:ring-4 peer-focus-visible:ring-yellow/60 after:absolute after:left-1 after:top-1 after:h-6 after:w-6 after:rounded-full after:bg-ink after:transition peer-checked:after:translate-x-6 peer-checked:after:bg-navy"
      />
    </label>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-slide-up max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-navy p-5 pb-[calc(var(--safe-bottom)+20px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />
        <h2 className="mb-4 font-display text-2xl font-bold uppercase">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-2xl bg-white/5 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => {
            cue.tap();
            onChange(o.value);
          }}
          className={`focus-ring min-h-[48px] flex-1 rounded-xl px-2 font-display text-lg font-semibold ${o.value === value ? 'bg-yellow text-navy' : 'text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
