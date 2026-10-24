import { lazy, Suspense } from 'react';
import type { AvatarLook } from './AvatarModel';
import { useProfile, useReducedMotion } from '@/store/data';
import { Bolt } from '@/ui/icons';

// Three.js è pesante: il modulo 3D si carica a parte, così le schermate si aprono subito.
const AvatarCanvas = lazy(() => import('./AvatarCanvas'));

export function Avatar({ className = '', interactive = false, look }: { className?: string; interactive?: boolean; look?: AvatarLook }) {
  const profile = useProfile();
  const reduced = useReducedMotion();
  const l = look ?? (profile ? { number: profile.number, skin: profile.skin, equipped: profile.equipped } : null);
  const fallback = (
    <div className={`flex items-center justify-center text-yellow/60 ${className}`} aria-hidden>
      <Bolt size={48} />
    </div>
  );
  if (!l) return fallback;
  return (
    <Suspense fallback={fallback}>
      <AvatarCanvas look={l} reduced={reduced} interactive={interactive} className={className} />
    </Suspense>
  );
}
