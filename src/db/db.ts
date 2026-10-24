import Dexie, { type EntityTable } from 'dexie';
import type { OneRmEntry, Profile, SessionLog, Settings } from '@/domain/types';
import type { ActiveSession } from '@/store/activeSession';
import { DEFAULT_PLATES } from '@/domain/loads';

export const db = new Dexie('thunders-training') as Dexie & {
  profile: EntityTable<Profile, 'id'>;
  settings: EntityTable<Settings, 'id'>;
  sessions: EntityTable<SessionLog, 'id'>;
  oneRmHistory: EntityTable<OneRmEntry, 'id'>;
  active: EntityTable<ActiveSession, 'id'>;
};

db.version(1).stores({
  profile: 'id',
  settings: 'id',
  sessions: '++id, dayId, finishedAt',
  oneRmHistory: '++id, lift, date',
  active: 'id',
});

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  rounding: 2.5,
  barKg: 20,
  plates: DEFAULT_PLATES,
  showPlates: true,
  sound: true,
  vibration: true,
  motion: 'system',
};
