import { type KeyboardEvent, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card } from './Card';

interface ToggleSectionProps {
  label: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  children: React.ReactNode;
}

export function ToggleSection({ label, enabled, onToggle, children }: ToggleSectionProps) {
  const id = useId();

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggle(!enabled);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <span
          id={`${id}-label`}
          className="text-[var(--text-xs)] font-medium uppercase tracking-[0.08em] select-none"
          style={{ color: 'var(--color-ink-faint)' }}
        >
          {label}
        </span>
        <button
          role="switch"
          aria-checked={enabled}
          aria-label={`Toggle ${label}`}
          aria-labelledby={`${id}-label`}
          onClick={() => onToggle(!enabled)}
          onKeyDown={handleKeyDown}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-all duration-[var(--duration-fast)]"
          style={{
            background: enabled
              ? 'linear-gradient(135deg, var(--color-accent), var(--color-accent-strong))'
              : 'var(--color-border)',
            minWidth: 44,
            minHeight: 44,
            padding: '9px 0',
          }}
        >
          <span
            className="inline-block h-5 w-5 rounded-full transition-transform duration-[var(--duration-fast)]"
            style={{
              background: 'var(--color-surface)',
              transform: enabled ? 'translateX(22px)' : 'translateX(2px)',
              boxShadow: enabled
                ? '0 1px 4px oklch(0% 0 0 / 0.3), 0 0 8px oklch(72% 0.18 55 / 0.2)'
                : 'var(--shadow-sm)',
            }}
          />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {enabled && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { type: 'spring', stiffness: 500, damping: 40 },
              opacity: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
            }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
