import { useEffect, useState } from 'react';
import { getDb } from '../background/storage/db';
import type { Application } from '../shared/types';

interface PopupStats {
  total: number;
  avg: number;
  latest: Application | null;
}

export default function Popup() {
  const [stats, setStats] = useState<PopupStats>({
    total: 0,
    avg: 0,
    latest: null,
  });

  useEffect(() => {
    void (async () => {
      const all = await getDb().applications.toArray();
      const sum = all.reduce((a, b) => a + b.score, 0);
      const sorted = [...all].sort((a, b) => b.updatedAt - a.updatedAt);
      setStats({
        total: all.length,
        avg: all.length ? sum / all.length : 0,
        latest: sorted[0] ?? null,
      });
    })();
  }, []);

  return (
    <div
      className="w-[320px] p-5 font-[var(--font-sans)]"
      style={{ background: 'var(--color-surface)', color: 'var(--color-ink)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: 'var(--color-accent)' }}
        />
        <span className="font-[var(--font-display)] font-semibold tracking-tight">
          career-ops
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[var(--text-sm)]">
        <Stat label="Applications" value={String(stats.total)} />
        <Stat label="Avg score" value={stats.avg ? stats.avg.toFixed(1) : '—'} />
      </div>
      {stats.latest && (
        <div
          className="mt-3 p-3 rounded-[var(--radius-sm)] text-[var(--text-xs)]"
          style={{ background: 'var(--color-surface-sunk)' }}
        >
          <div style={{ color: 'var(--color-ink-faint)' }}>Most recent</div>
          <div className="truncate font-medium">{stats.latest.role}</div>
          <div className="truncate" style={{ color: 'var(--color-ink-soft)' }}>
            {stats.latest.company}
          </div>
        </div>
      )}
      <button
        onClick={() => chrome.runtime.sendMessage({ type: 'ui:ping' })}
        className="w-full mt-4 h-9 rounded-[var(--radius-sm)] text-[var(--text-xs)] font-medium"
        style={{ background: 'var(--color-ink)', color: 'var(--color-surface)' }}
      >
        Open side panel
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="p-3 rounded-[var(--radius-sm)]"
      style={{ background: 'var(--color-surface-sunk)' }}
    >
      <div
        className="text-[var(--text-xs)] uppercase tracking-[0.08em]"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        {label}
      </div>
      <div className="font-[var(--font-display)] text-[var(--text-xl)] font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}
