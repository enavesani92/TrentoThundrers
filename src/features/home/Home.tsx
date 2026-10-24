import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROGRAM } from '@/data/program';
import { hoursSinceLast, MIN_HOURS_BETWEEN, nextDay } from '@/domain/schedule';
import { useProfile, useSessions } from '@/store/data';
import { useActiveSession } from '@/store/activeSession';
import { formatDate } from '@/lib/time';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/layout';
import { Bolt } from '@/ui/icons';
import { HomeHero } from './HomeHero';

export function Home() {
  const navigate = useNavigate();
  const profile = useProfile();
  const sessions = useSessions();
  const active = useActiveSession();
  useEffect(() => {
    void active.load();
  }, [active]);

  if (!profile || !sessions) return <Screen nav>{null}</Screen>;

  const day = nextDay(sessions);
  const last = sessions.at(-1);
  const hours = hoursSinceLast(sessions);
  const tooSoon = hours < MIN_HOURS_BETWEEN;

  return (
    <Screen nav>
      <header className="flex items-center justify-between">
        <img src="brand/logobianco.png" alt="Thunders Trento" className="h-10 w-auto" />
        <div className="text-right">
          <p className="font-display text-xl font-bold uppercase leading-none">
            {profile.name} <span className="text-yellow">#{profile.number}</span>
          </p>
          {profile.position && <p className="text-sm text-steel">{profile.position}</p>}
        </div>
      </header>

      <HomeHero />

      <section className="mt-auto space-y-3 pt-4">
        {active.session ? (
          <Button size="cta" block icon={<Bolt size={28} />} onClick={() => navigate('/player')}>
            Riprendi {PROGRAM[active.session.dayId].title}
          </Button>
        ) : (
          <>
            {tooSoon && (
              <p className="rounded-xl bg-white/5 px-4 py-3 text-sm text-ink/85">
                Sono passate solo {Math.floor(hours)} h dall'ultima seduta: meglio lasciarne almeno {MIN_HOURS_BETWEEN} tra un allenamento e l'altro.
              </p>
            )}
            <Button size="cta" block icon={<Bolt size={28} />} onClick={() => navigate(`/preview/${day}`)}>
              Inizia {PROGRAM[day].title}
            </Button>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((d) => (
                <Button key={d} variant={d === day ? 'secondary' : 'ghost'} onClick={() => navigate(`/preview/${d}`)}>
                  Day {d}
                </Button>
              ))}
            </div>
          </>
        )}
        {last && (
          <p className="text-center text-sm text-steel">
            Ultima seduta: {PROGRAM[last.dayId].title} · {formatDate(last.finishedAt)}
          </p>
        )}
      </section>
    </Screen>
  );
}
