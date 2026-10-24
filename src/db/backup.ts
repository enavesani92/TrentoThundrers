import type { OneRmEntry, Profile, SessionLog, Settings } from '@/domain/types';
import { db, DEFAULT_SETTINGS } from './db';

export const BACKUP_SCHEMA = 1;

export interface Backup {
  app: 'thunders-training';
  schema: number;
  exportedAt: string;
  profile: Profile;
  settings: Settings;
  sessions: SessionLog[];
  oneRmHistory: OneRmEntry[];
}

export async function exportBackup(): Promise<Backup> {
  const profile = await db.profile.get('me');
  if (!profile) throw new Error('Nessun profilo da esportare');
  return {
    app: 'thunders-training',
    schema: BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    profile,
    settings: (await db.settings.get('settings')) ?? DEFAULT_SETTINGS,
    sessions: await db.sessions.toArray(),
    oneRmHistory: await db.oneRmHistory.toArray(),
  };
}

/** Valida un backup letto da file. Lancia un errore leggibile se non è valido. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Il file non è un JSON valido');
  }
  const b = data as Partial<Backup>;
  if (!b || typeof b !== 'object' || b.app !== 'thunders-training') throw new Error('Il file non è un backup di Thunders Training');
  if (typeof b.schema !== 'number' || b.schema > BACKUP_SCHEMA) throw new Error('Backup creato da una versione più recente dell’app');
  const p = b.profile;
  if (!p || p.id !== 'me' || typeof p.name !== 'string' || typeof p.number !== 'number' || typeof p.oneRm !== 'object') throw new Error('Profilo mancante o non valido');
  if (!Array.isArray(b.sessions) || !Array.isArray(b.oneRmHistory)) throw new Error('Storico mancante o non valido');
  for (const s of b.sessions) {
    if (![1, 2, 3].includes(s.dayId) || typeof s.finishedAt !== 'number' || !Array.isArray(s.sets)) throw new Error('Una seduta nel backup non è valida');
  }
  return {
    app: 'thunders-training',
    schema: b.schema,
    exportedAt: b.exportedAt ?? '',
    profile: { ...p, trainingDays: p.trainingDays ?? [0, 2, 4], equipped: p.equipped ?? [], timeouts: p.timeouts ?? [] },
    settings: { ...DEFAULT_SETTINGS, ...(b.settings ?? {}), id: 'settings' },
    sessions: b.sessions,
    oneRmHistory: b.oneRmHistory,
  };
}

/** Sostituisce tutti i dati locali con quelli del backup. */
export async function importBackup(b: Backup) {
  await db.transaction('rw', [db.profile, db.settings, db.sessions, db.oneRmHistory, db.active], async () => {
    await Promise.all([db.profile.clear(), db.settings.clear(), db.sessions.clear(), db.oneRmHistory.clear(), db.active.clear()]);
    await db.profile.put(b.profile);
    await db.settings.put(b.settings);
    await db.sessions.bulkAdd(b.sessions);
    await db.oneRmHistory.bulkAdd(b.oneRmHistory);
  });
}

export async function resetAll() {
  await db.transaction('rw', [db.profile, db.settings, db.sessions, db.oneRmHistory, db.active], async () => {
    await Promise.all([db.profile.clear(), db.settings.clear(), db.sessions.clear(), db.oneRmHistory.clear(), db.active.clear()]);
  });
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
