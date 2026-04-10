import type { PropsWithChildren, ReactNode } from 'react';

interface Props {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  children,
}: PropsWithChildren<Props>) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 gap-4 relative"
      style={{ color: 'var(--color-ink-soft)' }}
    >
      {/* animated concentric circles */}
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <style>{`
          @keyframes empty-pulse-1 { 0%, 100% { opacity: 0.06; transform: scale(1); } 50% { opacity: 0.12; transform: scale(1.08); } }
          @keyframes empty-pulse-2 { 0%, 100% { opacity: 0.04; transform: scale(1); } 50% { opacity: 0.08; transform: scale(1.12); } }
          @keyframes empty-pulse-3 { 0%, 100% { opacity: 0.02; transform: scale(1); } 50% { opacity: 0.05; transform: scale(1.15); } }
        `}</style>
        <div
          className="absolute rounded-full"
          style={{
            width: 160,
            height: 160,
            border: '1px solid var(--color-accent)',
            animation: 'empty-pulse-1 4s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 240,
            height: 240,
            border: '1px solid var(--color-accent)',
            animation: 'empty-pulse-2 4s ease-in-out infinite 0.5s',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 320,
            height: 320,
            border: '1px solid var(--color-accent)',
            animation: 'empty-pulse-3 4s ease-in-out infinite 1s',
          }}
        />
      </div>

      {icon && <div className="relative opacity-60">{icon}</div>}
      <h3
        className="relative font-[var(--font-display)] text-[var(--text-xl)] font-medium"
        style={{
          background: 'linear-gradient(135deg, var(--color-accent), var(--color-ink))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {title}
      </h3>
      {description && (
        <p className="relative text-[var(--text-sm)] max-w-sm" style={{ color: 'var(--color-ink-faint)' }}>
          {description}
        </p>
      )}
      {children && <div className="relative w-full flex flex-col items-center">{children}</div>}
    </div>
  );
}
