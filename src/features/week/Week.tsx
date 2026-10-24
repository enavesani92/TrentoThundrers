import { useNavigate } from 'react-router-dom';
import { canUseTimeout, SESSIONS_PER_WEEK, sessionsInWeek } from '@/domain/game';
import { nextDay, tooClosePairs } from '@/domain/schedule';
import { patchProfile } from '@/store/data';
import { useGame } from '@/store/game';
import { addDays, dayOfWeek, formatDate, isoDate, startOfWeek, weekKey, WEEKDAYS } from '@/lib/time';
import { Button } from '@/ui/Button';
import { Header, Screen } from '@/ui/layout';
import { Check, Flame, Timeout } from '@/ui/icons';

export function Week() {
  const navigate = useNavigate();
  const game = useGame();
  if (!game) return <Screen nav>{null}</Screen>;
  const { profile, sessions, streak } = game;

  const monday = startOfWeek(Date.now());
  const today = dayOfWeek(Date.now());
  const thisKey = weekKey(Date.now());
  const done = sessions.filter((s) => weekKey(s.finishedAt) === thisKey);

  // giorni pianificati ancora da fare: ricevono i prossimi Day della rotazione
  let rot = nextDay(sessions);
  const plannedLeft = Math.max(0, SESSIONS_PER_WEEK - done.length);
  const plan = new Map<number, number>();
  for (const d of profile.trainingDays.filter((d) => d >= today && !done.some((s) => dayOfWeek(s.finishedAt) === d)).slice(0, plannedLeft)) {
    plan.set(d, rot);
    rot = (rot % 3) + 1;
  }

  const close = tooClosePairs(profile.trainingDays);
  const frozen = profile.timeouts.includes(thisKey);
  const timeoutOk = canUseTimeout(profile.timeouts, thisKey) && done.length < SESSIONS_PER_WEEK;
  const pastWeeks = Array.from({ length: 6 }, (_, i) => isoDate(addDays(monday, -7 * (i + 1))));

  return (
    <Screen nav>
      <Header kicker={`Settimana del ${formatDate(monday.getTime(), { day: 'numeric', month: 'long' })}`} title="Settimana tipo" />

      <ol className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((name, i) => {
          const ds = done.filter((x) => dayOfWeek(x.finishedAt) === i);
          const planned = plan.get(i);
          const isToday = i === today;
          return (
            <li
              key={name}
              className={`flex min-h-[96px] flex-col items-center justify-between rounded-2xl py-2 ${ds.length ? 'bg-success/20' : planned ? 'bg-yellow/15' : 'bg-white/5'} ${isToday ? 'ring-2 ring-yellow' : ''}`}
              aria-label={`${name}${ds.length ? `: fatto ${ds.map((x) => `Day ${x.dayId}`).join(', ')}` : planned ? `: previsto Day ${planned}` : ': riposo'}`}
            >
              <span className={`text-xs font-semibold uppercase ${isToday ? 'text-yellow' : 'text-steel'}`}>{name}</span>
              <span className="text-sm text-ink/70">{addDays(monday, i).getDate()}</span>
              {ds.length ? (
                <span className="flex flex-col items-center text-success">
                  <Check size={18} />
                  {ds.map((x) => (
                    <span key={x.id} className="font-display text-sm font-bold leading-tight">
                      D{x.dayId}
                    </span>
                  ))}
                </span>
              ) : planned ? (
                <span className="font-display text-lg font-bold text-yellow">D{planned}</span>
              ) : (
                <span className="text-xs text-steel">—</span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-3 space-y-2 text-sm">
        <p className="text-steel">Almeno 48 h tra una seduta e l'altra: i 3 Day lavorano tutti sulle gambe e sulla potenza.</p>
        {close.length > 0 && (
          <p className="rounded-xl bg-yellow/10 px-3 py-2 text-yellow">I giorni {close.map(([a, b]) => `${WEEKDAYS[a]}–${WEEKDAYS[b]}`).join(', ')} sono troppo vicini. Cambiali nelle impostazioni.</p>
        )}
      </div>

      {plan.has(today) && (
        <Button size="cta" block className="mt-4" onClick={() => navigate(`/preview/${plan.get(today)}`)}>
          Oggi: Day {plan.get(today)}
        </Button>
      )}

      <section className="card mt-4 p-4">
        <div className="flex items-center gap-3">
          <Flame className="text-yellow" />
          <div className="flex-1">
            <p className="font-display text-xl font-bold uppercase">Streak: {streak.current} {streak.current === 1 ? 'settimana' : 'settimane'}</p>
            <p className="text-sm text-steel">Record {streak.best}. Conta le settimane con {SESSIONS_PER_WEEK} sedute.</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-white/5 p-3">
          <p className="flex items-center gap-2 font-semibold">
            <Timeout size={20} className="text-yellow" /> Timeout
          </p>
          <p className="mb-3 text-sm text-steel">Infortunio o trasferta? Una volta al mese puoi congelare la settimana: la streak non si interrompe (ma non cresce).</p>
          {frozen ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-yellow">Settimana in timeout</span>
              <Button variant="ghost" onClick={() => void patchProfile({ timeouts: profile.timeouts.filter((t) => t !== thisKey) })}>
                Annulla
              </Button>
            </div>
          ) : (
            <Button variant="secondary" block disabled={!timeoutOk} onClick={() => void patchProfile({ timeouts: [...profile.timeouts, thisKey] })}>
              {timeoutOk ? 'Chiama timeout per questa settimana' : done.length >= SESSIONS_PER_WEEK ? 'Settimana già completa' : 'Timeout del mese già usato'}
            </Button>
          )}
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 font-display text-xl font-bold uppercase">Settimane precedenti</h2>
        <ul className="space-y-1.5">
          {pastWeeks.map((k) => {
            const n = sessionsInWeek(sessions, k);
            const to = profile.timeouts.includes(k);
            return (
              <li key={k} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                <span className="flex-1 text-sm">dal {formatDate(new Date(k + 'T00:00').getTime(), { day: 'numeric', month: 'short' })}</span>
                <span className="flex gap-1" role="img" aria-label={`${n} sedute`}>
                  {Array.from({ length: SESSIONS_PER_WEEK }, (_, i) => (
                    <span key={i} className={`h-3 w-6 rounded-full ${i < n ? 'bg-success' : 'bg-white/15'}`} />
                  ))}
                </span>
                <span className="w-16 text-right text-xs font-semibold uppercase">{n >= SESSIONS_PER_WEEK ? <span className="text-yellow">TD</span> : to ? <span className="text-steel">timeout</span> : ''}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </Screen>
  );
}
