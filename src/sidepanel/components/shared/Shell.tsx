import { NavLink } from 'react-router';
import type { PropsWithChildren } from 'react';

const NAV_ITEMS = [
  { to: '/tracker', label: 'Tracker' },
  { to: '/evaluate', label: 'Evaluate' },
  { to: '/cv', label: 'CV' },
  { to: '/profile', label: 'Profile' },
  { to: '/settings', label: 'Settings' },
] as const;

export function Shell({ children }: PropsWithChildren) {
  return (
    <div className="h-full flex flex-col">
      <header
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-surface-raised)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{
              background: 'var(--color-accent)',
              boxShadow: '0 0 12px var(--color-accent)',
            }}
          />
          <span
            className="font-[var(--font-display)] font-semibold tracking-tight text-[var(--text-lg)]"
            style={{ color: 'var(--color-ink)' }}
          >
            career-ops
          </span>
        </div>
        <nav className="flex items-center gap-1 text-[var(--text-xs)]">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'px-2.5 py-1.5 rounded-[var(--radius-sm)] transition-colors',
                  isActive
                    ? 'bg-[var(--color-surface-sunk)] text-[var(--color-ink)] font-medium'
                    : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
