import { useEffect } from 'react';

/** Splash con il logo ufficiale (file originale, non modificato). */
export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1100);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="stadium fixed inset-0 z-50 flex flex-col items-center justify-center gap-6" role="status" aria-label="Caricamento Thunders Training">
      <img src="brand/logobianco.png" alt="Thunders Trento" className="animate-pop h-40 w-auto max-w-[70vw] object-contain" />
      <p className="font-display text-2xl font-bold uppercase tracking-[0.3em] text-yellow">Training</p>
    </div>
  );
}
