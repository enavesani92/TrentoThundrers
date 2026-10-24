import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';

/** Campo numerico grande, con virgola italiana accettata. */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  min,
  max,
  ...rest
}: {
  label: ReactNode;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  unit?: string;
  hint?: ReactNode;
  min?: number;
  max?: number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max'>) {
  const id = useId();
  const [text, setText] = useState(value === undefined ? '' : String(value).replace('.', ','));
  // risincronizza solo quando il valore cambia dall'esterno, non mentre si digita
  const emitted = useRef(value);
  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      setText(value === undefined ? '' : String(value).replace('.', ','));
    }
  }, [value]);
  const invalid = text !== '' && (parse(text) === undefined || (min !== undefined && parse(text)! < min) || (max !== undefined && parse(text)! > max));
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
      </label>
      <div className={`flex min-h-tap items-center rounded-2xl border bg-white/5 px-4 focus-within:ring-4 focus-within:ring-yellow/60 ${invalid ? 'border-danger' : 'border-white/15'}`}>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className="num w-full bg-transparent py-3 text-3xl outline-none placeholder:text-white/25"
          value={text}
          aria-invalid={invalid}
          onChange={(e) => {
            setText(e.target.value);
            const v = parse(e.target.value);
            const ok = v !== undefined && (min === undefined || v >= min) && (max === undefined || v <= max);
            emitted.current = ok ? v : undefined;
            onChange(emitted.current);
          }}
          {...rest}
        />
        {unit && <span className="ml-2 font-display text-xl text-steel">{unit}</span>}
      </div>
      {hint && <p className="mt-1 text-sm text-steel">{hint}</p>}
    </div>
  );
}

function parse(t: string): number | undefined {
  const s = t.trim().replace(',', '.');
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function TextField({ label, value, onChange, ...rest }: { label: ReactNode; value: string; onChange: (v: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
      </label>
      <input
        id={id}
        className="min-h-tap w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xl outline-none focus:ring-4 focus:ring-yellow/60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}

export function Chip({ active, onClick, children, className = '' }: { active: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`focus-ring min-h-[48px] rounded-xl px-4 font-display text-lg font-semibold uppercase ${active ? 'bg-yellow text-navy' : 'border border-white/15 bg-white/5 text-ink'} ${className}`}
    >
      {children}
    </button>
  );
}
