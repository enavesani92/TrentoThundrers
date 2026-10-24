import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { db } from './db';
import { exportBackup, importBackup, parseBackup } from './backup';
import type { Profile } from '@/domain/types';

const profile: Profile = {
  id: 'me',
  name: 'Luca',
  number: 23,
  oneRm: { squat: { value: 140, source: 'tested', date: '2026-10-01' } },
  trainingDays: [0, 2, 4],
  equipped: [],
  timeouts: [],
  disclaimerAcceptedAt: '2026-10-01',
  createdAt: '2026-10-01',
};

describe('backup', () => {
  it('export → import ripristina i dati', async () => {
    await db.profile.put(profile);
    await db.sessions.add({ dayId: 1, startedAt: 1, finishedAt: 2, activation: { pairs: [], extraSets: 0 }, sets: [], restsSkipped: 0, totalWorkSteps: 35 });
    const json = JSON.stringify(await exportBackup());
    await db.profile.clear();
    await db.sessions.clear();
    await importBackup(parseBackup(json));
    expect((await db.profile.get('me'))?.name).toBe('Luca');
    expect(await db.sessions.count()).toBe(1);
  });

  it('rifiuta file non validi con messaggi chiari', () => {
    expect(() => parseBackup('{')).toThrow('JSON valido');
    expect(() => parseBackup('{"app":"altro"}')).toThrow('non è un backup');
    expect(() => parseBackup(JSON.stringify({ app: 'thunders-training', schema: 99 }))).toThrow('più recente');
    expect(() => parseBackup(JSON.stringify({ app: 'thunders-training', schema: 1, profile, sessions: [{ dayId: 7 }], oneRmHistory: [] }))).toThrow('seduta');
  });
});
