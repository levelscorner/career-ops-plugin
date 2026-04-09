import { useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { PageTransition } from '../components/ui/PageTransition';
import { Button } from '../components/ui/Button';
import { getCv, saveCv } from '../../background/storage/profile';

export function Cv() {
  const [markdown, setMarkdown] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getCv().then((cv) => {
      setMarkdown(cv.markdown);
      setLoaded(true);
    });
  }, []);

  const html = DOMPurify.sanitize(
    marked.parse(markdown || '_(CV empty — paste your markdown here)_', {
      async: false,
    }) as string,
  );

  return (
    <PageTransition>
      <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
        <h1
          className="font-[var(--font-display)] text-[var(--text-2xl)] font-medium tracking-tight"
          style={{ color: 'var(--color-ink)' }}
        >
          CV
        </h1>
        <Button
          size="sm"
          intent="accent"
          disabled={!loaded || saving}
          onClick={async () => {
            setSaving(true);
            await saveCv(markdown);
            setSaving(false);
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <div className="flex-1 min-h-0 grid grid-rows-2 gap-3 px-4 pb-5">
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          className="w-full h-full p-3 rounded-[var(--radius-md)] border font-[var(--font-mono)] text-[var(--text-xs)] resize-none"
          style={{
            background: 'var(--color-surface-sunk)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-ink)',
          }}
          placeholder="# Your Name&#10;&#10;## Summary&#10;..."
        />
        <article
          className="overflow-y-auto p-4 rounded-[var(--radius-md)] border prose prose-sm max-w-none"
          style={{
            background: 'var(--color-surface-raised)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-ink)',
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </PageTransition>
  );
}
