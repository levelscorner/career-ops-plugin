import { useEffect, useState } from 'react';
import { getSettings, onSettingsChanged, updateSettings } from '../../background/storage/settings';
import type { ExtensionSettings } from '../../shared/types';

export function useSettings(): {
  settings: ExtensionSettings | null;
  update: (patch: Partial<ExtensionSettings>) => Promise<void>;
} {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);

  useEffect(() => {
    let alive = true;
    getSettings().then((s) => {
      if (alive) setSettings(s);
    });
    const unsub = onSettingsChanged((next) => {
      if (alive) setSettings(next);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  return {
    settings,
    update: async (patch) => {
      const next = await updateSettings(patch);
      setSettings(next);
    },
  };
}
