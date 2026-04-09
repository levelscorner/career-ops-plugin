import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router';
import { AnimatePresence } from 'framer-motion';
import { Shell } from './components/shared/Shell';
import { Onboarding } from './routes/Onboarding';
import { Tracker } from './routes/Tracker';
import { Evaluate } from './routes/Evaluate';
import { Report } from './routes/Report';
import { Cv } from './routes/Cv';
import { Profile } from './routes/Profile';
import { Settings } from './routes/Settings';
import { useSettings } from './hooks/useSettings';
import { useBackgroundEvents } from './hooks/useBackgroundEvents';
import { useUiStore } from './stores/ui';

export default function App() {
  const { settings } = useSettings();
  const theme = useUiStore((s) => s.theme);
  useBackgroundEvents();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (!settings) {
    return (
      <div
        className="h-full flex items-center justify-center text-[var(--text-sm)]"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        Loading…
      </div>
    );
  }

  if (!settings.onboardingComplete) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/*" element={<Onboarding />} />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <Shell>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Navigate to="/tracker" replace />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/evaluate" element={<Evaluate />} />
            <Route path="/report/:id" element={<Report />} />
            <Route path="/cv" element={<Cv />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/tracker" replace />} />
          </Routes>
        </AnimatePresence>
      </Shell>
    </HashRouter>
  );
}
