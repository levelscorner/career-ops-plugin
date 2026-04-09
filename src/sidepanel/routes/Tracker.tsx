import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router';
import { useApplications } from '../hooks/useApplications';
import { PageTransition } from '../components/ui/PageTransition';
import { EmptyState } from '../components/ui/EmptyState';
import { STATUS_LABELS, scoreBand } from '../../shared/constants';
import { format } from 'date-fns/format';

export function Tracker() {
  const applications = useApplications();

  return (
    <PageTransition>
      <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
        <h1
          className="font-[var(--font-display)] text-[var(--text-2xl)] font-medium tracking-tight"
          style={{ color: 'var(--color-ink)' }}
        >
          Tracker
        </h1>
        <span className="text-[var(--text-xs)]" style={{ color: 'var(--color-ink-faint)' }}>
          {applications.length} {applications.length === 1 ? 'application' : 'applications'}
        </span>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="No evaluations yet"
          description="Open any LinkedIn, Greenhouse, Ashby or Lever posting. The career-ops badge will appear — one click to evaluate."
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-5 space-y-2">
          <AnimatePresence initial={false}>
            {applications.map((app) => {
              const band = scoreBand(app.score);
              const bandColor =
                band === 'strong'
                  ? 'var(--color-success)'
                  : band === 'good'
                    ? 'var(--color-accent-strong)'
                    : band === 'borderline'
                      ? 'var(--color-warning)'
                      : 'var(--color-danger)';
              return (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    to={`/report/${app.id}`}
                    className="block rounded-[var(--radius-md)] border p-4 transition-all hover:-translate-y-[1px] hover:shadow-[var(--shadow-md)]"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: 'var(--color-surface-raised)',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex-shrink-0 rounded-[var(--radius-sm)] w-12 h-12 flex flex-col items-center justify-center font-[var(--font-display)] font-semibold"
                        style={{
                          background: 'var(--color-surface-sunk)',
                          color: bandColor,
                        }}
                      >
                        <span className="text-[var(--text-lg)] leading-none tabular-nums">
                          {app.score.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3
                            className="font-[var(--font-display)] font-medium truncate"
                            style={{ color: 'var(--color-ink)' }}
                          >
                            {app.role}
                          </h3>
                          <span
                            className="text-[var(--text-xs)] uppercase tracking-[0.08em]"
                            style={{ color: 'var(--color-ink-faint)' }}
                          >
                            {STATUS_LABELS[app.status]}
                          </span>
                        </div>
                        <p
                          className="text-[var(--text-sm)] truncate"
                          style={{ color: 'var(--color-ink-soft)' }}
                        >
                          {app.company}
                        </p>
                        <p
                          className="text-[var(--text-xs)] mt-1.5 line-clamp-1"
                          style={{ color: 'var(--color-ink-faint)' }}
                        >
                          {app.notes || format(new Date(app.date), 'PP')}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </PageTransition>
  );
}
