import type { JobPosting } from '../../shared/types';
import type { Detector } from './types';
import { markdownFromNode, pickLanguage, pickRemote } from './types';

/**
 * Last-resort detector that looks for schema.org JobPosting JSON-LD.
 * This is what most well-behaved job boards ship for Google for Jobs.
 */
export const genericDetector: Detector = {
  id: 'generic',

  matches() {
    return !!findJobPostingLd();
  },

  extract(): JobPosting | null {
    const ld = findJobPostingLd();
    if (!ld) return null;
    const title = String(ld.title ?? '').trim();
    const company = String(
      (ld.hiringOrganization as { name?: string } | undefined)?.name ?? '',
    ).trim();
    if (!title || !company) return null;
    const descriptionHtml = String(ld.description ?? '');
    const tmp = document.createElement('div');
    tmp.innerHTML = descriptionHtml;
    const descriptionMarkdown = markdownFromNode(tmp);
    if (descriptionMarkdown.length < 80) return null;

    const locationObj = Array.isArray(ld.jobLocation)
      ? ld.jobLocation[0]
      : (ld.jobLocation as Record<string, unknown> | undefined);
    const address = (locationObj as { address?: { addressLocality?: string } })?.address;
    const location = address?.addressLocality ?? null;

    return {
      url: window.location.href.split('?')[0] ?? window.location.href,
      source: 'custom',
      company,
      role: title,
      location,
      remote: pickRemote(`${title} ${descriptionMarkdown}`),
      salary: null,
      descriptionMarkdown,
      language: pickLanguage(descriptionMarkdown),
      extractedAt: Date.now(),
    };
  },
};

function findJobPostingLd(): Record<string, unknown> | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  );
  for (const script of scripts) {
    if (!script.textContent) continue;
    try {
      const parsed = JSON.parse(script.textContent) as unknown;
      const found = findJobPostingIn(parsed);
      if (found) return found;
    } catch {
      // ignore malformed JSON
    }
  }
  return null;
}

function findJobPostingIn(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findJobPostingIn(item);
      if (hit) return hit;
    }
    return null;
  }
  const obj = value as Record<string, unknown>;
  const type = obj['@type'];
  if (
    type === 'JobPosting' ||
    (Array.isArray(type) && (type as unknown[]).includes('JobPosting'))
  ) {
    return obj;
  }
  // recurse into @graph
  const graph = obj['@graph'];
  if (graph) return findJobPostingIn(graph);
  return null;
}
