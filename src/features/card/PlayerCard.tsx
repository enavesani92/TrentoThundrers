import { BADGES } from '@/data/badges';
import { COSMETICS } from '@/data/cosmetics';
import { LEVELS } from '@/data/levels';
import { SKIN_TONES } from '@/avatar/palette';
import { Avatar } from '@/avatar/Avatar';
import { patchProfile } from '@/store/data';
import { useGame } from '@/store/game';
import { useAvatarFx } from '@/store/fx';
import { formatDate } from '@/lib/time';
import { cue } from '@/lib/feedback';
import { BadgeIcon, RadarChart, XpBar } from '@/ui/game';
import { Header, Screen } from '@/ui/layout';
import { Check, Lock } from '@/ui/icons';

export function PlayerCard() {
  const game = useGame();
  if (!game) return <Screen nav>{null}</Screen>;
  const { profile, level, stats, badges, cosmetics, streak } = game;

  const toggle = (id: string) => {
    cue.tap();
    const on = profile.equipped.includes(id);
    void patchProfile({ equipped: on ? profile.equipped.filter((x) => x !== id) : [...profile.equipped, id] });
    if (!on) useAvatarFx.getState().play('flex');
  };

  return (
    <Screen nav>
      <Header kicker={`#${profile.number}${profile.position ? ` · ${profile.position}` : ''}`} title={profile.name} />

      <div className="card relative overflow-hidden">
        <Avatar interactive className="h-72 w-full" />
        <div className="space-y-2 border-t border-white/10 p-4">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-2xl font-extrabold uppercase text-yellow">{level.name}</span>
            <span className="text-sm text-steel">{game.xp.toLocaleString('it-IT')} XP</span>
          </div>
          <XpBar progress={level.progress} label="Avanzamento livello" />
          <div className="flex justify-between text-sm text-steel">
            <span>Streak {streak.current} sett. · record {streak.best}</span>
            <span>{game.sessions.length} sedute</span>
          </div>
        </div>
      </div>

      <section className="card mt-4 p-4">
        <h2 className="font-display text-xl font-bold uppercase">Statistiche</h2>
        <p className="text-sm text-steel">Quanta parte della scheda hai svolto nelle ultime 8 settimane, blocco per blocco.</p>
        <RadarChart stats={stats} />
      </section>

      <section className="card mt-4 space-y-4 p-4">
        <h2 className="font-display text-xl font-bold uppercase">Personalizza</h2>
        <div>
          <p className="mb-2 font-medium">Carnagione</p>
          <div className="flex gap-3" role="radiogroup" aria-label="Carnagione">
            {SKIN_TONES.map((c, i) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={(profile.skin ?? 1) === i}
                aria-label={`Tono ${i + 1}`}
                onClick={() => void patchProfile({ skin: i })}
                className={`focus-ring rounded-full border-4 ${(profile.skin ?? 1) === i ? 'border-yellow' : 'border-transparent'}`}
                style={{ background: c, height: 56, width: 56 }}
              />
            ))}
          </div>
        </div>
        <ul className="space-y-2">
          {COSMETICS.map((c) => {
            const unlocked = cosmetics.includes(c.id);
            const on = profile.equipped.includes(c.id);
            const req = 'level' in c.unlock ? `Livello ${LEVELS[c.unlock.level].name}` : `Badge «${BADGES.find((b) => b.id === (c.unlock as { badge: string }).badge)?.name}»`;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={!unlocked}
                  aria-pressed={on}
                  onClick={() => toggle(c.id)}
                  className={`focus-ring flex min-h-tap w-full items-center gap-3 rounded-xl px-3 text-left ${on ? 'bg-yellow text-navy' : 'bg-white/5'} disabled:opacity-60`}
                >
                  <span className="flex-1">
                    <span className="block font-semibold">{c.name}</span>
                    {!unlocked && <span className="block text-xs text-steel">Si sblocca con: {req}</span>}
                  </span>
                  {unlocked ? on && <Check /> : <Lock size={20} className="text-steel" />}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="mb-3 font-display text-xl font-bold uppercase">
          Badge <span className="text-steel">{badges.length}/{BADGES.length}</span>
        </h2>
        <ul className="grid grid-cols-3 gap-x-2 gap-y-4">
          {BADGES.map((b) => {
            const e = badges.find((x) => x.id === b.id);
            return (
              <li key={b.id} className="flex flex-col items-center text-center">
                <BadgeIcon badge={b} earned={!!e} size={60} />
                <span className={`mt-1 font-display text-sm font-bold uppercase leading-tight ${e ? '' : 'text-steel'}`}>{b.name}</span>
                <span className="text-[11px] leading-tight text-steel">{e ? formatDate(e.at, { day: 'numeric', month: 'short', year: '2-digit' }) : b.desc}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </Screen>
  );
}
