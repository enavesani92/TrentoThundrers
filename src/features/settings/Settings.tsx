import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/db';
import { downloadJson, exportBackup, importBackup, parseBackup, resetAll, type Backup } from '@/db/backup';
import type { LiftKey, OneRm, Rounding } from '@/domain/types';
import { patchProfile, patchSettings, useProfile, useSettings } from '@/store/data';
import { tooClosePairs } from '@/domain/schedule';
import { WEEKDAYS } from '@/lib/time';
import { Button } from '@/ui/Button';
import { Chip, NumberField, TextField } from '@/ui/fields';
import { Header, Screen, Segmented, Sheet, Toggle } from '@/ui/layout';
import { OneRmEditor } from '@/features/onboarding/OneRmEditor';
import { Disclaimer } from '@/features/onboarding/Disclaimer';
import { POSITIONS } from '@/features/onboarding/Onboarding';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-3 p-4">
      <h2 className="font-display text-xl font-bold uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const settings = useSettings();
  const [editRm, setEditRm] = useState<Partial<Record<LiftKey, OneRm>> | null>(null);
  const [pendingImport, setPendingImport] = useState<Backup | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!profile) return <Screen nav>{null}</Screen>;

  const saveRm = async () => {
    if (!editRm) return;
    const now = new Date().toISOString();
    await db.transaction('rw', db.profile, db.oneRmHistory, async () => {
      for (const [lift, rm] of Object.entries(editRm) as [LiftKey, OneRm][]) {
        if (profile.oneRm[lift]?.value !== rm.value) await db.oneRmHistory.add({ lift, value: rm.value, source: rm.source, date: now });
      }
      await db.profile.update('me', { oneRm: editRm });
    });
    setEditRm(null);
    setMessage('1RM aggiornati');
  };

  const close = tooClosePairs(profile.trainingDays);

  return (
    <Screen nav>
      <Header title="Impostazioni" />
      <div className="space-y-4">
        {message && (
          <p className="animate-slide-up rounded-xl bg-success/15 px-4 py-3 text-success" role="status">
            {message}
          </p>
        )}

        <Section title="Massimali (1RM)">
          {editRm ? (
            <>
              <OneRmEditor value={editRm} onChange={setEditRm} />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditRm(null)}>
                  Annulla
                </Button>
                <Button className="flex-1" onClick={() => void saveRm()}>
                  Salva 1RM
                </Button>
              </div>
            </>
          ) : (
            <>
              <OneRmSummary oneRm={profile.oneRm} />
              <Button variant="secondary" block onClick={() => setEditRm({ ...profile.oneRm })}>
                Modifica 1RM
              </Button>
            </>
          )}
        </Section>

        <Section title="Profilo">
          <TextField label="Nome" value={profile.name} onChange={(name) => void patchProfile({ name })} />
          <NumberField label="Numero di maglia" value={profile.number} min={1} max={99} inputMode="numeric" onChange={(n) => n && void patchProfile({ number: n })} />
          <NumberField label="Peso corporeo" unit="kg" value={profile.bodyweight} min={30} max={250} onChange={(bodyweight) => bodyweight && void patchProfile({ bodyweight })} hint="Usato per zavorra e assistenza delle trazioni." />
          <div>
            <p className="mb-2 font-medium">Ruolo</p>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((p) => (
                <Chip key={p} active={profile.position === p} onClick={() => void patchProfile({ position: profile.position === p ? undefined : p })}>
                  {p}
                </Chip>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Giorni di allenamento">
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d, i) => {
              const on = profile.trainingDays.includes(i);
              return (
                <Chip
                  key={d}
                  className="!px-0"
                  active={on}
                  onClick={() => {
                    const days = on ? profile.trainingDays.filter((x) => x !== i) : [...profile.trainingDays, i];
                    if (days.length <= 3) void patchProfile({ trainingDays: days.sort() });
                  }}
                >
                  {d}
                </Chip>
              );
            })}
          </div>
          {profile.trainingDays.length !== 3 && <p className="text-sm text-yellow">Scegli 3 giorni.</p>}
          {close.length > 0 && <p className="text-sm text-yellow">Attenzione: {close.map(([a, b]) => `${WEEKDAYS[a]}–${WEEKDAYS[b]}`).join(', ')} sono a meno di 48 h.</p>}
        </Section>

        <Section title="Carichi">
          <div>
            <p className="mb-2 font-medium">Arrotondamento</p>
            <Segmented<Rounding>
              label="Arrotondamento"
              value={settings.rounding}
              onChange={(rounding) => void patchSettings({ rounding })}
              options={[
                { value: 1.25, label: '1,25 kg' },
                { value: 2.5, label: '2,5 kg' },
                { value: 5, label: '5 kg' },
              ]}
            />
          </div>
          <Toggle checked={settings.showPlates} onChange={(showPlates) => void patchSettings({ showPlates })} label="Mostra i dischi per lato" />
          {settings.showPlates && (
            <div>
              <p className="mb-2 font-medium">Bilanciere</p>
              <Segmented
                label="Peso bilanciere"
                value={settings.barKg}
                onChange={(barKg) => void patchSettings({ barKg })}
                options={[
                  { value: 20, label: '20 kg' },
                  { value: 15, label: '15 kg' },
                  { value: 10, label: '10 kg' },
                ]}
              />
            </div>
          )}
        </Section>

        <Section title="Feedback">
          <Toggle checked={settings.sound} onChange={(sound) => void patchSettings({ sound })} label="Suoni" hint="Beep di fine recupero e del timer" />
          <Toggle checked={settings.vibration} onChange={(vibration) => void patchSettings({ vibration })} label="Vibrazione" />
          <div>
            <p className="mb-2 font-medium">Animazioni</p>
            <Segmented
              label="Animazioni"
              value={settings.motion}
              onChange={(motion) => void patchSettings({ motion })}
              options={[
                { value: 'system', label: 'Sistema' },
                { value: 'reduce', label: 'Ridotte' },
                { value: 'full', label: 'Complete' },
              ]}
            />
          </div>
        </Section>

        <Section title="Dati">
          <p className="text-sm text-steel">Tutti i dati restano su questo telefono. Esporta un backup per spostarli o conservarli.</p>
          <Button
            variant="secondary"
            block
            onClick={async () => {
              const b = await exportBackup();
              downloadJson(b, `thunders-training-${profile.name.toLowerCase()}-${b.exportedAt.slice(0, 10)}.json`);
            }}
          >
            Esporta backup
          </Button>
          <Button variant="ghost" block onClick={() => fileRef.current?.click()}>
            Importa backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                setPendingImport(parseBackup(await f.text()));
              } catch (err) {
                setMessage(null);
                alert((err as Error).message);
              }
            }}
          />
          <Button variant="ghost" block className="!text-danger" onClick={() => setConfirmReset(true)}>
            Cancella tutti i dati
          </Button>
        </Section>

        <Disclaimer />
        <p className="pb-4 text-center text-xs text-steel">
          Logo e nome della squadra sono di proprietà dei Thunders Trento. Avatar, icone e badge sono grafica originale dell'app.
        </p>
      </div>

      <Sheet open={!!pendingImport} onClose={() => setPendingImport(null)} title="Importare il backup?">
        {pendingImport && (
          <div className="space-y-4">
            <p>
              Profilo <strong>{pendingImport.profile.name} #{pendingImport.profile.number}</strong>, {pendingImport.sessions.length} sedute. I dati attuali su questo telefono
              verranno sostituiti.
            </p>
            <Button
              block
              onClick={async () => {
                await importBackup(pendingImport);
                setPendingImport(null);
                setMessage('Backup importato');
              }}
            >
              Importa e sostituisci
            </Button>
            <Button variant="ghost" block onClick={() => setPendingImport(null)}>
              Annulla
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Cancellare tutto?">
        <div className="space-y-4">
          <p>Profilo, 1RM, sedute e progressi verranno eliminati da questo telefono. Non si può annullare: esporta prima un backup se vuoi conservarli.</p>
          <Button
            variant="danger"
            block
            onClick={async () => {
              await resetAll();
              navigate('/onboarding', { replace: true });
            }}
          >
            Cancella tutto
          </Button>
          <Button variant="ghost" block onClick={() => setConfirmReset(false)}>
            Annulla
          </Button>
        </div>
      </Sheet>
    </Screen>
  );
}

function OneRmSummary({ oneRm }: { oneRm: Partial<Record<LiftKey, OneRm>> }) {
  const names: Record<LiftKey, string> = { deadlift: 'Stacco', bench: 'Bench press', squat: 'Squat', pullup: 'Trazioni (totale)', trapbar: 'Trap-bar deadlift', military: 'Military press' };
  return (
    <dl className="grid grid-cols-2 gap-2">
      {(Object.keys(names) as LiftKey[]).map((k) => (
        <div key={k} className="rounded-xl bg-white/5 px-3 py-2">
          <dt className="text-xs uppercase tracking-wider text-steel">{names[k]}</dt>
          <dd className="num text-2xl">
            {oneRm[k] ? `${oneRm[k]!.value.toLocaleString('it-IT')} kg` : <span className="text-danger">—</span>}
            {oneRm[k]?.source === 'epley' && <span className="ml-1 align-middle text-xs font-normal text-yellow">stima</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
