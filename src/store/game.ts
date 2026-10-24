import { useMemo } from 'react';
import { avatarStats, driveYards, earnedBadges, levelFor, sessionsInWeek, streak, totalXp, unlockedCosmetics } from '@/domain/game';
import { weekKey } from '@/lib/time';
import { useOneRmHistory, useProfile, useSessions } from './data';

/** Stato di gioco derivato interamente dallo storico (nessun dato duplicato da tenere in sync). */
export function useGame() {
  const profile = useProfile();
  const sessions = useSessions();
  const history = useOneRmHistory();
  return useMemo(() => {
    if (!profile || !sessions || !history) return null;
    const xp = totalXp(sessions);
    const level = levelFor(xp);
    const badges = earnedBadges(sessions, history, profile.timeouts, profile.bodyweight);
    const thisWeek = weekKey(Date.now());
    const weekCount = sessionsInWeek(sessions, thisWeek);
    return {
      profile,
      sessions,
      history,
      xp,
      level,
      stats: avatarStats(sessions),
      streak: streak(sessions, profile.timeouts, Date.now()),
      weekCount,
      yards: driveYards(weekCount),
      thisWeek,
      badges,
      cosmetics: unlockedCosmetics(level.index, badges.map((b) => b.id)),
    };
  }, [profile, sessions, history]);
}
