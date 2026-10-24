import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cue } from '@/lib/feedback';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';

const styles: Record<Variant, string> = {
  primary: 'bg-yellow text-navy shadow-[0_8px_30px_-8px_rgb(255_194_14/0.6)] active:brightness-95',
  secondary: 'bg-blue text-ink active:brightness-110',
  ghost: 'bg-white/5 text-ink border border-white/15 active:bg-white/10',
  success: 'bg-success text-navy shadow-[0_8px_30px_-8px_rgb(61_220_132/0.55)]',
  danger: 'bg-danger text-navy',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'tap' | 'cta';
  icon?: ReactNode;
  block?: boolean;
}

export function Button({ variant = 'primary', size = 'tap', icon, block, className = '', children, onClick, ...rest }: Props) {
  const sz = size === 'cta' ? 'min-h-cta px-6 text-2xl' : 'min-h-tap px-5 text-lg';
  return (
    <button
      type="button"
      className={`focus-ring inline-flex select-none items-center justify-center gap-2 rounded-2xl font-display font-bold uppercase tracking-wide transition active:scale-[0.98] disabled:opacity-40 ${sz} ${styles[variant]} ${block ? 'w-full' : ''} ${className}`}
      onClick={(e) => {
        cue.tap();
        onClick?.(e);
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({ label, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`focus-ring inline-flex min-h-tap min-w-tap items-center justify-center rounded-2xl bg-white/5 text-ink active:bg-white/10 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
