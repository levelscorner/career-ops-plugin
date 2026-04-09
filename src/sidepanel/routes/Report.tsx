import { useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getDb } from '../../background/storage/db';
import { PageTransition } from '../components/ui/PageTransition';
import { EmptyState } from '../components/ui/EmptyState';
import { ScoreDial } from '../components/ui/ScoreDial';
import { Button } from '../components/ui/Button';
import { useApplication } from '../hooks/useApplications';
import { sendToBackground } from '../../shared/messages';
import { STATUS_LABELS } from '../../shared/constants';

export function Report() {
  const { id } = useParams<{ id: string }>();
  const application = useApplication(id);
  const reports = useLiveQuery(async () => {
    if (!id) return [];
    return getDb().reports.where('applicationId').equals(id).sortBy('version');
  }, [id]);
  const latest = (reports ?? []).at(-1);

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

  return (
    <PageTransition>
      <div className="flex items-start gap-4 px-5 pt-5 pb-3">
        <ScoreDial score={application.score} size={88} />
        <div className="flex-1 min-w-0">
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
            {STATUS_LABELS[application.status]} · {application.date}
          </p>
          <div className="flex gap-2 mt-3">
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
      </div>

      <article
        className="flex-1 min-h-0 overflow-y-auto px-5 pb-8 prose prose-sm max-w-none"
        style={{
          color: 'var(--color-ink)',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </PageTransition>
  );
}
