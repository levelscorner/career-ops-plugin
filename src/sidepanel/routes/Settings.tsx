import { useState } from 'react';
import { PageTransition } from '../components/ui/PageTransition';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useSettings } from '../hooks/useSettings';
import { MODELS, UI_LANGUAGES } from '../../shared/constants';
import { sendToBackground } from '../../shared/messages';
import type { HealthReport } from '../../background/verify/pipeline';

export function Settings() {
  const { settings, update } = useSettings();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthReport | null>(null);

  if (!settings) {
    return (
      <PageTransition>
        <div className="p-6 text-sm">Loading…</div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="px-5 pt-5 pb-3">
        <h1
          className="font-[var(--font-display)] text-[var(--text-2xl)] font-medium tracking-tight"
          style={{ color: 'var(--color-ink)' }}
        >
          Settings
        </h1>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5">
        <Card className="p-5 space-y-3">
          <h2 className="font-[var(--font-display)] font-medium text-[var(--text-lg)]" style={{ color: 'var(--color-ink)' }}>
            Anthropic API key
          </h2>
          <p className="text-[var(--text-xs)]" style={{ color: 'var(--color-ink-faint)' }}>
            Stored locally in chrome.storage.local. Never syncs. Get one at{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
              console.anthropic.com
            </a>
            .
          </p>
          <input
            type="password"
            value={settings.anthropicApiKey}
            placeholder="sk-ant-…"
            onChange={(e) => void update({ anthropicApiKey: e.target.value })}
            className="w-full h-9 px-3 rounded-[var(--radius-sm)] border text-[var(--text-sm)] font-[var(--font-mono)]"
            style={{
              background: 'var(--color-surface-sunk)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink)',
            }}
          />
          <div className="flex items-center gap-3">
            <Button
              intent="ghost"
              size="sm"
              disabled={testing || !settings.anthropicApiKey}
              onClick={async () => {
                setTesting(true);
                setTestResult(null);
                try {
                  const res = (await sendToBackground({
                    type: 'ui:testApiKey',
                    apiKey: settings.anthropicApiKey,
                  })) as { ok: boolean; error?: string };
                  setTestResult(res.ok ? 'API key works' : `Failed: ${res.error}`);
                } finally {
                  setTesting(false);
                }
              }}
            >
              {testing ? 'Testing…' : 'Test key'}
            </Button>
            {testResult && (
              <span className="text-[var(--text-xs)]" style={{ color: 'var(--color-ink-soft)' }}>
                {testResult}
              </span>
            )}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-[var(--font-display)] font-medium text-[var(--text-lg)]" style={{ color: 'var(--color-ink)' }}>
            Model
          </h2>
          <select
            value={settings.selectedModel}
            onChange={(e) => void update({ selectedModel: e.target.value as typeof settings.selectedModel })}
            className="w-full h-9 px-3 rounded-[var(--radius-sm)] border text-[var(--text-sm)]"
            style={{
              background: 'var(--color-surface-sunk)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink)',
            }}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="text-[var(--text-xs)]" style={{ color: 'var(--color-ink-faint)' }}>
            {MODELS.find((m) => m.id === settings.selectedModel)?.description}
          </p>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-[var(--font-display)] font-medium text-[var(--text-lg)]" style={{ color: 'var(--color-ink)' }}>
            Language & theme
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={settings.language}
              onChange={(e) => void update({ language: e.target.value as typeof settings.language })}
              className="h-9 px-3 rounded-[var(--radius-sm)] border text-[var(--text-sm)]"
              style={{
                background: 'var(--color-surface-sunk)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-ink)',
              }}
            >
              {UI_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
            <select
              value={settings.theme}
              onChange={(e) => void update({ theme: e.target.value as typeof settings.theme })}
              className="h-9 px-3 rounded-[var(--radius-sm)] border text-[var(--text-sm)]"
              style={{
                background: 'var(--color-surface-sunk)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-ink)',
              }}
            >
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-[var(--font-display)] font-medium text-[var(--text-lg)]" style={{ color: 'var(--color-ink)' }}>
            Pipeline health
          </h2>
          <Button
            intent="ghost"
            size="sm"
            onClick={async () => {
              const r = (await sendToBackground({ type: 'ui:healthCheck' })) as HealthReport;
              setHealth(r);
            }}
          >
            Run checks
          </Button>
          {health && (
            <ul className="text-[var(--text-xs)] space-y-1">
              {health.checks.map((c) => (
                <li key={c.id} style={{ color: c.ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {c.ok ? '✓' : '✗'} {c.label} — <span style={{ color: 'var(--color-ink-soft)' }}>{c.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageTransition>
  );
}
