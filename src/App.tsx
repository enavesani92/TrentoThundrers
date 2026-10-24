import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useProfile, useSettings } from '@/store/data';
import { configureFeedback } from '@/lib/feedback';
import { Splash } from '@/features/splash/Splash';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { Home } from '@/features/home/Home';
import { Preview } from '@/features/preview/Preview';
import { Player } from '@/features/player/Player';
import { Summary } from '@/features/summary/Summary';
import { SettingsScreen } from '@/features/settings/Settings';
import { Week } from '@/features/week/Week';
import { History } from '@/features/history/History';

const PlayerCard = lazy(() => import('@/features/card/PlayerCard').then((m) => ({ default: m.PlayerCard })));

function Gate({ children }: { children: JSX.Element }) {
  const profile = useProfile();
  const loc = useLocation();
  if (profile === undefined) return <div className="stadium h-full" />;
  if (profile === null && loc.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />;
  return children;
}

export function App() {
  const [splash, setSplash] = useState(() => !sessionStorage.getItem('splash-shown'));
  const settings = useSettings();
  useEffect(() => configureFeedback(settings), [settings]);

  if (splash)
    return (
      <Splash
        onDone={() => {
          sessionStorage.setItem('splash-shown', '1');
          setSplash(false);
        }}
      />
    );

  return (
    <HashRouter>
      <Suspense fallback={<div className="stadium h-full" />}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Gate><Home /></Gate>} />
          <Route path="/preview/:day" element={<Gate><Preview /></Gate>} />
          <Route path="/player" element={<Gate><Player /></Gate>} />
          <Route path="/summary/:id" element={<Gate><Summary /></Gate>} />
          <Route path="/week" element={<Gate><Week /></Gate>} />
          <Route path="/card" element={<Gate><PlayerCard /></Gate>} />
          <Route path="/history" element={<Gate><History /></Gate>} />
          <Route path="/settings" element={<Gate><SettingsScreen /></Gate>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
