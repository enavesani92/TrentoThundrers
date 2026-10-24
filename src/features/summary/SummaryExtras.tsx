import { useEffect, useMemo, useState } from 'react';
import { db } from '@/db/db';
import { BADGES } from '@/data/badges';
import { LIFTS } from '@/data/program';
import { COSMETICS } from '@/data/cosmetics';
import { driveYards, earnedBadges, levelFor, sessionsInWeek, sessionXp, totalXp, unlockedCosmetics } from '@/domain/game';
import { oneRmProposals, prEvents } from '@/domain/progress';
import { formatKg } from '@/domain/loads';
import type { SessionLog } from '@/domain/types';
import { useOneRmHistory, useProfile, useReducedMotion, useSessions } from '@/store/data';
import { useAvatarFx } from '@/store/fx';
import { cue } from '@/lib/feedback';
import { weekKey } from '@/lib/time';
import { Avatar } from '@/avatar/Avatar';
import { BadgeIcon, XpBar, YardField } from '@/ui/game';
import { Button } from '@/ui/Button';

/** XP, drive, badge, level-up e proposte di 1RM nel riepilogo. Feedback breve, nessun popup bloccante. */
export function SummaryExtras({ session }: { session: SessionLog }) {
  const profile = useProfile();
  const sessions = useSessions();
  const history = useOneRmHistory();
  const reduced = useReducedMotion();
  const [accepted, setAccepted] = useState<string[]>([]);

  const data = useMemo(() => {
    if (!profile || !sessions || !history) return null;
    const before = sessions.filter((s) => s.finishedAt < session.finishedAt);
    const upto = sessions.filter((s) => s.finishedAt <= session.finishedAt);
    const xp = sessionXp(session);
    const lvlBefore = levelFor(totalXp(before));
    const lvlAfter = levelFor(totalXp(upto));
    const badgesBefore = new Set(earnedBadges(before, history, profile.timeouts, profile.bodyweight).map((b) => b.id));
    const badgesAfter = earnedBadges(upto, history, profile.timeouts, profile.bodyweight);
    const newBadges = badgesAfter.filter((b) => !badgesBefore.has(b.id));
    const cosBefore = new Set(unlockedCosmetics(lvlBefore.index, [...badgesBefore]));
    const newCosmetics = unlockedCosmetics(lvlAfter.index, badgesAfter.map((b) => b.id)).filter((c) => !cosBefore.has(c));
    const weekCount = sessionsInWeek(upto, weekKey(session.finishedAt));
    const prs = prEvents(upto, history, profile.bodyweight).filter((p) => p.at === session.finishedAt);
    return { xp, lvlBefore, lvlAfter, newBadges, newCosmetics, weekCount, prs, proposals: oneRmProposals(session, profile) };
  }, [profile, sessions, history, session]);

  // conteggio animato degli XP
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!data) return;
    if (reduced) return setShown(data.xp.total);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      setShown(Math.round(data.xp.total * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, reduced]);

  const levelUp = data && data.lvlAfter.index > data.lvlBefore.index;
  const touchdown = data?.weekCount === 3; // questa seduta è la terza della settimana
  useEffect(() => {
    if (!data) return;
    const fx = useAvatarFx.getState();
    if (levelUp) fx.play('thunder');
    else if (data.prs.length) fx.play('flex');
    else fx.play('cheer');
    if (levelUp || touchdown) cue.restOver();
  }, [data, levelUp, touchdown]);

  if (!data || !profile) return null;

  return (
    <div className="mt-4 space-y-4">
      {levelUp && !reduced && <div className="animate-flash pointer-events-none fixed inset-0 z-40 bg-yellow/40" aria-hidden />}

      <div className="relative">
        <Avatar className="h-56 w-full" />
        {(levelUp || touchdown) && (
          <p className="animate-pop absolute inset-x-0 top-2 text-center font-display text-4xl font-extrabold uppercase text-yellow drop-shadow-[0_2px_10px_rgb(0_0_0/0.6)]" role="status">
            {levelUp ? `Level up: ${data.lvlAfter.name}!` : 'Touchdown!'}
          </p>
        )}
      </div>

      <section className="card p-4">
        <div className="flex items-baseline justify-between">
          <span className="label">XP guadagnati</span>
          <span className="num text-5xl text-yellow" aria-label={`${data.xp.total} XP`}>
            +{shown}
          </span>
        </div>
        <ul className="mt-2 space-y-0.5 text-sm text-ink/85">
          <Row label="Serie completate" v={data.xp.sets} />
          <Row label="Attivazione completa" v={data.xp.activation} />
          <Row label="Seduta completa" v={data.xp.complete} />
          <Row label="Conditioning" v={data.xp.conditioning} />
        </ul>
        <div className="mt-3">
          <XpBar progress={data.lvlAfter.progress} label="Avanzamento livello" />
          <p className="mt-1 text-xs text-steel">
            {data.lvlAfter.name}
            {data.lvlAfter.next && ` · ${data.lvlAfter.next.xp - data.lvlAfter.xp} XP a ${data.lvlAfter.next.name}`}
          </p>
        </div>
      </section>

      <YardField yards={driveYards(data.weekCount)} count={data.weekCount} />

      {data.prs.length > 0 && (
        <section className="card border-yellow/40 p-4">
          <p className="label !text-yellow">Nuovo record stimato</p>
          {data.prs.map((p) => (
            <p key={p.lift} className="font-display text-2xl font-bold uppercase">
              {LIFTS.find((l) => l.key === p.lift)?.name}: {formatKg(Math.round(p.value * 2) / 2)} kg
            </p>
          ))}
        </section>
      )}

      {data.proposals.length > 0 && (
        <section className="card p-4">
          <p className="label">Aggiornare il 1RM?</p>
          <p className="mb-3 text-sm text-steel">Le tue serie indicano un massimale più alto. Aggiornalo solo se ne sei convinto e, se puoi, confrontati con lo staff.</p>
          <div className="space-y-2">
            {data.proposals.map((p) => {
              const name = LIFTS.find((l) => l.key === p.lift)?.name;
              const done = accepted.includes(p.lift);
              return (
                <div key={p.lift} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                  <div className="flex-1">
                    <p className="font-semibold">{name}</p>
                    <p className="text-sm text-steel">
                      {formatKg(p.current)} → <strong className="text-yellow">{formatKg(p.proposed)} kg</strong>
                    </p>
                  </div>
                  <Button
                    variant={done ? 'ghost' : 'primary'}
                    disabled={done}
                    onClick={async () => {
                      const date = new Date().toISOString();
                      await db.transaction('rw', db.profile, db.oneRmHistory, async () => {
                        await db.profile.update('me', (prof) => {
                          prof.oneRm[p.lift] = { value: p.proposed, source: 'tested', date };
                        });
                        await db.oneRmHistory.add({ lift: p.lift, value: p.proposed, source: 'session', date });
                      });
                      setAccepted([...accepted, p.lift]);
                    }}
                  >
                    {done ? 'Fatto' : 'Aggiorna'}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(data.newBadges.length > 0 || data.newCosmetics.length > 0) && (
        <section className="card p-4">
          <p className="label mb-2">Sbloccato</p>
          <ul className="grid grid-cols-3 gap-3">
            {data.newBadges.map((b) => {
              const def = BADGES.find((x) => x.id === b.id)!;
              return (
                <li key={b.id} className="animate-pop flex flex-col items-center text-center">
                  <BadgeIcon badge={def} earned size={64} />
                  <span className="mt-1 font-display text-sm font-bold uppercase leading-tight">{def.name}</span>
                </li>
              );
            })}
            {data.newCosmetics.map((c) => (
              <li key={c} className="animate-pop flex flex-col items-center justify-center rounded-xl bg-yellow/10 p-2 text-center">
                <span className="font-display text-sm font-bold uppercase leading-tight text-yellow">{COSMETICS.find((x) => x.id === c)?.name}</span>
                <span className="text-xs text-steel">per l'avatar</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({ label, v }: { label: string; v: number }) {
  if (!v) return null;
  return (
    <li className="flex justify-between">
      <span>{label}</span>
      <span className="num text-base">+{v}</span>
    </li>
  );
}
