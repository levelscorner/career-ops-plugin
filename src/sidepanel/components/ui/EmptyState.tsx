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
      className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 gap-4"
      style={{ color: 'var(--color-ink-soft)' }}
    >
      {icon && <div className="opacity-60">{icon}</div>}
      <h3
        className="font-[var(--font-display)] text-[var(--text-xl)] font-medium"
        style={{ color: 'var(--color-ink)' }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-[var(--text-sm)] max-w-sm" style={{ color: 'var(--color-ink-faint)' }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
