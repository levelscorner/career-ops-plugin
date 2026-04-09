import type { JobPosting } from '../../shared/types';
import type { Detector } from './types';
import { markdownFromNode, pickLanguage, pickRemote, text } from './types';

export const ashbyDetector: Detector = {
  id: 'ashby',

  matches(url) {
    return url.hostname === 'jobs.ashbyhq.com';
  },

  extract(): JobPosting | null {
    // Ashby is a React SPA. It exposes JSON-LD that is the most reliable source.
    const ldJson = document.querySelector('script[type="application/ld+json"]');
    if (ldJson?.textContent) {
      try {
        const parsed = JSON.parse(ldJson.textContent) as {
          title?: string;
          hiringOrganization?: { name?: string };
          jobLocation?: { address?: { addressLocality?: string } };
          description?: string;
        };
        if (parsed.title && parsed.hiringOrganization?.name) {
          const desc = parsed.description ?? '';
          const descriptionMarkdown = htmlToMd(desc);
          return {
            url: window.location.href.split('?')[0] ?? window.location.href,
            source: 'ashby',
            company: parsed.hiringOrganization.name,
            role: parsed.title,
            location: parsed.jobLocation?.address?.addressLocality ?? null,
            remote: pickRemote(`${parsed.title} ${descriptionMarkdown}`),
            salary: null,
            descriptionMarkdown,
            language: pickLanguage(descriptionMarkdown),
            extractedAt: Date.now(),
          };
        }
      } catch {
        // fall through to DOM scraping
      }
    }

    const titleEl = document.querySelector('h1, [data-testid="posting-title"]');
    const companyEl = document.querySelector('[data-testid="job-company-name"], header h2');
    const descriptionEl = document.querySelector(
      '[data-testid="job-description"], main article, main .prose',
    );

    const title = text(titleEl);
    const company = text(companyEl);
    if (!title || !company || !descriptionEl) return null;
    const descriptionMarkdown = markdownFromNode(descriptionEl);
    if (descriptionMarkdown.length < 80) return null;
    return {
      url: window.location.href.split('?')[0] ?? window.location.href,
      source: 'ashby',
      company,
      role: title,
      location: null,
      remote: pickRemote(`${title} ${descriptionMarkdown}`),
      salary: null,
      descriptionMarkdown,
      language: pickLanguage(descriptionMarkdown),
      extractedAt: Date.now(),
    };
  },
};

function htmlToMd(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return markdownFromNode(tmp);
}
