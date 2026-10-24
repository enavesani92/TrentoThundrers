import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, DEFAULT_SETTINGS } from '@/db/db';
import type { LoadContext } from '@/domain/loads';
import type { OneRmEntry, Profile, SessionLog, Settings } from '@/domain/types';

// Letture reattive da IndexedDB. `undefined` = ancora in caricamento, `null` = assente.

export function useProfile(): Profile | null | undefined {
  return useLiveQuery(async () => (await db.profile.get('me')) ?? null, []);
}

export function useSettings(): Settings {
  return useLiveQuery(async () => (await db.settings.get('settings')) ?? DEFAULT_SETTINGS, []) ?? DEFAULT_SETTINGS;
}

export function useSessions(): SessionLog[] | undefined {
  return useLiveQuery(() => db.sessions.orderBy('finishedAt').toArray(), []);
}

export function useOneRmHistory(): OneRmEntry[] | undefined {
  return useLiveQuery(() => db.oneRmHistory.orderBy('date').toArray(), []);
}

export async function saveProfile(p: Profile) {
  await db.profile.put(p);
}

export async function patchProfile(patch: Partial<Profile>) {
  await db.profile.update('me', patch);
}

export async function patchSettings(patch: Partial<Settings>) {
  const cur = (await db.settings.get('settings')) ?? DEFAULT_SETTINGS;
  await db.settings.put({ ...cur, ...patch });
}

export function loadContext(p: Profile, s: Settings): LoadContext {
  return { oneRm: p.oneRm, bodyweight: p.bodyweight, rounding: s.rounding };
}

/** true se l'utente (o il sistema) chiede animazioni ridotte. */
export function useReducedMotion(): boolean {
  const settings = useSettings();
  const [system, setSystem] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setSystem(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  if (settings.motion === 'reduce') return true;
  if (settings.motion === 'full') return false;
  return system;
}
