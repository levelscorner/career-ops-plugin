import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { useEvaluateStore } from '../stores/evaluate';
import { PageTransition } from '../components/ui/PageTransition';
import { EmptyState } from '../components/ui/EmptyState';
import { ScoreDial } from '../components/ui/ScoreDial';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DIMENSION_KEYS, DIMENSION_LABELS } from '../../shared/constants';
import { sendToBackground } from '../../shared/messages';

export function Evaluate() {
  const { status, buffer, result, error, reset } = useEvaluateStore();
  const navigate = useNavigate();
  const [pasted, setPasted] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (status === 'done' && result) {
      // Auto-navigate once the eval completes.
      const t = setTimeout(() => navigate(`/report/${result.application.id}`), 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [status, result, navigate]);

  if (status === 'idle') {
    return (
      <PageTransition>
        <EmptyState
          title="Ready to evaluate"
          description="Open a job posting in another tab and click the career-ops badge — or paste a JD below."
        >
          <Card className="w-full max-w-md p-4 space-y-3 text-left">
            <label className="block text-[var(--text-xs)] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--color-ink-faint)' }}>
              Paste JD (markdown or plain text)
            </label>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Paste the full job description here…"
              className="w-full min-h-[160px] p-3 rounded-[var(--radius-sm)] border text-[var(--text-sm)] resize-y bg-[var(--color-surface-sunk)]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink)' }}
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Source URL (optional)"
              className="w-full h-9 px-3 rounded-[var(--radius-sm)] border text-[var(--text-sm)] bg-[var(--color-surface-sunk)]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink)' }}
            />
            <div className="flex justify-end">
              <Button
                intent="accent"
                disabled={pasted.trim().length < 80}
                onClick={() => {
                  void sendToBackground({
                    type: 'ui:evaluatePastedJd',
                    jd: pasted.trim(),
                    url: url.trim() || null,
                  });
                }}
              >
                Evaluate
              </Button>
            </div>
          </Card>
        </EmptyState>
      </PageTransition>
    );
  }

  if (status === 'error') {
    return (
      <PageTransition>
        <EmptyState title="Evaluation failed" description={error ?? 'Unknown error'}>
          <Button intent="ghost" onClick={reset}>
            Try again
          </Button>
        </EmptyState>
      </PageTransition>
    );
  }

  // streaming or done — show live buffer and dial
  return (
    <PageTransition>
      <div className="px-5 pt-5 pb-3 flex items-center gap-5">
        <ScoreDial
          score={result?.evaluation.globalScore ?? estimateScoreFromBuffer(buffer)}
          size={96}
          streaming={status === 'streaming'}
        />
        <div className="flex-1 min-w-0">
          <h2
            className="font-[var(--font-display)] text-[var(--text-xl)] font-medium tracking-tight"
            style={{ color: 'var(--color-ink)' }}
          >
            {result?.application.role ?? 'Evaluating…'}
          </h2>
          <p className="text-[var(--text-sm)] truncate" style={{ color: 'var(--color-ink-soft)' }}>
            {result?.application.company ?? 'Streaming A–F blocks…'}
          </p>
        </div>
      </div>

      {result && (
        <div className="px-5 pb-3 grid grid-cols-2 gap-2">
          {DIMENSION_KEYS.map((key) => {
            const dim = result.evaluation.dimensions[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-[var(--radius-sm)] border text-[var(--text-xs)]"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="uppercase tracking-[0.08em]"
                    style={{ color: 'var(--color-ink-faint)' }}
                  >
                    {DIMENSION_LABELS[key]}
                  </span>
                  <span className="tabular-nums font-[var(--font-display)] font-semibold" style={{ color: 'var(--color-ink)' }}>
                    {dim?.score?.toFixed(1) ?? '—'}
                  </span>
                </div>
                <p style={{ color: 'var(--color-ink-soft)' }}>{dim?.rationale ?? ''}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
        <pre
          className="whitespace-pre-wrap font-[var(--font-mono)] text-[var(--text-xs)] leading-relaxed p-4 rounded-[var(--radius-md)] border"
          style={{
            background: 'var(--color-surface-sunk)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-ink-soft)',
          }}
        >
          {buffer || '…'}
        </pre>
      </div>
    </PageTransition>
  );
}

function estimateScoreFromBuffer(buffer: string): number {
  // Pull the first "globalScore": X.X that shows up in the streamed JSON,
  // so the dial starts moving as soon as the model commits a number.
  const m = buffer.match(/"globalScore"\s*:\s*(\d(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}
