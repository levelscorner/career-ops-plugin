import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getDb } from '../../background/storage/db';
import { saveCustomization } from '../../background/storage/profile';
import { PageTransition } from '../components/ui/PageTransition';
import { EmptyState } from '../components/ui/EmptyState';
import { ScoreDial } from '../components/ui/ScoreDial';
import { Button } from '../components/ui/Button';
import { ToggleSection } from '../components/ui/ToggleSection';
import { useApplication } from '../hooks/useApplications';
import { sendToBackground } from '../../shared/messages';
import { scoreBand, STATUS_LABELS, SCORE_BAND_LABELS } from '../../shared/constants';
import type { OutputToggles } from '../../shared/types';

const DEFAULT_TOGGLES: OutputToggles = {
  gaps: true,
  keywords: true,
  dealBreakers: true,
  rawOutput: false,
  salary: false,
  interviewTips: false,
};

export function Report() {
  const { id } = useParams<{ id: string }>();
  const application = useApplication(id);
  const reports = useLiveQuery(async () => {
    if (!id) return [];
    return getDb().reports.where('applicationId').equals(id).sortBy('version');
  }, [id]);
  const latest = (reports ?? []).at(-1);

  const customization = useLiveQuery(() => getDb().customization.get('singleton'), []);
  const toggles: OutputToggles = {
    ...DEFAULT_TOGGLES,
    ...customization?.outputToggles,
  };

  const handleToggle = useCallback(
    (key: keyof OutputToggles, next: boolean) => {
      void saveCustomization({
        outputToggles: { ...toggles, [key]: next },
      });
    },
    [toggles],
  );

  const [waitedForData, setWaitedForData] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setWaitedForData(true), 3000);
    return () => clearTimeout(t);
  }, [id]);

  useEffect(() => {
    if (application && latest) setWaitedForData(true);
  }, [application, latest]);

  if (!waitedForData && (!application || !latest)) {
    return (
      <PageTransition>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div
              className="inline-block w-8 h-8 border-2 rounded-full animate-spin mb-3"
              style={{
                borderColor: 'var(--color-border)',
                borderTopColor: 'var(--color-accent)',
              }}
            />
            <p
              className="text-[var(--text-sm)]"
              style={{ color: 'var(--color-ink-faint)' }}
            >
              Loading report...
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!application || !latest) {
    return (
      <PageTransition>
        <EmptyState
          title="Report not found"
          description="This application has no report yet, or it was deleted."
        />
      </PageTransition>
    );
  }

  const html = DOMPurify.sanitize(
    marked.parse(latest.markdown, { async: false }) as string,
  );

  const band = scoreBand(application.score);
  const verdictLabel = SCORE_BAND_LABELS[band];
  const verdictColor = {
    strong: { bg: 'var(--color-success-soft)', text: 'var(--color-success)' },
    good: { bg: 'var(--color-accent-soft)', text: 'var(--color-accent)' },
    borderline: { bg: 'var(--color-accent-soft)', text: 'var(--color-warning)' },
    weak: { bg: 'var(--color-danger-soft)', text: 'var(--color-danger)' },
  }[band];

  return (
    <PageTransition>
      {/* score + verdict header */}
      <div className="flex flex-col items-center gap-3 px-5 pt-5 pb-3">
        <ScoreDial score={application.score} size={96} />
        {/* large verdict pill */}
        <span
          className="inline-block px-4 py-1.5 rounded-[var(--radius-full)] text-[var(--text-xs)] font-semibold uppercase tracking-[0.06em]"
          style={{
            background: verdictColor.bg,
            color: verdictColor.text,
          }}
        >
          {verdictLabel}
        </span>
        <div className="text-center min-w-0 w-full">
          <h1
            className="font-[var(--font-display)] text-[var(--text-xl)] font-medium tracking-tight"
            style={{ color: 'var(--color-ink)' }}
          >
            {application.role}
          </h1>
          <p
            className="text-[var(--text-sm)] truncate"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            {application.company}
          </p>
          <p
            className="text-[var(--text-xs)] mt-0.5"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            {STATUS_LABELS[application.status]} {'\u00B7'} {application.date}
          </p>
        </div>
        {/* glass pill action buttons */}
        <div className="flex gap-2 mt-1">
          <Button
            intent="accent"
            size="sm"
            onClick={() => {
              void sendToBackground({ type: 'ui:generatePdf', applicationId: application.id });
            }}
          >
            Generate CV PDF
          </Button>
          <a href={application.url} target="_blank" rel="noreferrer">
            <Button intent="ghost" size="sm">
              Open posting
            </Button>
          </a>
        </div>
      </div>

      {/* markdown report in glass card */}
      <div className="px-5 pb-3">
        <div
          className="rounded-[var(--radius-lg)] border p-5"
          style={{
            backdropFilter: 'blur(var(--blur-md))',
            WebkitBackdropFilter: 'blur(var(--blur-md))',
            background: 'var(--color-glass)',
            borderColor: 'var(--color-glass-border)',
          }}
        >
          <article
            className="prose prose-sm prose-invert max-w-none"
            style={{
              color: 'var(--color-ink)',
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      <div className="px-5 pb-8 space-y-2">
        <ToggleSection
          label="Gaps Analysis"
          enabled={toggles.gaps}
          onToggle={(next) => handleToggle('gaps', next)}
        >
          {latest.evaluation.gaps.length > 0 ? (
            <ul className="space-y-2">
              {latest.evaluation.gaps.map((gap, i) => (
                <li
                  key={i}
                  className="text-[var(--text-xs)] p-2 rounded-[var(--radius-sm)] border"
                  style={{
                    borderColor: 'var(--color-glass-border)',
                    background: 'var(--color-surface-sunk)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-[0.06em] font-semibold"
                      style={{
                        background:
                          gap.severity === 'blocker'
                            ? 'var(--color-danger-soft)'
                            : gap.severity === 'significant'
                              ? 'var(--color-accent-soft)'
                              : 'var(--color-surface-raised)',
                        color:
                          gap.severity === 'blocker'
                            ? 'var(--color-danger)'
                            : gap.severity === 'significant'
                              ? 'var(--color-accent-strong)'
                              : 'var(--color-ink-faint)',
                      }}
                    >
                      {gap.severity}
                    </span>
                    <span style={{ color: 'var(--color-ink)' }}>{gap.requirement}</span>
                  </div>
                  <p style={{ color: 'var(--color-ink-soft)' }}>{gap.mitigation}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--text-xs)]" style={{ color: 'var(--color-ink-faint)' }}>
              No gaps identified.
            </p>
          )}
        </ToggleSection>

        <ToggleSection
          label="ATS Keywords"
          enabled={toggles.keywords}
          onToggle={(next) => handleToggle('keywords', next)}
        >
          {latest.evaluation.keywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {latest.evaluation.keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-block px-2 py-1 rounded-[var(--radius-sm)] text-[var(--text-xs)] font-medium"
                  style={{
                    background: 'var(--color-accent-soft)',
                    color: 'var(--color-accent-strong)',
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-xs)]" style={{ color: 'var(--color-ink-faint)' }}>
              No keywords extracted.
            </p>
          )}
        </ToggleSection>

        {latest.evaluation.dealBreakers.length > 0 && (
          <ToggleSection
            label="Deal Breakers"
            enabled={toggles.dealBreakers}
            onToggle={(next) => handleToggle('dealBreakers', next)}
          >
            <ul className="space-y-1">
              {latest.evaluation.dealBreakers.map((db, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[var(--text-xs)]"
                  style={{ color: 'var(--color-danger)' }}
                >
                  <span className="shrink-0 mt-0.5">&#x2715;</span>
                  <span>{db}</span>
                </li>
              ))}
            </ul>
          </ToggleSection>
        )}
      </div>
    </PageTransition>
  );
}
