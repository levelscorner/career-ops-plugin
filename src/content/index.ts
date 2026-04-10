// Content script entry. Runs on every matched job host.
// Extracts the current job → mounts the badge → re-extracts on SPA nav.

import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { JobPosting } from '../shared/types';
import { extractCurrentJob } from './extractor';
import { mountBadge } from './badge';
import { sendToBackground } from '../shared/messages';

export function mountContent(ctx: ContentScriptContext): void {
  let currentJob = extractCurrentJob();

  const badge = mountBadge((job) => {
    void sendToBackground({ type: 'content:requestEvaluate', job, source: 'badge' });
    // Also open the side panel. Only works from user gesture → this click.
    try {
      chrome.runtime.sendMessage({ type: 'content:jobDetected', job } satisfies {
        type: 'content:jobDetected';
        job: JobPosting;
      });
    } catch {
      // non-fatal
    }
  }, currentJob);

  // LinkedIn and Ashby are SPAs — re-extract on DOM mutations (debounced).
  const mo = new MutationObserver(debounce(() => {
    const next = extractCurrentJob();
    if (jobChanged(currentJob, next)) {
      currentJob = next;
      badge.update(next);
      if (next) {
        void sendToBackground({ type: 'content:jobDetected', job: next }).catch(
          () => undefined,
        );
      }
    }
  }, 400));
  mo.observe(document.documentElement, { childList: true, subtree: true });

  ctx.onInvalidated(() => {
    mo.disconnect();
    badge.destroy();
  });
}

function jobChanged(a: JobPosting | null, b: JobPosting | null): boolean {
  if (!a && !b) return false;
  if (!a || !b) return true;
  return a.url !== b.url || a.company !== b.company || a.role !== b.role;
}

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: never[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
